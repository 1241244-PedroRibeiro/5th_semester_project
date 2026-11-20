BEGIN;

CREATE TABLE IF NOT EXISTS kitchen_resources (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR NOT NULL,
	resource_type VARCHAR NOT NULL,
	capacity_slots INT NOT NULL CHECK (capacity_slots >= 0),
	operational BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS preparation_activities (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE RESTRICT,
	order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
	activity_type VARCHAR NOT NULL,
	expected_duration_seconds INT NOT NULL CHECK (expected_duration_seconds >= 0),
	status VARCHAR NOT NULL CHECK (status IN ('WAITING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED')),
	allocated_resource_id UUID REFERENCES kitchen_resources(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS activity_dependencies (
	activity_id UUID NOT NULL REFERENCES preparation_activities(id) ON DELETE CASCADE,
	depends_on_activity_id UUID NOT NULL REFERENCES preparation_activities(id) ON DELETE RESTRICT,
	PRIMARY KEY (activity_id, depends_on_activity_id)
);

COMMIT;
