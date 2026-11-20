import { testStatusAssignments } from '../../helpers/status-assignments';
import { testRolesAssignments } from '../../helpers/roles-assignments';
import { passwordHasher } from '../../helpers/password-hasher';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserService } from '../../../src/application/user/UserService';
import { InMemoryUserRepository } from '../../../src/infrastructure/persistence/repositories/InMemoryUserRepository';
import { UserMap } from '../../../src/infrastructure/persistence/mappers/UserMap';
import { UserRole } from '../../../src/application/user/UserRoles';
import { UserStatus } from '../../../src/domain/user/UserStatus';

describe('Paginated user filters', () => {
	let repo: InMemoryUserRepository;
	let service: UserService;
	const id = (n: number) => `user_${String(n).padStart(3, '0')}`;

	beforeEach(async () => {
		repo = new InMemoryUserRepository();
		service = new UserService(repo, passwordHasher, testRolesAssignments, testStatusAssignments);
		const fixtures = [
			{ n: 1, createdAt: '2026-10-20T23:59:59.999Z', roles: ['CUSTOMER'], status: 'ACTIVE' },
			{ n: 3, createdAt: '2026-10-21T00:00:00.000Z', roles: ['MANAGER', 'CUSTOMER'], status: 'ACTIVE' },
			{ n: 2, createdAt: '2026-10-21T00:00:00.000Z', roles: ['CUSTOMER'], status: 'DEACTIVATED' },
			{ n: 4, createdAt: '2026-10-21T23:59:59.999Z', roles: ['EMPLOYEE'], status: 'PENDING_REGISTRATION' },
			{ n: 5, createdAt: '2026-10-22T00:00:00.000Z', roles: ['MANAGER'], status: 'ACTIVE' },
		];
		for (const f of fixtures) {
			await repo.save(UserMap.toDomain({
				street: null, postal_code: null, city: null, extra_details: null, phone_number: null,
				username: id(f.n), dietary_restrictions: [], first_name: 'Test', last_name: 'User', email: `${f.n}@example.com`,
				password_hash: 'private-hash', external_idp_subject: null, roles: f.roles, status: f.status,
				created_at: new Date(f.createdAt), updated_at: new Date(f.createdAt),
			}));
		}
	});

	it('lists all roles and statuses in stable pages with public fields', async () => {
		const first = await service.getAllUsers(1, 3);
		const second = await service.getAllUsers(2, 3);
		expect(first.items.map(u => u.username)).toEqual([id(1), id(2), id(3)]);
		expect(second.items.map(u => u.username)).toEqual([id(4), id(5)]);
		expect(second).toMatchObject({ total: 5, page: 2, pageSize: 3, totalPages: 2 });
		for (const user of [...first.items, ...second.items]) {
			expect(Object.keys(user).sort()).toEqual(['username', 'firstName', 'lastName', 'createdAt', 'email', 'roles', 'status'].sort());
		}
	});

	it('returns defaults, empty pages, and an empty repository when listing all users', async () => {
		expect(await service.getAllUsers()).toMatchObject({ total: 5, page: 1, pageSize: 20, totalPages: 1 });
		expect(await service.getAllUsers(4, 2)).toEqual({ items: [], total: 5, page: 4, pageSize: 2, totalPages: 3 });
		const empty = new UserService(new InMemoryUserRepository(), passwordHasher, testRolesAssignments, testStatusAssignments);
		expect(await empty.getAllUsers()).toEqual({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
	});

	it('matches the UTC calendar day with inclusive start and exclusive end', async () => {
		const result = await service.getFilterByCreationDate('2026-10-21');
		expect(result.items.map(u => u.username)).toEqual([id(2), id(3), id(4)]);
		expect(result).toMatchObject({ total: 3, page: 1, pageSize: 20, totalPages: 1 });
	});

	it('paginates by role with stable tie ordering and no duplicates for multiple roles', async () => {
		const first = await service.getFilterByRole(UserRole.CUSTOMER, 1, 2);
		const second = await service.getFilterByRole(UserRole.CUSTOMER, 2, 2);
		expect(first.items.map(u => u.username)).toEqual([id(1), id(2)]);
		expect(second.items.map(u => u.username)).toEqual([id(3)]);
		expect(second.items[0].roles).toEqual(['MANAGER', 'CUSTOMER']);
		expect(second).toMatchObject({ total: 3, page: 2, pageSize: 2, totalPages: 2 });
	});

	it('searches the Manager customer directory by name/email and keeps dietary restrictions detail-only', async () => {
		await service.relateUserAllergens(id(1), ['Gluten']);
		const byEmail = await service.getCustomerDirectory('1@EXAMPLE.COM');
		expect(byEmail.items.map(customer => customer.username)).toEqual([id(1)]);
		expect(byEmail.items[0]).not.toHaveProperty('dietaryRestrictions');
		const byName = await service.getCustomerDirectory('test user');
		expect(byName.total).toBe(3);
		await expect(service.getCustomerDetails(id(1))).resolves.toMatchObject({ dietaryRestrictions: ['Gluten'] });
		await expect(service.getCustomerDetails(id(5))).rejects.toBeInstanceOf(ForbiddenException);
	});

	it.each(Object.values(UserStatus))('filters users by status %s', async status => {
		const result = await service.getFilterByStatus(status);
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every(u => u.status === status)).toBe(true);
		expect(result.total).toBe(status === UserStatus.ACTIVE ? 3 : 1);
	});

	it('returns empty items with accurate totals for a page beyond the matches', async () => {
		expect(await service.getFilterByRole(UserRole.MANAGER, 3, 1)).toEqual({
			items: [], total: 2, page: 3, pageSize: 1, totalPages: 2,
		});
	});

	it('returns an empty page for no matches', async () => {
		expect(await service.getFilterByCreationDate('2020-01-01')).toEqual({
			items: [], total: 0, page: 1, pageSize: 20, totalPages: 0,
		});
	});

	it('maps every result to public fields without credentials or updatedAt', async () => {
		const result = await service.getFilterByStatus(UserStatus.ACTIVE);
		for (const user of result.items) {
			expect(Object.keys(user).sort()).toEqual(['username', 'firstName', 'lastName', 'createdAt', 'email', 'roles', 'status'].sort());
		}
		expect(JSON.stringify(result)).not.toContain('private-hash');
	});

	it.each(['2026-02-30', '2025-02-29', 'not-a-date', '2026-1-01', '2026-10-21T12:00:00Z'])(
		'rejects invalid creation date %s before querying', async date => {
			const query = jest.spyOn(repo, 'findFiltered');
			await expect(service.getFilterByCreationDate(date)).rejects.toBeInstanceOf(BadRequestException);
			expect(query).not.toHaveBeenCalled();
		},
	);

	it('accepts a leap day', async () => {
		await expect(service.getFilterByCreationDate('2024-02-29')).resolves.toHaveProperty('total', 0);
	});

	it('rejects unsupported roles and statuses', async () => {
		await expect(service.getFilterByRole('ADMIN' as UserRole)).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.getFilterByStatus('UNKNOWN' as UserStatus)).rejects.toBeInstanceOf(BadRequestException);
	});

	it.each([[0, 20], [-1, 20], [1.5, 20], [NaN, 20], [1, 0], [1, 101], [1, 1.5], [Number.MAX_SAFE_INTEGER, 100]])(
		'rejects invalid pagination page=%s pageSize=%s', async (page, size) => {
			const query = jest.spyOn(repo, 'findFiltered');
			await expect(service.getAllUsers(page, size)).rejects.toBeInstanceOf(BadRequestException);
			await expect(service.getFilterByRole(UserRole.CUSTOMER, page, size)).rejects.toBeInstanceOf(BadRequestException);
			expect(query).not.toHaveBeenCalled();
		},
	);
});
