import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { IUserRepository } from '../../../application/auth/IUserRepository';
import { User } from '../../../domain/user/User';
import { Username } from '../../../domain/user/Username';
import { Email } from '../../../domain/common/Email';
import { UserFilter } from '../../../application/user/UserFilter';
import { createPage, Page, PageRequest } from '../../../domain/common/Pagination';
import { UserMap } from '../mappers/UserMap';
import { AllergenEntity, UserEntity, UserRoleAssignmentEntity, UserDietaryRestrictionEntity } from '../entities';
import { ExternalIdpSubject } from '../../../domain/user/ExternalIdpSubject';
import { UserStatus } from '../../../domain/user/UserStatus';
import { CustomerEntity } from '../entities/CustomerEntity';
import { RoleChangeLogEntity } from '../entities/RoleChangeLogEntity';
import { UserRole } from '../../../application/user/UserRoles';

@Injectable()
export class PostgresUserRepository implements IUserRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
	private query() {
		return this.dataSource.getRepository(UserEntity).createQueryBuilder('user')
			.leftJoinAndSelect('user.roleAssignments', 'roles')
			.leftJoinAndSelect('user.dietaryRestrictions', 'restrictions');
	}
	private map(row: UserEntity): User {
		return UserMap.toDomain({ ...row,
			roles: row.roleAssignments.map(role => role.role_name).sort(),
			dietary_restrictions: row.dietaryRestrictions.map(value => ({ allergen_name: value.allergen_name, recorded_at: value.recorded_at.toISOString() })),
		});
	}
	async findByUsername(username: Username): Promise<User | null> {
		const row = await this.query().where('user.username = :username', { username: username.value }).getOne();
		return row ? this.map(row) : null;
	}
	async findByEmail(email: Email): Promise<User | null> {
		const row = await this.query().where('LOWER(user.email) = LOWER(:email)', { email: email.address }).getOne();
		return row ? this.map(row) : null;
	}
	async exists(email: Email): Promise<boolean> {
		return this.dataSource.getRepository(UserEntity).createQueryBuilder('user')
			.where('LOWER(user.email) = LOWER(:email)', { email: email.address }).getExists();
	}
	async countActiveManagers(): Promise<number> {
		return this.dataSource.getRepository(UserEntity).createQueryBuilder('user')
			.innerJoin('user_role_assignments', 'roles', 'roles.username = user.username AND roles.role_name = :role', { role: 'MANAGER' })
			.where('user.status = :status', { status: UserStatus.ACTIVE })
			.getCount();
	}
	async hasCustomer(username: Username): Promise<boolean> {
		return this.dataSource.getRepository(CustomerEntity).exist({ where: { username: username.value } });
	}
	async findFiltered(filter: UserFilter, page: PageRequest): Promise<Page<User>> {
		const query = this.query();
		switch (filter.type) {
			case 'creationDate': query.andWhere('user.created_at >= :from AND user.created_at < :to', { from: filter.from, to: filter.to }); break;
			// Separate filtering join keeps every assigned role in the returned aggregate.
			case 'role': query.innerJoin('user.roleAssignments', 'matchingRole', 'matchingRole.role_name = :role', { role: filter.role.name }); break;
			case 'roleSearch':
				query.innerJoin('user.roleAssignments', 'matchingRole', 'matchingRole.role_name = :role', { role: filter.role.name });
				query.andWhere(`(LOWER(user.email) LIKE LOWER(:search)
					OR LOWER(user.first_name || ' ' || user.last_name) LIKE LOWER(:search))`, { search: `%${filter.search}%` });
				break;
			case 'status': query.andWhere('user.status = :status', { status: filter.status }); break;
		}
		const [rows, total] = await query.orderBy('user.created_at', 'ASC').addOrderBy('user.username', 'ASC')
			.take(page.pageSize).skip(page.offset).getManyAndCount();
		return createPage(rows.map(row => this.map(row)), total, page);
	}

	async findByExternalIdpSubject(subject: ExternalIdpSubject): Promise<User | null> {
		const row = await this.query().where('user.external_idp_subject = :subject', { subject: subject.value }).getOne();
		return row ? this.map(row) : null;
	}

	async insert(user: User): Promise<void> { await this.persist(user, false); }
	async save(user: User): Promise<void> { await this.persist(user, true); }
	async saveWithRoleChangeLog(user: User, entry: {
		actorUsername: string;
		targetUsername: string;
		previousRoles: UserRole[];
		newRoles: UserRole[];
		reason: string | null;
	}): Promise<void> { await this.persist(user, true, entry); }
	private async persist(user: User, update: boolean, roleChangeLog?: {
		actorUsername: string;
		targetUsername: string;
		previousRoles: UserRole[];
		newRoles: UserRole[];
		reason: string | null;
	}): Promise<void> {
		await this.dataSource.transaction(async manager => {
			if (update && typeof manager.query === 'function')
				await manager.query(`SELECT u.username
					FROM users u
					INNER JOIN user_role_assignments r ON r.username = u.username AND r.role_name = 'MANAGER'
					WHERE u.status = 'ACTIVE'
					FOR UPDATE`);
			const row = {
				username: user.username.value, email: user.email.address,
				status: user.status, first_name: user.name.firstName, last_name: user.name.lastName,
				created_at: user.createdAt.value, updated_at: user.updatedAt.value,
				street: user.address?.street ?? null, postal_code: user.address?.postalCode ?? null,
				city: user.address?.city ?? null, extra_details: user.address?.extraDetails ?? null,
				phone_number: user.phoneNumber?.value ?? null,
				password_hash: user.passwordHash?.hashedValue ?? null,
				external_idp_subject: user.externalIdpSubject?.value ?? null,
			};
			const insert = manager.createQueryBuilder().insert().into(UserEntity).values(row);
			if (update) insert.orUpdate(['email', 'first_name', 'last_name', 'password_hash', 'status', 'updated_at', 'street', 'postal_code', 'city', 'extra_details', 'phone_number', 'external_idp_subject'], ['username']);
			await insert.execute();
			await this.persistCollections(manager, user);
			if (update && typeof manager.query === 'function') {
				const [{ count }] = await manager.query(`SELECT COUNT(*)::int AS count
					FROM users u
					INNER JOIN user_role_assignments r ON r.username = u.username AND r.role_name = 'MANAGER'
					WHERE u.status = 'ACTIVE'`);
				if (Number(count) === 0)
					throw Object.assign(new Error('Cannot remove the last active MANAGER.'), { code: 'LAST_ACTIVE_MANAGER' });
			}
			if (roleChangeLog)
				await manager.insert(RoleChangeLogEntity, {
					actor_username: roleChangeLog.actorUsername,
					target_username: roleChangeLog.targetUsername,
					previous_roles: roleChangeLog.previousRoles,
					new_roles: roleChangeLog.newRoles,
					reason: roleChangeLog.reason,
				});
		});
	}
	private async persistCollections(manager: EntityManager, user: User): Promise<void> {
		const username = user.username.value;
		await manager.delete(UserRoleAssignmentEntity, { username });
		const roles = [...user.roles].map(role => ({ username, role_name: role.name }));
		if (roles.length) await manager.insert(UserRoleAssignmentEntity, roles);
		const restrictions = [...user.dietaryRestrictions];
		if (restrictions.length) {
			const names = restrictions.map(value => value.allergenName.value);
			if (await manager.countBy(AllergenEntity, { name: In(names) }) !== new Set(names).size) throw new Error('Allergen not found');
		}
		await manager.delete(UserDietaryRestrictionEntity, { username });
		if (restrictions.length) await manager.insert(UserDietaryRestrictionEntity,
			restrictions.map(value => ({ username, allergen_name: value.allergenName.value, recorded_at: value.recordedAt.value })));
	}

	
}
