BEGIN;

-- =====================================================================
-- 1. SPRINT 2: IDENTITY & ACCESS (AA01-AA07)
-- =====================================================================

-- Modify users table for OIDC integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_idp_subject VARCHAR;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Activation Invitations (AA06, AA07)
-- Business Key: token (the unique invitation identifier)
CREATE TABLE IF NOT EXISTS activation_invitations (
    token VARCHAR PRIMARY KEY,
    username VARCHAR NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    purpose VARCHAR NOT NULL CHECK (purpose IN ('LOCAL_ACCOUNT_ACTIVATION', 'EXTERNAL_IDP_MATCH', 'PASSWORD_RESET')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role Change Logs (AA06 Audit)
-- Business Key: auto-incrementing ID (since logs have no natural business code)
CREATE TABLE IF NOT EXISTS role_change_logs (
    log_id SERIAL PRIMARY KEY,
    actor_username VARCHAR NOT NULL,
    target_username VARCHAR NOT NULL,
    previous_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    new_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    reason VARCHAR,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 2. SPRINT 2: CATALOGUE EXTENSIONS
-- =====================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_units_per_sale INT;
ALTER TABLE products ADD CONSTRAINT chk_stock_units_per_sale CHECK (stock_units_per_sale IS NULL OR stock_units_per_sale >= 0);

-- =====================================================================
-- 3. SPRINT 2: KITCHEN CONFIGURATION (WEB06, VIS)
-- =====================================================================

-- Business Key: name (e.g., "Standard Layout", "Summer Layout")
CREATE TABLE IF NOT EXISTS kitchen_configurations (
    name VARCHAR PRIMARY KEY,
    json_content JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_kitchen_configuration 
ON kitchen_configurations (is_active) 
WHERE is_active = TRUE;

-- =====================================================================
-- 4. SPRINT 2: AI PLANNING ENGINE (WEB07, AI01, AI02, AI06)
-- =====================================================================

-- Consumption Forecasts
-- Business Key: name (e.g., "Week 1 Forecast")
CREATE TABLE IF NOT EXISTS consumption_forecasts (
    name VARCHAR PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_forecast_dates CHECK (start_date <= end_date)
);

-- Business Keys: forecast_name, product_sku, pizza_size
CREATE TABLE IF NOT EXISTS consumption_forecast_entries (
    forecast_name VARCHAR NOT NULL REFERENCES consumption_forecasts(name) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    product_sku VARCHAR NOT NULL REFERENCES products(sku) ON DELETE RESTRICT,
    pizza_size VARCHAR REFERENCES pizza_sizes(name) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity >= 0),
    PRIMARY KEY (forecast_name, entry_date, product_sku, pizza_size)
);

-- Supplier Scenarios
-- Business Key: name (e.g., "Primary Vendors", "Fallback Vendors")
CREATE TABLE IF NOT EXISTS supplier_scenarios (
    name VARCHAR PRIMARY KEY,
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business Keys: scenario_name, supplier_code
CREATE TABLE IF NOT EXISTS suppliers (
    scenario_name VARCHAR NOT NULL REFERENCES supplier_scenarios(name) ON DELETE CASCADE,
    supplier_code VARCHAR NOT NULL,
    name VARCHAR,
    PRIMARY KEY (scenario_name, supplier_code)
);

-- Business Keys: scenario_name, supplier_code, product_sku
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
);

-- Planning Results (Immutable Snapshots)
-- Business Key: execution_id (auto-incrementing serial)
CREATE TABLE IF NOT EXISTS planning_results (
    execution_id SERIAL PRIMARY KEY,
    forecast_name VARCHAR REFERENCES consumption_forecasts(name) ON DELETE SET NULL,
    scenario_name VARCHAR REFERENCES supplier_scenarios(name) ON DELETE SET NULL,
    reference_date DATE NOT NULL,
    is_replay BOOLEAN NOT NULL DEFAULT FALSE,
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    forecast_snapshot JSONB NOT NULL,
    scenario_snapshot JSONB NOT NULL,
    stock_snapshot JSONB NOT NULL,
    requirements JSONB NOT NULL,
    proposals JSONB NOT NULL,
    unmet_needs JSONB NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;