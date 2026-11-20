BEGIN;

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_name ON users (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role ON user_role_assignments (role_name);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_default_address ON customer_addresses (customer_id) WHERE is_default;
CREATE INDEX IF NOT EXISTS idx_user_dietary_allergen ON user_dietary_restrictions (allergen_name);
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_name);
CREATE INDEX IF NOT EXISTS idx_products_component_type ON products (component_type_name);
CREATE INDEX IF NOT EXISTS idx_product_allergens_allergen ON product_allergens (allergen_name);
CREATE INDEX IF NOT EXISTS idx_stock_items_units ON stock_items (current_units);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod_date ON stock_movements (product_sku, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_configurations_size ON component_size_configurations (pizza_size);
CREATE INDEX IF NOT EXISTS idx_pizza_recipes_component ON predefined_pizza_recipes (component_product_sku);
CREATE INDEX IF NOT EXISTS idx_predefined_pizzas_size ON predefined_pizzas (pizza_size);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON customer_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (catalogue_product_sku);
CREATE INDEX IF NOT EXISTS idx_snapshot_components_product ON pizza_snapshot_components (component_product_sku);
CREATE INDEX IF NOT EXISTS idx_snapshot_allergens_allergen ON pizza_snapshot_allergens (allergen_name);
CREATE INDEX IF NOT EXISTS idx_preparation_activities_order ON preparation_activities (order_id, order_item_id);
CREATE INDEX IF NOT EXISTS idx_preparation_activities_resource ON preparation_activities (allocated_resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_dependencies_prerequisite ON activity_dependencies (depends_on_activity_id);

COMMIT;
