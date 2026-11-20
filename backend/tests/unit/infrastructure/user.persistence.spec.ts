import { DataSource, EntityManager } from 'typeorm';
import { UserMap, UserPersistenceRow } from '../../../src/infrastructure/persistence/mappers/UserMap';
import { PostgresUserRepository } from '../../../src/infrastructure/persistence/repositories/PostgresUserRepository';
import { UserEntity, UserRoleAssignmentEntity, UserDietaryRestrictionEntity } from '../../../src/infrastructure/persistence/entities';
import { queryBuilder } from '../../helpers/query-builder';
import { PageRequest } from '../../../src/domain/common/Pagination';
import { RoleName } from '../../../src/domain/user/RoleName';
import { UserRole } from '../../../src/application/user/UserRoles';

const row: UserPersistenceRow = {
	username: 'ana_e', first_name: 'Ana', last_name: 'Silva', email: 'ana@example.com', password_hash: 'hashed-password', status: 'ACTIVE', roles: ['CUSTOMER'], dietary_restrictions: [],
	created_at: new Date('2020-01-01T00:00:00Z'), updated_at: new Date('2021-01-01T00:00:00Z'),
	street: null, postal_code: null, city: null, extra_details: null, phone_number: null, external_idp_subject: null,
};
function setup() {
	const query = queryBuilder();
	const manager = { createQueryBuilder: () => query, delete: jest.fn(), insert: jest.fn(), countBy: jest.fn() };
	const transaction = jest.fn(async (work: (manager: EntityManager) => Promise<void>) => work(manager as unknown as EntityManager));
	const source = { getRepository: () => ({ createQueryBuilder: () => query }), transaction } as unknown as DataSource;
	return { repo: new PostgresUserRepository(source), manager, query, transaction };
}
describe('TypeORM user persistence', () => {
	it('reconstitutes names, original audit timestamps and optional contact value objects', () => {
		const user = UserMap.toDomain({ ...row, street: 'Rua Nova', postal_code: '1000-001', city: 'Lisbon', extra_details: 'Floor 2', phone_number: '+351912345678' });
		expect(user.username.value).toBe(row.username);
		expect(user.name.firstName).toBe('Ana');
		expect(user.createdAt.value).toEqual(row.created_at);
		expect(user.updatedAt.value).toEqual(row.updated_at);
		expect(user.address?.city).toBe('Lisbon');
		expect(user.phoneNumber?.value).toBe('+351912345678');
		expect(UserMap.toDomain(row).address).toBeUndefined();
	});
	it('preserves every assigned role and total count while filtering a page', async () => {
		const { repo, query } = setup();
		query.getManyAndCount.mockResolvedValue([[{ ...row, roleAssignments: [{ role_name: 'CUSTOMER' }, { role_name: 'MANAGER' }], dietaryRestrictions: [] }], 3]);
		const result = await repo.findFiltered({ type: 'role', role: RoleName.create(UserRole.CUSTOMER) }, PageRequest.create(2, 1));
		expect(result).toMatchObject({ total: 3, page: 2, pageSize: 1, totalPages: 3 });
		expect([...result.items[0].roles].map(role => role.name)).toEqual(['CUSTOMER', 'MANAGER']);
	});
	it('retains the total count on an empty page', async () => {
		const { repo, query } = setup(); query.getManyAndCount.mockResolvedValue([[], 2]);
		expect(await repo.findFiltered({ type: 'all' }, PageRequest.create(10, 1))).toMatchObject({ items: [], total: 2, totalPages: 2 });
	});
	it.each(['insert', 'save'] as const)('writes user and owned collections through one transaction during %s', async method => {
		const { repo, manager, query, transaction } = setup();
		await repo[method](UserMap.toDomain(row));
		expect(transaction).toHaveBeenCalledTimes(1);
		expect(query.into).toHaveBeenCalledWith(UserEntity);
		expect(query.values).toHaveBeenCalledWith(expect.objectContaining({ username: row.username, created_at: row.created_at, updated_at: row.updated_at, phone_number: null }));
		expect(manager.insert).toHaveBeenCalledWith(UserRoleAssignmentEntity, [{ username: row.username, role_name: 'CUSTOMER' }]);
		expect(manager.delete).toHaveBeenCalledWith(UserDietaryRestrictionEntity, { username: row.username });
		expect(query.orUpdate).toHaveBeenCalledTimes(method === 'save' ? 1 : 0);
	});
	it('propagates a failed collection write so TypeORM rolls the aggregate back', async () => {
		const { repo, manager } = setup(); manager.insert.mockRejectedValue(new Error('Role constraint failed'));
		await expect(repo.insert(UserMap.toDomain(row))).rejects.toThrow('Role constraint failed');
	});
});
