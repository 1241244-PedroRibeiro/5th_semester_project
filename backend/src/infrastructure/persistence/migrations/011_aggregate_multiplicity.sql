-- Deferred checks implement the four 1..* compositions shown in the ERD.
-- Insert/update a root and its required children in the same transaction.
BEGIN;

CREATE OR REPLACE FUNCTION enforce_minimum_owned_children() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
	parent_table TEXT := TG_ARGV[0];
	parent_key TEXT := TG_ARGV[1];
	child_table TEXT := TG_ARGV[2];
	child_key TEXT := TG_ARGV[3];
	identity_value TEXT;
	missing_children BOOLEAN;
BEGIN
	IF TG_TABLE_NAME = parent_table THEN
		identity_value := to_jsonb(NEW) ->> parent_key;
	ELSE
		identity_value := to_jsonb(OLD) ->> child_key;
	END IF;

	EXECUTE format(
		'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE %I::text = $1) '
		|| 'AND NOT EXISTS (SELECT 1 FROM %I.%I WHERE %I::text = $1)',
		TG_TABLE_SCHEMA, parent_table, parent_key, TG_TABLE_SCHEMA, child_table, child_key
	) INTO missing_children USING identity_value;

	IF missing_children THEN
		RAISE EXCEPTION '% must retain at least one % row', parent_table, child_table
			USING ERRCODE = '23514';
	END IF;
	RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS users_require_roles ON users;
CREATE CONSTRAINT TRIGGER users_require_roles AFTER INSERT OR UPDATE ON users
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('users', 'username', 'user_role_assignments', 'username');
DROP TRIGGER IF EXISTS role_assignments_preserve_user_roles ON user_role_assignments;
CREATE CONSTRAINT TRIGGER role_assignments_preserve_user_roles AFTER DELETE OR UPDATE ON user_role_assignments
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('users', 'username', 'user_role_assignments', 'username');

DROP TRIGGER IF EXISTS predefined_pizzas_require_recipe ON predefined_pizzas;
CREATE CONSTRAINT TRIGGER predefined_pizzas_require_recipe AFTER INSERT OR UPDATE ON predefined_pizzas
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('predefined_pizzas', 'sku', 'predefined_pizza_recipes', 'pizza_sku');
DROP TRIGGER IF EXISTS recipes_preserve_pizza_recipe ON predefined_pizza_recipes;
CREATE CONSTRAINT TRIGGER recipes_preserve_pizza_recipe AFTER DELETE OR UPDATE ON predefined_pizza_recipes
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('predefined_pizzas', 'sku', 'predefined_pizza_recipes', 'pizza_sku');

DROP TRIGGER IF EXISTS customer_orders_require_items ON customer_orders;
CREATE CONSTRAINT TRIGGER customer_orders_require_items AFTER INSERT OR UPDATE ON customer_orders
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('customer_orders', 'id', 'order_items', 'order_id');
DROP TRIGGER IF EXISTS items_preserve_order_items ON order_items;
CREATE CONSTRAINT TRIGGER items_preserve_order_items AFTER DELETE OR UPDATE ON order_items
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('customer_orders', 'id', 'order_items', 'order_id');

DROP TRIGGER IF EXISTS snapshots_require_components ON personalized_pizza_snapshots;
CREATE CONSTRAINT TRIGGER snapshots_require_components AFTER INSERT OR UPDATE ON personalized_pizza_snapshots
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('personalized_pizza_snapshots', 'order_item_id', 'pizza_snapshot_components', 'order_item_id');
DROP TRIGGER IF EXISTS components_preserve_snapshot_components ON pizza_snapshot_components;
CREATE CONSTRAINT TRIGGER components_preserve_snapshot_components AFTER DELETE OR UPDATE ON pizza_snapshot_components
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('personalized_pizza_snapshots', 'order_item_id', 'pizza_snapshot_components', 'order_item_id');

COMMIT;
