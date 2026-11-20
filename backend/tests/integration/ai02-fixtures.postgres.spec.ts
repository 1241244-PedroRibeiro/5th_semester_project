import { createTestDatabase, postgres } from '../helpers/postgres';

postgres('AI02 fixture migrations', () => {
    let database: Awaited<ReturnType<typeof createTestDatabase>>;

    beforeAll(async () => { database = await createTestDatabase(false); });
    afterAll(async () => { await database?.close(); });

    it('migrates an empty database without relying on the optional development seed', async () => {
        const source = database.dataSource;
        expect(await source.showMigrations()).toBe(false);
        expect(await source.query(`
            SELECT entry.product_sku, entry.quantity, size.stock_units_consumed, stock.current_units
            FROM consumption_forecast_entries entry
            JOIN predefined_pizza_recipes recipe ON recipe.pizza_sku = entry.product_sku
            JOIN component_size_configurations size
                ON size.product_sku = recipe.component_product_sku AND size.pizza_size = entry.pizza_size
            JOIN stock_items stock ON stock.product_sku = recipe.component_product_sku
            WHERE entry.forecast_name = 'Week-45' AND recipe.component_product_sku = 'PRD-MOZZ'
            ORDER BY entry.entry_date
        `)).toEqual([
            { product_sku: 'PIZ-MARGHERITA', quantity: 10, stock_units_consumed: 2, current_units: 10 },
            { product_sku: 'PIZ-MARGHERITA', quantity: 15, stock_units_consumed: 2, current_units: 10 },
        ]);
        expect(await source.query(`
            SELECT sku, is_active, stock_units_per_sale FROM products
            WHERE sku IN ('PRD-INACTIVE', 'PRD-MISSING-UNITS') ORDER BY sku
        `)).toEqual([
            { sku: 'PRD-INACTIVE', is_active: false, stock_units_per_sale: null },
            { sku: 'PRD-MISSING-UNITS', is_active: true, stock_units_per_sale: null },
        ]);
        expect(await source.runMigrations()).toEqual([]);
    });
});
