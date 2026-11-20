import { testStatusAssignments } from '../helpers/status-assignments';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTestDatabase, postgres } from '../helpers/postgres';
import { userFixture } from '../helpers/domain';
import { passwordHasher } from '../helpers/password-hasher';
import { UserRole } from '../../src/application/user/UserRoles';
import { UserService } from '../../src/application/user/UserService';
import { RolesAssignmentService } from '../../src/application/user/RolesAssignmentService';
import { PostgresRolesAssignmentRepository } from '../../src/infrastructure/persistence/repositories/PostgresRolesAssignmentRepository';
import { PostgresUserRepository } from '../../src/infrastructure/persistence/repositories/PostgresUserRepository';
import { RolesAssignmentEntity, UserRoleEntity } from '../../src/infrastructure/persistence/entities';
import { RolesAssignment1794009600000 } from '../../src/infrastructure/persistence/orm-migrations/1794009600000-RolesAssignment';
import { Username } from '../../src/domain/user/Username';
import { Email } from '../../src/domain/common/Email';
import { RoleName } from '../../src/domain/user/RoleName';

postgres('Role assignment history PostgreSQL persistence', () => {
	let database: Awaited<ReturnType<typeof createTestDatabase>>;
	let repository: PostgresRolesAssignmentRepository;
	let users: PostgresUserRepository;
	let service: UserService;
	beforeAll(async () => {
		database = await createTestDatabase(false);
		repository = new PostgresRolesAssignmentRepository(database.dataSource);
		users = new PostgresUserRepository(database.dataSource);
		service = new UserService(users, passwordHasher, new RolesAssignmentService(repository), testStatusAssignments);
		await database.dataSource.getRepository(UserRoleEntity).save(Object.values(UserRole).map(name => ({ name })));
		await users.insert(userFixture({ username: Username.create('assigner'), email: Email.create('assigner@example.test').getValue(), roles: new Set([RoleName.create('ADMINISTRATOR')]) }));
		await users.insert(userFixture({ username: Username.create('recipient'), email: Email.create('recipient@example.test').getValue() }));
	});
	afterAll(async () => { await database?.close(); });
	beforeEach(async () => { await database.dataSource.query('TRUNCATE roles_assignment RESTART IDENTITY'); });

	it('matches the migrated schema to ORM metadata', async () => {
		const diff = await database.dataSource.driver.createSchemaBuilder().log();
		expect(diff.upQueries.map(query => query.query)).toEqual([]);
	});

	it('records each resulting role after successful saves and permits repeated assignments from the same actor', async () => {
		await service.setRoles('recipient', { roles: [UserRole.CUSTOMER, UserRole.MANAGER, UserRole.MANAGER] }, 'assigner');
		await service.setRoles('recipient', { roles: [UserRole.EMPLOYEE] }, 'assigner');
		const records = await database.dataSource.getRepository(RolesAssignmentEntity).find({ order: { id: 'ASC' } });
		expect(records).toHaveLength(3);
		expect(records.map(row => row.role)).toEqual(['CUSTOMER', 'MANAGER', 'EMPLOYEE']);
		for (const row of records) {
			expect(row).toMatchObject({ assigned_from: 'assigner', assigned_to: 'recipient@example.test' });
			expect(row.timestamp).toBeInstanceOf(Date);
		}
		expect(new Set(records.map(row => row.id)).size).toBe(3);
		expect([...(await users.findByUsername(Username.create('recipient')))!.roles].map(role => role.name)).toEqual(['EMPLOYEE']);
	});

	it('allows repeated standalone SQL and ORM creation without deleting history', async () => {
		await repository.record('assigner', 'recipient@example.test', [UserRole.CUSTOMER]);
		const sql = readFileSync(join(__dirname, '../../src/infrastructure/persistence/migrations/019_create_roles_assignment_table.sql'), 'utf8');
		await database.dataSource.query(sql);
		await database.dataSource.query(sql);
		const runner = database.dataSource.createQueryRunner();
		try { await new RolesAssignment1794009600000().up(runner); } finally { await runner.release(); }
		expect(await database.dataSource.getRepository(RolesAssignmentEntity).count()).toBe(1);
	});

	it('enforces actor and role foreign keys and retains the original recipient email', async () => {
		await expect(repository.record('missing', 'recipient@example.test', [UserRole.CUSTOMER])).rejects.toMatchObject({ code: '23503' });
		await expect(repository.record('assigner', 'recipient@example.test', ['UNKNOWN' as UserRole])).rejects.toMatchObject({ code: '23503' });
		await repository.record('assigner', 'recipient@example.test', [UserRole.CUSTOMER]);
		const recipient = (await users.findByUsername(Username.create('recipient')))!;
		recipient.changeEmail(Email.create('changed@example.test').getValue());
		await users.save(recipient);
		const [record] = await database.dataSource.getRepository(RolesAssignmentEntity).find();
		expect(record.assigned_to).toBe('recipient@example.test');
		await expect(database.dataSource.query('DELETE FROM users WHERE username = $1', ['assigner'])).rejects.toMatchObject({ code: '23503' });
	});
});
