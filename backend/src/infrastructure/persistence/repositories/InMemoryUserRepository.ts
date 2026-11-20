import { ConflictException } from '@nestjs/common';
import { IUserRepository } from '../../../application/auth/IUserRepository';
import { User } from '../../../domain/user/User';
import { Username } from '../../../domain/user/Username';
import { Email } from '../../../domain/common/Email';
import { UserFilter } from '../../../application/user/UserFilter';
import { createPage, Page, PageRequest } from '../../../domain/common/Pagination';
import { ExternalIdpSubject } from '../../../domain/user/ExternalIdpSubject';
import { UserStatus } from '../../../domain/user/UserStatus';
import { UserRole } from '../../../application/user/UserRoles';

export class InMemoryUserRepository implements IUserRepository {
	private readonly users = new Map<string, User>();
	
	private copy(user: User): User { 
		return User.reconstitute({ 
			username: user.username, 
			name: user.name, 
			email: user.email, 
			passwordHash: user.passwordHash, 
			externalIdpSubject: user.externalIdpSubject,
			status: user.status, 
			roles: user.roles, 
			dietaryRestrictions: user.dietaryRestrictions, 
			createdAt: user.createdAt, 
			updatedAt: user.updatedAt, 
			address: user.address, 
			phoneNumber: user.phoneNumber 
		}); 
	}
	
	async findFiltered(filter: UserFilter, page: PageRequest): Promise<Page<User>> {
		const matches = [...this.users.values()].filter(user => {
			switch (filter.type) {
				case 'all': return true;
				case 'creationDate': return user.createdAt.value >= filter.from && user.createdAt.value < filter.to;
				case 'role': return user.hasRole(filter.role);
				case 'roleSearch': return user.hasRole(filter.role) &&
					`${user.email.address} ${user.name.firstName} ${user.name.lastName}`.toLowerCase().includes(filter.search.toLowerCase());
				case 'status': return user.status === filter.status;
			}
		}).sort((a, b) => a.createdAt.value.getTime() - b.createdAt.value.getTime() || a.username.value.localeCompare(b.username.value));
		return createPage(matches.slice(page.offset, page.offset + page.pageSize).map(user => this.copy(user)), matches.length, page);
	}
	
	async findByUsername(username: Username): Promise<User | null> {
		const user = this.users.get(username.value);
		return user ? this.copy(user) : null;
	}
	
	async findByEmail(email: Email): Promise<User | null> {
		const user = [...this.users.values()].find(user => user.email.equals(email));
		return user ? this.copy(user) : null;
	}

	async findByExternalIdpSubject(subject: ExternalIdpSubject): Promise<User | null> {
		const user = [...this.users.values()].find(user => user.externalIdpSubject?.equals(subject));
		return user ? this.copy(user) : null;
	}
	
	async insert(user: User): Promise<void> {
		if (this.users.has(user.username.value)) throw Object.assign(new ConflictException('Username already exists'), { code: '23505', constraint: 'users_username_key' });
		if (await this.exists(user.email)) throw new ConflictException('User with this email already exists');
		this.users.set(user.username.value, this.copy(user));
	}
	
	async save(user: User): Promise<void> { this.users.set(user.username.value, this.copy(user)); }
	
	async exists(email: Email): Promise<boolean> { return (await this.findByEmail(email)) !== null; }
	async countActiveManagers(): Promise<number> {
		return [...this.users.values()].filter(user => user.status === UserStatus.ACTIVE && [...user.roles].some(role => role.name === UserRole.MANAGER)).length;
	}
}
