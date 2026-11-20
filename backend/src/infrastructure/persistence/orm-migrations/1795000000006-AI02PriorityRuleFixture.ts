import { MigrationInterface, QueryRunner } from 'typeorm';

/** Persistent, isolated Clarification #51 example used by local AI02 planning demos. */
export class AI02PriorityRuleFixture1795000000006 implements MigrationInterface {
	name = 'AI02PriorityRuleFixture1795000000006';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE consumption_forecasts
			ADD COLUMN IF NOT EXISTS pending_deliveries JSONB NOT NULL DEFAULT '[]'::jsonb
		`);

		await queryRunner.query(`
			INSERT INTO products (
				sku, name, description, category_name, is_sellable, is_pizza_component,
				is_stock_controlled, direct_selling_price, direct_price_currency,
				is_active, stock_units_per_sale
			) VALUES (
				'TST-AI02-C51-01', 'AI02 Clarification 51 Test Unit',
				'Isolated fixture for on-time versus late allocation', 'Ingredients',
				TRUE, FALSE, TRUE, 1.00, 'EUR', TRUE, 1
			)
			ON CONFLICT (sku) DO UPDATE SET
				name = EXCLUDED.name, description = EXCLUDED.description,
				category_name = EXCLUDED.category_name, is_sellable = TRUE,
				is_pizza_component = FALSE, is_stock_controlled = TRUE,
				direct_selling_price = 1.00, direct_price_currency = 'EUR',
				is_active = TRUE, stock_units_per_sale = 1
		`);
		await queryRunner.query(`
			INSERT INTO stock_items (product_sku, current_units)
			VALUES ('TST-AI02-C51-01', 0)
			ON CONFLICT (product_sku) DO UPDATE SET current_units = 0, updated_at = NOW()
		`);

		await queryRunner.query(`
			INSERT INTO consumption_forecasts (name, start_date, end_date, pending_deliveries)
			VALUES (
				'AI02-C51-Priority-Test-20261119', '2026-12-12', '2026-12-13',
				'[{"productSku":"TST-AI02-C51-01","quantity":6,"expectedDeliveryDate":"2026-12-12"}]'::jsonb
			)
			ON CONFLICT (name) DO UPDATE SET
				start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
				pending_deliveries = EXCLUDED.pending_deliveries, updated_at = NOW()
		`);
		await queryRunner.query(`
			DELETE FROM consumption_forecast_entries
			WHERE forecast_name = 'AI02-C51-Priority-Test-20261119'
		`);
		await queryRunner.query(`
			INSERT INTO consumption_forecast_entries (forecast_name, entry_date, product_sku, pizza_size, quantity)
			VALUES
				('AI02-C51-Priority-Test-20261119', '2026-12-12', 'TST-AI02-C51-01', NULL, 3),
				('AI02-C51-Priority-Test-20261119', '2026-12-13', 'TST-AI02-C51-01', NULL, 4)
		`);

		await queryRunner.query(`
			INSERT INTO supplier_scenarios (name, is_simulated, confirmed_at)
			VALUES ('AI02-C51-Late-Scenario-20261119', TRUE, NOW())
			ON CONFLICT (name) DO UPDATE SET is_simulated = TRUE, confirmed_at = NOW()
		`);
		await queryRunner.query(`
			INSERT INTO suppliers (scenario_name, supplier_code, name)
			VALUES ('AI02-C51-Late-Scenario-20261119', 'SUP-AI02-C51-TEST', 'Clarification 51 Test Supplier')
			ON CONFLICT (scenario_name, supplier_code) DO UPDATE SET name = EXCLUDED.name
		`);
		await queryRunner.query(`
			INSERT INTO supplier_offers (
				scenario_name, supplier_code, product_sku, price_amount, price_currency,
				stock_unit_quantity, lead_time_days, daily_supply_limit
			) VALUES (
				'AI02-C51-Late-Scenario-20261119', 'SUP-AI02-C51-TEST',
				'TST-AI02-C51-01', 1.00, 'EUR', 1, 5, NULL
			)
			ON CONFLICT (scenario_name, supplier_code, product_sku) DO UPDATE SET
				price_amount = 1.00, price_currency = 'EUR', stock_unit_quantity = 1,
				lead_time_days = 5, daily_supply_limit = NULL
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DELETE FROM supplier_scenarios WHERE name = 'AI02-C51-Late-Scenario-20261119'`);
		await queryRunner.query(`DELETE FROM consumption_forecasts WHERE name = 'AI02-C51-Priority-Test-20261119'`);
		await queryRunner.query(`DELETE FROM stock_items WHERE product_sku = 'TST-AI02-C51-01'`);
		await queryRunner.query(`DELETE FROM products WHERE sku = 'TST-AI02-C51-01'`);
		await queryRunner.query(`ALTER TABLE consumption_forecasts DROP COLUMN IF EXISTS pending_deliveries`);
	}
}
