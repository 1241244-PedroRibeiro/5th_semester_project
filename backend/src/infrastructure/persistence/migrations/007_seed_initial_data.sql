BEGIN;

INSERT INTO user_roles (name) VALUES ('MANAGER'), ('EMPLOYEE'), ('CUSTOMER')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
	fixture RECORD;
	base_name VARCHAR;
	generated_username VARCHAR;
	existing_username VARCHAR;
	suffix INTEGER;
BEGIN
	FOR fixture IN
		SELECT * FROM (VALUES
			('Bruno', 'Manager', 'manager@laprizza.test', 'MANAGER', 'ACTIVE'),
			('Bruno', 'Manager', 'deactivated-manager@laprizza.test', 'MANAGER', 'DEACTIVATED'),
			('Bruno', 'Manager', 'pending-manager@laprizza.test', 'MANAGER', 'PENDING_REGISTRATION'),
			('Bruno', 'Customer', 'customer@laprizza.test', 'CUSTOMER', 'ACTIVE'),
			('Bruno', 'Customer', 'deactivated-customer@laprizza.test', 'CUSTOMER', 'DEACTIVATED'),
			('Bruno', 'Customer', 'pending-customer@laprizza.test', 'CUSTOMER', 'PENDING_REGISTRATION')
		) AS fixtures(first_name, last_name, email, role_name, status)
	LOOP
		SELECT username INTO existing_username FROM users WHERE email = fixture.email;
		IF existing_username IS NULL THEN
			base_name := split_part(fixture.email, '@', 1) || '_' || LEFT(split_part(fixture.email, '@', 2), 1);
			generated_username := base_name;
			suffix := 2;
			WHILE EXISTS (SELECT 1 FROM users WHERE username = generated_username) LOOP
				generated_username := base_name || suffix::VARCHAR;
				suffix := suffix + 1;
			END LOOP;
			INSERT INTO users (username, first_name, last_name, email, password_hash, status)
			VALUES (generated_username, fixture.first_name, fixture.last_name, fixture.email,
				'$argon2id$v=19$m=65536,t=3,p=1$usIZhOvq+OTNsffaQJ8fHA$x6uXsTjOKtMvGndh8SjNdyfTGRHLCi5jSPS1jNFwTLw', fixture.status);
			existing_username := generated_username;
		END IF;
		INSERT INTO user_role_assignments (username, role_name)
		VALUES (existing_username, fixture.role_name) ON CONFLICT DO NOTHING;
	END LOOP;
END;
$$;

INSERT INTO pizza_component_types (name, assembly_order, min_cardinality, max_cardinality)
VALUES ('Base Dough', 1, 1, 1), ('Base Sauce', 2, 0, 1), ('Cheese', 3, 0, 1), ('Topping', 4, 0, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO pizza_sizes (name, is_active)
VALUES ('Small', TRUE), ('Medium', TRUE), ('Large', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_categories (name, description)
VALUES ('Pizzas', 'Pizzas artesanais e pré-definidas'),
	('Beverages', 'Bebidas refrigeradas e águas'),
	('Ingredients', 'Ingredientes e componentes de pizza')
ON CONFLICT (name) DO NOTHING;

INSERT INTO allergens (name, description)
VALUES ('Gluten', 'Cereais contendo glúten'),
	('Lactose', 'Leite e derivados incluindo lactose'),
	('Crustaceans', 'Crustáceos e produtos à base de crustáceos')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (sku, name, description, category_name, is_sellable, is_pizza_component,
	is_stock_controlled, component_type_name, direct_selling_price, direct_price_currency)
VALUES ('PRD-MOZZ', 'Mozzarella', 'Queijo mozzarella para pizzas', 'Ingredients',
	FALSE, TRUE, TRUE, 'Cheese', NULL, NULL)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO stock_items (product_sku, current_units)
VALUES ('PRD-MOZZ', 10) ON CONFLICT (product_sku) DO NOTHING;

INSERT INTO product_allergens (product_sku, allergen_name)
VALUES ('PRD-MOZZ', 'Lactose') ON CONFLICT DO NOTHING;

INSERT INTO component_size_configurations (product_sku, pizza_size, price, price_currency, stock_units_consumed)
VALUES ('PRD-MOZZ', 'Small', 1.50, 'EUR', 1)
ON CONFLICT (product_sku, pizza_size) DO NOTHING;

COMMIT;
