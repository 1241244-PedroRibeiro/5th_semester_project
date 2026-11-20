import { MigrationInterface, QueryRunner } from 'typeorm';

export class AI02Fixtures1795000000002 implements MigrationInterface {
    name = 'AI02Fixtures1795000000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Startup runs migrations before optional development seeds. Create every
        // catalogue prerequisite here so fixtures also work on an empty database.
        await queryRunner.query(`
            INSERT INTO product_categories (name, description) VALUES
                ('Pizzas', 'Pizzas artesanais'),
                ('Beverages', 'Bebidas'),
                ('Ingredients', 'Ingredientes')
            ON CONFLICT (name) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO pizza_sizes (name, is_active) VALUES
                ('Small', TRUE), ('Medium', TRUE), ('Large', TRUE)
            ON CONFLICT (name) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO pizza_component_types (name, assembly_order, min_cardinality, max_cardinality) VALUES
                ('Base Dough', 1, 1, 1), ('Base Sauce', 2, 0, 1),
                ('Cheese', 3, 0, 1), ('Topping', 4, 0, NULL)
            ON CONFLICT (name) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO products (
                sku, name, description, category_name, is_sellable,
                is_pizza_component, is_stock_controlled, component_type_name,
                direct_selling_price, direct_price_currency, is_active
            ) VALUES
                ('PRD-DOUGH', 'Classic Pizza Dough', 'Dough',
                    'Ingredients', FALSE, TRUE, TRUE, 'Base Dough', NULL, NULL, TRUE),
                ('PRD-TOMATO', 'Tomato Sauce', 'Sauce',
                    'Ingredients', FALSE, TRUE, TRUE, 'Base Sauce', NULL, NULL, TRUE),
                ('PRD-MOZZ', 'Mozzarella', 'Cheese',
                    'Ingredients', FALSE, TRUE, TRUE, 'Cheese', NULL, NULL, TRUE),
                ('PRD-BASIL', 'Fresh Basil', 'Herb',
                    'Ingredients', FALSE, TRUE, TRUE, 'Topping', NULL, NULL, TRUE),
                ('PIZ-MARGHERITA', 'Margherita', 'Classic Margherita',
                    'Pizzas', TRUE, FALSE, FALSE, NULL, 7.00, 'EUR', TRUE),
                ('PRD-INACTIVE', 'Inactive Ingredient', 'AI02 test ingredient',
                    'Ingredients', FALSE, TRUE, TRUE, 'Topping', NULL, NULL, FALSE),
                ('PRD-MISSING-UNITS', 'Missing Units Product', 'AI02 test product',
                    'Beverages', TRUE, FALSE, TRUE, NULL, 1.00, 'EUR', TRUE)
            ON CONFLICT (sku) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO stock_items (product_sku, current_units)
            VALUES
                ('PRD-DOUGH', 120),
                ('PRD-TOMATO', 120),
                ('PRD-MOZZ', 10),
                ('PRD-BASIL', 120)
            ON CONFLICT (product_sku) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO component_size_configurations (
                product_sku, pizza_size, price, price_currency, stock_units_consumed
            ) VALUES
                ('PRD-DOUGH', 'Medium', 1.50, 'EUR', 2),
                ('PRD-DOUGH', 'Large', 2.00, 'EUR', 3),
                ('PRD-TOMATO', 'Medium', 0.75, 'EUR', 1),
                ('PRD-TOMATO', 'Large', 1.00, 'EUR', 2),
                ('PRD-MOZZ', 'Medium', 1.50, 'EUR', 2),
                ('PRD-MOZZ', 'Large', 2.00, 'EUR', 3),
                ('PRD-BASIL', 'Medium', 0.30, 'EUR', 1),
                ('PRD-BASIL', 'Large', 0.50, 'EUR', 1)
            ON CONFLICT (product_sku, pizza_size) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO predefined_pizzas (sku, recipe_name)
            VALUES ('PIZ-MARGHERITA', 'Margherita Classica')
            ON CONFLICT (sku) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO predefined_pizza_recipes (
                pizza_sku, component_product_sku, default_quantity
            )
            VALUES
                ('PIZ-MARGHERITA', 'PRD-DOUGH', 1),
                ('PIZ-MARGHERITA', 'PRD-TOMATO', 1),
                ('PIZ-MARGHERITA', 'PRD-MOZZ', 1),
                ('PIZ-MARGHERITA', 'PRD-BASIL', 1)
            ON CONFLICT (pizza_sku, component_product_sku) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO predefined_pizza_available_sizes (pizza_sku, pizza_size)
            VALUES
                ('PIZ-MARGHERITA', 'Medium'),
                ('PIZ-MARGHERITA', 'Large')
            ON CONFLICT (pizza_sku, pizza_size) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO consumption_forecasts (name, start_date, end_date)
            VALUES
                ('Week-45', '2026-11-05', '2026-11-06'),
                ('Week-Inactive', '2026-11-05', '2026-11-05'),
                ('Week-Missing-Units', '2026-11-05', '2026-11-05'),
                ('Week-Late', '2026-11-05', '2026-11-05')
            ON CONFLICT (name) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO consumption_forecast_entries (
                forecast_name, entry_date, product_sku, pizza_size, quantity
            )
            VALUES
                ('Week-45', '2026-11-05', 'PIZ-MARGHERITA', 'Medium', 10),
                ('Week-45', '2026-11-06', 'PIZ-MARGHERITA', 'Medium', 15),
                ('Week-Inactive', '2026-11-05', 'PRD-INACTIVE', NULL, 10),
                ('Week-Missing-Units', '2026-11-05', 'PRD-MISSING-UNITS', NULL, 10),
                ('Week-Late', '2026-11-05', 'PIZ-MARGHERITA', 'Medium', 100)
            ON CONFLICT (forecast_name, entry_date, product_sku, pizza_size) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO supplier_scenarios (name, is_simulated, confirmed_at)
            VALUES
                ('Autumn-Scenario', FALSE, NOW()),
                ('Unconfirmed-Scenario', FALSE, NULL),
                ('Late-Scenario', FALSE, NOW())
            ON CONFLICT (name) DO UPDATE
            SET confirmed_at = EXCLUDED.confirmed_at
        `);

        await queryRunner.query(`
            INSERT INTO suppliers (scenario_name, supplier_code, name)
            VALUES
                ('Autumn-Scenario', 'SUP-A', 'Mozzarella Co.'),
                ('Late-Scenario', 'SUP-LATE', 'Slow Mozzarella')
            ON CONFLICT (scenario_name, supplier_code) DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO supplier_offers (
                scenario_name, supplier_code, product_sku, price_amount,
                price_currency, stock_unit_quantity, lead_time_days,
                daily_supply_limit
            )
            VALUES
                ('Autumn-Scenario', 'SUP-A', 'PRD-MOZZ', 2.00, 'EUR', 10, 2, 20),
                ('Late-Scenario', 'SUP-LATE', 'PRD-MOZZ', 2.00, 'EUR', 10, 5, NULL)
            ON CONFLICT (scenario_name, supplier_code, product_sku) DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM supplier_offers WHERE scenario_name IN ('Autumn-Scenario', 'Unconfirmed-Scenario', 'Late-Scenario')`);
        await queryRunner.query(`DELETE FROM suppliers WHERE scenario_name IN ('Autumn-Scenario', 'Unconfirmed-Scenario', 'Late-Scenario')`);
        await queryRunner.query(`DELETE FROM supplier_scenarios WHERE name IN ('Autumn-Scenario', 'Unconfirmed-Scenario', 'Late-Scenario')`);
        await queryRunner.query(`DELETE FROM consumption_forecasts WHERE name IN ('Week-45', 'Week-Inactive', 'Week-Missing-Units', 'Week-Late')`);
    }
}
