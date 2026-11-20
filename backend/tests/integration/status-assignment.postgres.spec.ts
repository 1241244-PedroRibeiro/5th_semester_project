import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTestDatabase, postgres } from '../helpers/postgres';
import { userFixture } from '../helpers/domain';
import { passwordHasher } from '../helpers/password-hasher';
import { InMemoryAuthSessionRepository } from '../helpers/auth-sessions';
import { AuthService } from '../../src/application/auth/AuthService';
import { ActivationInvitationService } from '../../src/application/auth/ActivationInvitationService';
import { UserService } from '../../src/application/user/UserService';
import { RolesAssignmentService } from '../../src/application/user/RolesAssignmentService';
import { StatusAssignmentService } from '../../src/application/user/StatusAssignmentService';
import { PostgresRolesAssignmentRepository } from '../../src/infrastructure/persistence/repositories/PostgresRolesAssignmentRepository';
import { PostgresStatusAssignmentRepository } from '../../src/infrastructure/persistence/repositories/PostgresStatusAssignmentRepository';
import { PostgresUserRepository } from '../../src/infrastructure/persistence/repositories/PostgresUserRepository';
import { StatusAssignmentEntity } from '../../src/infrastructure/persistence/entities';
import { StatusAssignment1794009601000 } from '../../src/infrastructure/persistence/orm-migrations/1794009601000-StatusAssignment';
import { Username } from '../../src/domain/user/Username';
import { Email } from '../../src/domain/common/Email';
import { UserStatus } from '../../src/domain/user/UserStatus';

postgres('Account status assignment history PostgreSQL persistence', () => {
	let database: Awaited<ReturnType<typeof createTestDatabase>>;
	let repository: PostgresStatusAssignmentRepository;
	let users: PostgresUserRepository;
	let auth: AuthService;
	let service: UserService;
	beforeAll(async () => {
		database = await createTestDatabase(false);
		repository = new PostgresStatusAssignmentRepository(database.dataSource);
		users = new PostgresUserRepository(database.dataSource);
		const history = new StatusAssignmentService(repository);
		service = new UserService(users, passwordHasher, new RolesAssignmentService(new PostgresRolesAssignmentRepository(database.dataSource)), history);
		auth = new AuthService(users, passwordHasher, { generateToken: async () => 'test-token', verifyToken: async () => null },
			new InMemoryAuthSessionRepository(), new ActivationInvitationService(users, { sendInvitation: async () => {} }), history, new RolesAssignmentService(new PostgresRolesAssignmentRepository(database.dataSource)));
		await users.insert(userFixture({ username: Username.create('assigner'), email: Email.create('assigner@example.test').getValue() }));
		await users.insert(userFixture({ username: Username.create('recipient'), email: Email.create('recipient@example.test').getValue() }));
	});
	afterAll(async () => { await database?.close(); });
	beforeEach(async () => { await database.dataSource.query('TRUNCATE status_assignment RESTART IDENTITY'); });

	it('matches SQL schema with the registered ORM entity', async () => {
		const diff = await database.dataSource.driver.createSchemaBuilder().log();
		expect(diff.upQueries.map(query => query.query)).toEqual([]);
	});

	it('records initial ACTIVE/PENDING status and registration completion with real actor foreign keys', async () => {
		const direct = await auth.register({ email: 'public-status@example.test', firstName: 'Public', lastName: 'User', password: 'Password123!' });
		await auth.invite({ email: 'invited-status@example.test', roleName: 'EMPLOYEE' }, 'assigner');
		await auth.invite({ email: 'invited-status@example.test', roleName: 'MANAGER' }, 'assigner');
		const completed = await auth.register({ email: 'invited-status@example.test', firstName: 'Invited', lastName: 'User', password: 'Password123!' });
		const records = await database.dataSource.getRepository(StatusAssignmentEntity).find({ order: { id: 'ASC' } });
		expect(records.map(row => [row.assigned_from, row.assigned_to, row.status])).toEqual([
			[direct.user.username, 'public-status@example.test', UserStatus.ACTIVE],
			['assigner', 'invited-status@example.test', UserStatus.PENDING_REGISTRATION],
			[completed.user.username, 'invited-status@example.test', UserStatus.ACTIVE],
		]);
		for (const row of records) expect(row.timestamp).toBeInstanceOf(Date);
	});

	it('records actual deactivation/reactivation and self-deactivation but no duplicate idempotent event', async () => {
		await service.deactivateUser('recipient', 'assigner');
		await service.deactivateUser('recipient', 'assigner');
		await service.reactivateUser('recipient', 'assigner');
		await service.deactivateUser('recipient', 'recipient');
		const records = await database.dataSource.getRepository(StatusAssignmentEntity).find({ order: { id: 'ASC' } });
		expect(records.map(row => [row.assigned_from, row.status])).toEqual([
			['assigner', UserStatus.DEACTIVATED], ['assigner', UserStatus.ACTIVE], ['recipient', UserStatus.DEACTIVATED],
		]);
		expect((await users.findByUsername(Username.create('recipient')))!.status).toBe(UserStatus.DEACTIVATED);
	});

	it('supports repeated SQL and ORM creation while preserving existing history', async () => {
		await repository.record('assigner', 'recipient@example.test', UserStatus.ACTIVE);
		const sql = readFileSync(join(__dirname, '../../src/infrastructure/persistence/migrations/020_create_status_assignment_table.sql'), 'utf8');
		await database.dataSource.query(sql);
		await database.dataSource.query(sql);
		const runner = database.dataSource.createQueryRunner();
		try { await new StatusAssignment1794009601000().up(runner); } finally { await runner.release(); }
		expect(await database.dataSource.getRepository(StatusAssignmentEntity).count()).toBe(1);
	});

	it('enforces actor/status constraints and preserves the recipient email snapshot', async () => {
		await expect(repository.record('missing', 'recipient@example.test', UserStatus.ACTIVE)).rejects.toMatchObject({ code: '23503' });
		await expect(repository.record('assigner', 'recipient@example.test', 'INVALID' as UserStatus)).rejects.toMatchObject({ code: '23514' });
		await repository.record('assigner', 'recipient@example.test', UserStatus.ACTIVE);
		const recipient = (await users.findByUsername(Username.create('recipient')))!;
		recipient.changeEmail(Email.create('changed-status@example.test').getValue()); await users.save(recipient);
		const [record] = await database.dataSource.getRepository(StatusAssignmentEntity).find();
		expect(record.assigned_to).toBe('recipient@example.test');
		await database.dataSource.query('DELETE FROM users WHERE username = $1', ['assigner']);
		expect((await database.dataSource.getRepository(StatusAssignmentEntity).find())[0].assigned_from).toBeNull();
	});
});
