import { createHash } from 'node:crypto';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/presentation/app.module';
import { RECOVERY_MAILER } from '../../src/application/auth/IPasswordRecoveryStore';
import { PASSWORD_HASHER } from '../../src/application/auth/AuthDTOs';
import { IPasswordHasher } from '../../src/application/auth/ISecurityServices';
import { AuthSessionEntity, PasswordRecoveryEntity, UserEntity } from '../../src/infrastructure/persistence/entities';
import { PostgresUserRepository } from '../../src/infrastructure/persistence/repositories/PostgresUserRepository';
import { Username } from '../../src/domain/user/Username';
import { Email } from '../../src/domain/common/Email';
import { RoleName } from '../../src/domain/user/RoleName';
import { PasswordHash } from '../../src/domain/user/PasswordHash';
import { userFixture } from '../helpers/domain';
import { createTestDatabase, postgres } from '../helpers/postgres';

postgres('Password recovery HTTP and PostgreSQL lifecycle', () => {
	let database: Awaited<ReturnType<typeof createTestDatabase>>;
	let app: INestApplication;
	let initialHash: string;
	const outbox: { recipient: string; code: string }[] = [];
	const mailer = { sendRecoveryCode: jest.fn(async (recipient: string, code: string) => { outbox.push({ recipient, code }); }) };
	const email = 'recovery_customer@example.test';
	const oldPassword = 'OriginalPassword1!';
	const newPassword = 'ReplacementPassword2!';
	const roles = ['CUSTOMER', 'EMPLOYEE', 'MANAGER', 'ADMINISTRATOR'];
	const digest = (code: string) => createHash('sha256').update(code).digest('hex');
	const issue = (value = email) => request(app.getHttpServer()).post('/password-recovery').send({ email: value });
	const reset = (code: string, password = newPassword) => request(app.getHttpServer()).post('/password-recovery/new_pass').send({ recovery_code: code, new_password: password });

	beforeAll(async () => {
		database = await createTestDatabase();
		const module = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(DataSource).useValue(database.dataSource)
			.overrideProvider(RECOVERY_MAILER).useValue(mailer).compile();
		app = module.createNestApplication(); await app.init();
		initialHash = await app.get<IPasswordHasher>(PASSWORD_HASHER).hash(oldPassword);
		for (const role of roles) {
			const username = `recovery_${role.toLowerCase()}`;
			await new PostgresUserRepository(database.dataSource).insert(userFixture({ username: Username.create(username),
				email: Email.create(`${username}@example.test`).getValue(), passwordHash: PasswordHash.create(initialHash).getValue(), roles: new Set([RoleName.create(role)]) }));
		}
	});
	beforeEach(async () => {
		outbox.length = 0; mailer.sendRecoveryCode.mockClear();
		await database.dataSource.createQueryBuilder().delete().from(PasswordRecoveryEntity).execute();
		for (const role of roles) await database.dataSource.getRepository(UserEntity).update({ username: `recovery_${role.toLowerCase()}` }, { status: 'ACTIVE', password_hash: initialHash });
	});
	afterAll(async () => { await app?.close(); await database?.close(); });

	it('allows every active role without login, stores only code digests, and never returns the code', async () => {
		for (const role of roles) {
			const res = await issue(` RECOVERY_${role}@EXAMPLE.TEST `).expect(200);
			expect(res.headers['cache-control']).toBe('no-store');
			expect(Object.keys(res.body)).toEqual(['message']);
		}
		expect(outbox).toHaveLength(4);
		for (const mail of outbox) {
			expect(mail.code).toMatch(/^[a-f0-9]{64}$/);
			const row = await database.dataSource.getRepository(PasswordRecoveryEntity).findOneByOrFail({ email: mail.recipient });
			expect(row).toMatchObject({ recovery_code: digest(mail.code), status: 'PENDING' });
			expect(row.recovery_code).not.toBe(mail.code);
		}
	});

	it('rejects unknown, deactivated, and pending accounts without sending or storing a code', async () => {
		await issue('unknown@example.test').expect(404);
		for (const status of ['DEACTIVATED', 'PENDING_REGISTRATION']) {
			await database.dataSource.getRepository(UserEntity).update({ email }, { status });
			await issue().expect(404);
		}
		expect(outbox).toEqual([]);
		expect(await database.dataSource.getRepository(PasswordRecoveryEntity).count()).toBe(0);
	});

	it('enforces the 30-minute cooldown even for used codes and allows a request afterward', async () => {
		await issue().expect(200);
		await reset(outbox[0].code).expect(200);
		const denied = await issue().expect(429);
		expect(Number(denied.headers['retry-after'])).toBeGreaterThan(1700);
		expect(denied.body.error.message).toContain('requested recently');
		expect(outbox).toHaveLength(1);
		await database.dataSource.getRepository(PasswordRecoveryEntity).update({ email }, { timestamp: new Date(Date.now() - 30 * 60000 - 100) });
		await issue().expect(200);
		expect(outbox).toHaveLength(2);
	});

	it('serializes simultaneous requests so only one code is issued', async () => {
		const responses = await Promise.all([issue(), issue()]);
		expect(responses.map(res => res.status).sort()).toEqual([200, 429]);
		expect(outbox).toHaveLength(1);
		expect(await database.dataSource.getRepository(PasswordRecoveryEntity).count()).toBe(1);
	});

	it('updates the password once, marks USED, revokes existing sessions, and accepts only the new password', async () => {
		const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: oldPassword }).expect(200);
		await issue().expect(200);
		await reset(outbox[0].code).expect(200);
		expect((await database.dataSource.getRepository(PasswordRecoveryEntity).findOneByOrFail({ email })).status).toBe('USED');
		await request(app.getHttpServer()).get('/user/recovery_customer').set('Authorization', `Bearer ${login.body.token}`).expect(401);
		const sessions = await database.dataSource.getRepository(AuthSessionEntity).findBy({ username: 'recovery_customer' });
		expect(sessions.every(session => session.revoked_at !== null)).toBe(true);
		await request(app.getHttpServer()).post('/auth/login').send({ email, password: oldPassword }).expect(401);
		await request(app.getHttpServer()).post('/auth/login').send({ email, password: newPassword }).expect(200);
		await reset(outbox[0].code).expect(409);
	});

	it('rejects expired and unknown codes without changing the password or consuming the record', async () => {
		await reset('f'.repeat(64)).expect(401);
		await issue().expect(200);
		await database.dataSource.getRepository(PasswordRecoveryEntity).update({ email }, { timestamp: new Date(Date.now() - 5 * 60000) });
		await reset(outbox[0].code).expect(410);
		expect((await database.dataSource.getRepository(PasswordRecoveryEntity).findOneByOrFail({ email })).status).toBe('PENDING');
		expect((await database.dataSource.getRepository(UserEntity).findOneByOrFail({ email })).password_hash).toBe(initialHash);
	});

	it('serializes concurrent password changes so the code succeeds once', async () => {
		await issue().expect(200);
		const responses = await Promise.all([reset(outbox[0].code), reset(outbox[0].code)]);
		expect(responses.map(res => res.status).sort()).toEqual([200, 409]);
	});

	it('does not consume a code for weak passwords, malformed fields, or an inactive account', async () => {
		await issue().expect(200);
		await reset(outbox[0].code, 'weak').expect(400);
		await request(app.getHttpServer()).post('/password-recovery').send({ email, status: 'USED' }).expect(400);
		await reset('short').expect(400);
		await database.dataSource.getRepository(UserEntity).update({ email }, { status: 'DEACTIVATED' });
		await reset(outbox[0].code).expect(404);
		expect((await database.dataSource.getRepository(PasswordRecoveryEntity).findOneByOrFail({ email })).status).toBe('PENDING');
	});

	it('rolls back an unsuccessful email submission and allows retry', async () => {
		mailer.sendRecoveryCode.mockRejectedValueOnce(new ServiceUnavailableException('Recovery email could not be sent.'));
		await issue().expect(503);
		expect(await database.dataSource.getRepository(PasswordRecoveryEntity).count()).toBe(0);
		await issue().expect(200);
	});

	it('enforces the email foreign key and status values', async () => {
		const records = database.dataSource.getRepository(PasswordRecoveryEntity);
		await expect(records.insert({ email: 'missing@example.test', recovery_code: 'a'.repeat(64), status: 'PENDING' })).rejects.toMatchObject({ code: '23503' });
		await expect(records.insert({ email, recovery_code: 'a'.repeat(64), status: 'INVALID' as never })).rejects.toMatchObject({ code: '23514' });
	});
});
