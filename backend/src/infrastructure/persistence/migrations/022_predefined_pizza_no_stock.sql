BEGIN;

-- A product backing a predefined pizza must not be stock-controlled
-- (Clarification #35). App-layer enforcement is primary; this DB check
-- is defence-in-depth. `NOT VALID` accepts legacy rows without failing.
ALTER TABLE products
    ADD CONSTRAINT chk_predefined_pizza_not_stock_controlled
    CHECK (
        sku NOT IN (SELECT sku FROM predefined_pizzas)
        OR is_stock_controlled = FALSE
    ) NOT VALID;

-- After confirming no pre-existing violations, run:
-- ALTER TABLE products VALIDATE CONSTRAINT chk_predefined_pizza_not_stock_controlled;

COMMIT;