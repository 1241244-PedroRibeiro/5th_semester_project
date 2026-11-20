import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint2AIPlanning1795000000001 implements MigrationInterface {
    name = 'Sprint2AIPlanning1795000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Adicionar coluna a products
        await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_units_per_sale INT`);
        await queryRunner.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_stock_units_per_sale`);
        await queryRunner.query(`ALTER TABLE products ADD CONSTRAINT chk_stock_units_per_sale CHECK (stock_units_per_sale IS NULL OR stock_units_per_sale >= 0)`);

        // 2. Consumption Forecasts
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS consumption_forecasts (
                name VARCHAR PRIMARY KEY,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT chk_forecast_dates CHECK (start_date <= end_date)
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS consumption_forecast_entries (
                id SERIAL PRIMARY KEY,
                forecast_name VARCHAR NOT NULL REFERENCES consumption_forecasts(name) ON DELETE CASCADE,
                entry_date DATE NOT NULL,
                product_sku VARCHAR NOT NULL REFERENCES products(sku) ON DELETE RESTRICT,
                pizza_size VARCHAR REFERENCES pizza_sizes(name) ON DELETE RESTRICT,
                quantity INT NOT NULL CHECK (quantity >= 0),
                CONSTRAINT uq_forecast_entry UNIQUE NULLS NOT DISTINCT (forecast_name, entry_date, product_sku, pizza_size)
            )
        `);

        // 3. Supplier Scenarios
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS supplier_scenarios (
                name VARCHAR PRIMARY KEY,
                is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
                confirmed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                scenario_name VARCHAR NOT NULL REFERENCES supplier_scenarios(name) ON DELETE CASCADE,
                supplier_code VARCHAR NOT NULL,
                name VARCHAR,
                PRIMARY KEY (scenario_name, supplier_code)
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS supplier_offers (
                scenario_name VARCHAR NOT NULL,
                supplier_code VARCHAR NOT NULL,
                product_sku VARCHAR NOT NULL REFERENCES products(sku) ON DELETE RESTRICT,
                price_amount NUMERIC(10,2) NOT NULL CHECK (price_amount >= 0),
                price_currency VARCHAR NOT NULL DEFAULT 'EUR',
                stock_unit_quantity INT NOT NULL CHECK (stock_unit_quantity > 0),
                lead_time_days INT NOT NULL CHECK (lead_time_days >= 0),
                daily_supply_limit INT CHECK (daily_supply_limit IS NULL OR daily_supply_limit >= 0),
                PRIMARY KEY (scenario_name, supplier_code, product_sku),
                FOREIGN KEY (scenario_name, supplier_code) REFERENCES suppliers(scenario_name, supplier_code) ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS supplier_offers`);
        await queryRunner.query(`DROP TABLE IF EXISTS suppliers`);
        await queryRunner.query(`DROP TABLE IF EXISTS supplier_scenarios`);
        await queryRunner.query(`DROP TABLE IF EXISTS consumption_forecast_entries`);
        await queryRunner.query(`DROP TABLE IF EXISTS consumption_forecasts`);
        await queryRunner.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_stock_units_per_sale`);
        await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS stock_units_per_sale`);
    }
}