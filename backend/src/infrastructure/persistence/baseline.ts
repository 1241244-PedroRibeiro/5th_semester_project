import { StatusAssignmentEntity } from './entities/StatusAssignmentEntity';
import { RolesAssignmentEntity } from './entities/RolesAssignmentEntity';
import { DataSource } from 'typeorm';
import * as entities from './entities';
import { UnauthorizedAttemptEntity } from './entities/UnauthorizedAttemptEntity';
import { PasswordRecoveryEntity } from './entities/PasswordRecoveryEntity';
import { AuthSessionEntity } from './entities/AuthSessionEntity';
import { LoginAttemptBucketEntity } from './entities/LoginAttemptBucketEntity';
import { RoleChangeLogEntity } from './entities/RoleChangeLogEntity';
import { ExchangeCodeEntity } from './entities/ExchangeCodeEntity';
import { InitialSchema1793145600000 } from './orm-migrations/1793145600000-InitialSchema';
import { INITIAL_VIEWS } from './initial-views';

/** Validates schema and session-local comparison views before recording history; never changes application data. */
export async function baselineDatabase(dataSource: DataSource): Promise<void> {
	// Adoption compares and records the historical baseline only. Forward migrations run normally afterward.
	const baseline = new DataSource({ ...dataSource.options,
		entities: Object.values(entities).filter(entity => entity !== AuthSessionEntity && entity !== UnauthorizedAttemptEntity && entity !== PasswordRecoveryEntity && entity !== RolesAssignmentEntity && entity !== StatusAssignmentEntity && entity !== LoginAttemptBucketEntity && entity !== RoleChangeLogEntity && entity !== ExchangeCodeEntity),
		migrations: [InitialSchema1793145600000],
	});

	await baseline.initialize();

	try {
		await adoptInitialSchema(baseline);
	} finally {
		await baseline.destroy();
	}
}

async function adoptInitialSchema(dataSource: DataSource): Promise<void> {
	if (dataSource.migrations.length !== 1 || dataSource.migrations[0].name !== 'InitialSchema1793145600000')
		throw new Error('Baseline adoption must record only the initial migration. Review pending forward migrations separately.');

	const diff = await dataSource.driver.createSchemaBuilder().log();
	const unexpected = diff.upQueries.filter(query => !/^CREATE VIEW /.test(query.query) && !/^INSERT INTO .*typeorm_metadata/.test(query.query));

	if (unexpected.length)
		throw new Error(`Existing schema differs from the TypeORM baseline. Review these changes before adoption:\n${unexpected.map(query => query.query).join('\n')}`);

	// Catalog queries are necessary to inspect PostgreSQL views and deferred constraint triggers.
	const views: { table_name: string }[] = await dataSource.query(
		'SELECT table_name FROM information_schema.views WHERE table_schema = $1', [(dataSource.options as { schema?: string }).schema || 'public']);

		if (INITIAL_VIEWS.some(view => !views.some(row => row.table_name === view.name)))
		throw new Error('Baseline views are missing; apply all historical SQL scripts before adoption.');
	const runner = dataSource.createQueryRunner();

	try {
		for (const [index, view] of INITIAL_VIEWS.entries()) {
			const temporaryName = `typeorm_baseline_view_${index}`;
			await runner.query(`CREATE TEMP VIEW "${temporaryName}" AS ${view.expression}`);
			try {
				const [definition]: { actual: string; expected: string }[] = await runner.query(
					'SELECT pg_get_viewdef(to_regclass($1), true) AS actual, pg_get_viewdef(to_regclass($2), true) AS expected',
					[`${(dataSource.options as { schema?: string }).schema || 'public'}.${view.name}`, `pg_temp.${temporaryName}`]);
				if (definition.actual !== definition.expected)
					throw new Error(`Existing view ${view.name} differs from the baseline.`);
			} finally { await runner.query(`DROP VIEW "${temporaryName}"`); }
		}
	} finally { await runner.release(); }

	const triggers: { tgname: string }[] = await dataSource.query(`SELECT t.tgname FROM pg_trigger t
		JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = $1 AND t.tgdeferrable AND t.tginitdeferred`, [(dataSource.options as { schema?: string }).schema || 'public']);

	const required = ['users_require_roles', 'role_assignments_preserve_user_roles', 'predefined_pizzas_require_recipe', 'recipes_preserve_pizza_recipe',
		'customer_orders_require_items', 'items_preserve_order_items', 'snapshots_require_components', 'components_preserve_snapshot_components'];

		if (required.some(name => !triggers.some(trigger => trigger.tgname === name)))
		throw new Error('Required deferred constraint triggers are missing.');

	await dataSource.runMigrations({ fake: true });
	await dataSource.transaction(async manager => {
		for (const view of INITIAL_VIEWS) {
			// The metadata table is managed by TypeORM and has no application entity.
			const found = await manager.createQueryBuilder().select('metadata.name').from('typeorm_metadata', 'metadata')
				.where('metadata.type = :type AND metadata.schema = :schema AND metadata.name = :name', { type: 'VIEW', schema: (dataSource.options as { schema?: string }).schema || 'public', name: view.name }).getRawOne();
			if (!found) await manager.createQueryBuilder().insert().into('typeorm_metadata', ['type', 'schema', 'name', 'value']).values({
				type: 'VIEW', schema: (dataSource.options as { schema?: string }).schema || 'public', name: view.name, value: view.expression,
			}).execute();
		}
	});
}
