import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCatalogData1793145600001 implements MigrationInterface {
	name = 'InitialCatalogData1793145600001';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			INSERT INTO product_categories (name, description)
			VALUES
				('Pizzas', 'Pizzas artesanais'),
				('Beverages', 'Bebidas'),
				('Ingredients', 'Ingredientes e componentes de pizza')
			ON CONFLICT (name) DO NOTHING;

			INSERT INTO pizza_sizes (name, is_active)
			VALUES
				('Small', TRUE),
				('Medium', TRUE),
				('Large', TRUE)
			ON CONFLICT (name) DO NOTHING;

			INSERT INTO pizza_component_types (
				name, assembly_order, min_cardinality, max_cardinality
			)
			VALUES
				('Base Dough', 1, 1, 1),
				('Base Sauce', 2, 0, 1),
				('Cheese', 3, 0, 1),
				('Topping', 4, 0, NULL)
			ON CONFLICT (name) DO NOTHING;

			INSERT INTO allergens (name, description)
			VALUES
				('Gluten', 'Cereais contendo glúten'),
				('Lactose', 'Leite e derivados incluindo lactose'),
				('Crustaceans', 'Crustáceos e produtos à base de crustáceos')
			ON CONFLICT (name) DO NOTHING;

			INSERT INTO products (
				sku, name, description, category_name, is_sellable,
				is_pizza_component, is_stock_controlled, component_type_name,
				direct_selling_price, direct_price_currency, is_active
			)
			VALUES
				('PRD-DOUGH', 'Classic Pizza Dough', 'Dough', 'Ingredients',
					FALSE, TRUE, TRUE, 'Base Dough', NULL, NULL, TRUE),
				('PRD-TOMATO', 'Tomato Sauce', 'Sauce', 'Ingredients',
					FALSE, TRUE, TRUE, 'Base Sauce', NULL, NULL, TRUE),
				('PRD-MOZZ', 'Mozzarella', 'Cheese', 'Ingredients',
					FALSE, TRUE, TRUE, 'Cheese', NULL, NULL, TRUE),
				('PRD-BASIL', 'Fresh Basil', 'Herb', 'Ingredients',
					FALSE, TRUE, TRUE, 'Topping', NULL, NULL, TRUE),
				('PIZ-MARGHERITA', 'Margherita', 'Classic Margherita', 'Pizzas',
					TRUE, FALSE, FALSE, NULL, 7.00, 'EUR', TRUE)
			ON CONFLICT (sku) DO NOTHING;
		`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DELETE FROM products
			WHERE sku IN ('PRD-DOUGH', 'PRD-TOMATO', 'PRD-MOZZ', 'PRD-BASIL', 'PIZ-MARGHERITA');
			DELETE FROM allergens
			WHERE name IN ('Gluten', 'Lactose', 'Crustaceans');
			DELETE FROM pizza_component_types
			WHERE name IN ('Base Dough', 'Base Sauce', 'Cheese', 'Topping');
			DELETE FROM pizza_sizes
			WHERE name IN ('Small', 'Medium', 'Large');
			DELETE FROM product_categories
			WHERE name IN ('Pizzas', 'Beverages', 'Ingredients');
		`);
	}
}
