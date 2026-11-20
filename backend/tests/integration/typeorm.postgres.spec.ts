import { UnauthorizedAttemptEntity } from '../../src/infrastructure/persistence/entities/UnauthorizedAttemptEntity';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AuthSessionEntity } from '../../src/infrastructure/persistence/entities/AuthSessionEntity';
import { INITIAL_VIEWS } from '../../src/infrastructure/persistence/initial-views';
import { baselineDatabase } from '../../src/infrastructure/persistence/baseline';
import { DataSource } from 'typeorm';
import { createTestDatabase, postgres, seedTestDatabase } from '../helpers/postgres';
import { userFixture } from '../helpers/domain';
import { UserEntity, UserRoleAssignmentEntity, UserDietaryRestrictionEntity, StockItemEntity, StockMovementEntity, UserRoleEntity } from '../../src/infrastructure/persistence/entities';
import { PostgresUserRepository } from '../../src/infrastructure/persistence/repositories/PostgresUserRepository';
import { PostgresStockRepository } from '../../src/infrastructure/persistence/repositories/PostgresStockRepository';
import { Username } from '../../src/domain/user/Username';
import { Email } from '../../src/domain/common/Email';
import { RoleName } from '../../src/domain/user/RoleName';
import { DietaryRestriction } from '../../src/domain/user/DietaryRestriction';
import { AllergenName } from '../../src/domain/allergen/AllergenName';
import { Timestamp } from '../../src/domain/common/Timestamp';
import { PageRequest } from '../../src/domain/common/Pagination';
import { Sku } from '../../src/domain/product/Sku';
import { StockQuantity } from '../../src/domain/stock/StockQuantity';

postgres('TypeORM PostgreSQL integrity and migrations', () => {
	let database: Awaited<ReturnType<typeof createTestDatabase>>;
	let source: DataSource;
	let users: PostgresUserRepository;
	beforeAll(async () => { database = await createTestDatabase(); source = database.dataSource; users = new PostgresUserRepository(source); });
	afterAll(async () => { await database?.close(); });

	it('matches every entity to the physical schema without proposing schema changes', async () => {
		expect(source.entityMetadatas.filter(entity => entity.tableType === 'regular')).toHaveLength(32);
		expect(source.entityMetadatas.filter(entity => entity.tableType === 'view')).toHaveLength(2);
		const diff = await source.driver.createSchemaBuilder().log();
		expect(diff.upQueries.map(query => query.query)).toEqual([]);
	});
	it('seeds idempotently without overwriting existing accounts or stock', async () => {
		const before = await source.getRepository(UserEntity).count();
		await source.getRepository(StockItemEntity).update({ product_sku: 'PRD-MOZZ' }, { current_units: 17 });
		await seedTestDatabase(source);
		expect(await source.getRepository(UserEntity).count()).toBe(before);
		expect((await source.getRepository(StockItemEntity).findOneByOrFail({ product_sku: 'PRD-MOZZ' })).current_units).toBe(17);
	});
	it('round-trips complete users and preserves every role under filtering', async () => {
		const user = userFixture({ username: Username.create('multi_role'), email: Email.create('multi@example.test').getValue(),
			roles: new Set([RoleName.create('CUSTOMER'), RoleName.create('MANAGER')]),
			dietaryRestrictions: new Set([new DietaryRestriction(AllergenName.create('Gluten'), Timestamp.create(new Date('2020-01-01Z')))]),
		});
		await users.insert(user);
		const loaded = (await users.findByEmail(Email.create('MULTI@EXAMPLE.TEST').getValue()))!;
		expect(loaded.username.value).toBe('multi_role');
		expect(loaded.createdAt.value).toEqual(user.createdAt.value);
		expect([...loaded.dietaryRestrictions][0].recordedAt.value).toEqual(new Date('2020-01-01Z'));
		const result = await users.findFiltered({ type: 'role', role: RoleName.create('CUSTOMER') }, PageRequest.create(1, 100));
		expect([...result.items.find(item => item.username.value === 'multi_role')!.roles].map(role => role.name)).toEqual(['CUSTOMER', 'MANAGER']);
		const empty = await users.findFiltered({ type: 'all' }, PageRequest.create(100, 10));
		expect(empty.items).toEqual([]); expect(empty.total).toBe(await source.getRepository(UserEntity).count());
	});
	it('rolls back the root and roles when a dietary reference is invalid', async () => {
		const user = userFixture({ username: Username.create('rollback_user'), email: Email.create('rollback@example.test').getValue(),
			dietaryRestrictions: new Set([new DietaryRestriction(AllergenName.create('Missing allergen'), Timestamp.create(new Date()))]),
		});
		await expect(users.insert(user)).rejects.toThrow('Allergen not found');
		expect(await source.getRepository(UserEntity).existsBy({ username: 'rollback_user' })).toBe(false);
		expect(await source.getRepository(UserRoleAssignmentEntity).countBy({ username: 'rollback_user' })).toBe(0);
		expect(await source.getRepository(UserDietaryRestrictionEntity).countBy({ username: 'rollback_user' })).toBe(0);
	});
	it('enforces required user roles at commit and rolls back the transaction', async () => {
		await expect(source.transaction(async manager => {
			await manager.insert(UserEntity, { username: 'missing_role', first_name: 'Missing', last_name: 'Role', email: 'missing-role@example.test', password_hash: 'hash' });
		})).rejects.toMatchObject({ driverError: { code: '23514' } });
		expect(await source.getRepository(UserEntity).existsBy({ username: 'missing_role' })).toBe(false);
	});
	it('serializes competing stock consumptions and persists only the successful movement', async () => {
		await source.getRepository(StockItemEntity).update({ product_sku: 'PRD-MOZZ' }, { current_units: 10 });
		const stock = new PostgresStockRepository(source);
		const consume = () => stock.withLockedItem(Sku.create('PRD-MOZZ'), item => item.consume(StockQuantity.create(6), 'Concurrent order'));
		const results = await Promise.allSettled([consume(), consume()]);
		expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
		expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
		expect((await stock.findByProductSku(Sku.create('PRD-MOZZ')))!.currentUnits).toBe(4);
		expect(await source.getRepository(StockMovementEntity).countBy({ product_sku: 'PRD-MOZZ' })).toBe(1);
	});
	it('adopts a database initialized by the Sprint 1 historical SQL scripts without changing data', async () => {
		const legacy = await createTestDatabase(false, true);
		try {
			const usersBefore = await legacy.dataSource.getRepository(UserEntity).find({ order: { username: 'ASC' } });
			await baselineDatabase(legacy.dataSource);
			expect(await legacy.dataSource.getRepository(UserEntity).find({ order: { username: 'ASC' } })).toEqual(usersBefore);
			expect(await legacy.dataSource.showMigrations()).toBe(true);
			await legacy.dataSource.runMigrations();
			expect((await legacy.dataSource.driver.createSchemaBuilder().log()).upQueries).toEqual([]);
		} finally { await legacy.close(); }
	});
	it('preserves SQL-created sessions when the SQL script is repeated and TypeORM migrates afterward', async () => {
		const legacy = await createTestDatabase(false, true);
		try {
			await baselineDatabase(legacy.dataSource);
			const sql = readFileSync(join(__dirname, '../../src/infrastructure/persistence/migrations/015_create_auth_sessions_table.sql'), 'utf8');
			await legacy.dataSource.query(sql);
			const owner = userFixture({ username: Username.create('sql_session_owner') });
			await new PostgresUserRepository(legacy.dataSource).insert(owner);
			const sessions = legacy.dataSource.getRepository(AuthSessionEntity);
			const id = randomUUID();
			await sessions.insert({ id, username: owner.username.value, expires_at: new Date(Date.now() + 900000), revoked_at: null });
			const before = await sessions.findOneByOrFail({ id });
			await legacy.dataSource.query(sql);
			await legacy.dataSource.runMigrations();
			expect(await sessions.findOneByOrFail({ id })).toEqual(before);
			expect((await legacy.dataSource.driver.createSchemaBuilder().log()).upQueries).toEqual([]);
			// The standalone script can also run after TypeORM has recorded the migration.
			await legacy.dataSource.query(sql);
			expect(await sessions.findOneByOrFail({ id })).toEqual(before);
		} finally { await legacy.close(); }
	});
	it('preserves SQL-created audit rows when TypeORM migrates and the script is repeated', async () => {
		const legacy = await createTestDatabase(false, true);
		try {
			await baselineDatabase(legacy.dataSource);
			const sql = readFileSync(join(__dirname, '../../src/infrastructure/persistence/migrations/016_create_unauthorized_attempts_table.sql'), 'utf8');
			await legacy.dataSource.query(sql);
			const owner = userFixture({ username: Username.create('sql_audit_owner') });
			await new PostgresUserRepository(legacy.dataSource).insert(owner);
			const entries = legacy.dataSource.getRepository(UnauthorizedAttemptEntity);
			await entries.insert({ user: owner.username.value, endpoint: 'GET /users' });
			const before = await entries.find();
			await legacy.dataSource.query(sql);
			await legacy.dataSource.runMigrations();
			await legacy.dataSource.query(sql);
			expect(await entries.find()).toEqual(before);
			expect((await legacy.dataSource.driver.createSchemaBuilder().log()).upQueries).toEqual([]);
		} finally { await legacy.close(); }
	});
	it('refuses baseline adoption when an existing view has different pricing semantics', async () => {
		const altered = INITIAL_VIEWS[1].expression.replace('SUM(config.price * r.default_quantity)', '(SUM(config.price * r.default_quantity) * 2)');
		await source.query(`CREATE OR REPLACE VIEW v_predefined_pizza_details AS ${altered}`);
		try { await expect(baselineDatabase(source)).rejects.toThrow('differs from the baseline'); }
		finally { await source.query(`CREATE OR REPLACE VIEW v_predefined_pizza_details AS ${INITIAL_VIEWS[1].expression}`); }
	});

	it('can explicitly revert and reapply the initial migration on an isolated schema', async () => {
		const fresh = await createTestDatabase(false);
		try {
			const isolated = fresh.dataSource;
			for (let index = 0; index < isolated.migrations.length; index++) await isolated.undoLastMigration();
			const runner = isolated.createQueryRunner();
			try { expect(await runner.hasTable('users')).toBe(false); } finally { await runner.release(); }
			await isolated.runMigrations();
			expect(await isolated.getRepository(UserEntity).count()).toBe(0);
			expect(await isolated.getRepository(UserRoleEntity).count()).toBe(4);
			const freshUser = userFixture({ username: Username.create('fresh_user') });
			await new PostgresUserRepository(isolated).insert(freshUser);
			await isolated.getRepository(UserEntity).delete({ username: 'fresh_user' });
			expect((await isolated.driver.createSchemaBuilder().log()).upQueries).toEqual([]);
		} finally { await fresh.close(); }
	});
	it('refuses to replay the initial schema over existing application tables', async () => {
		const before = await source.getRepository(UserEntity).count();
		await source.createQueryBuilder().delete().from('typeorm_migrations').execute();
		await expect(source.runMigrations()).rejects.toThrow('Existing application tables detected');
		expect(await source.getRepository(UserEntity).count()).toBe(before);
	});
});
