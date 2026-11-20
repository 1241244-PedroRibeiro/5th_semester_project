import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ISupplierScenarioRepository, SupplierScenarioDTO } from '../../../application/planning/ISupplierScenarioRepository';

@Injectable()
export class PostgresSupplierScenarioRepository implements ISupplierScenarioRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    async findByName(name: string): Promise<SupplierScenarioDTO | null> {
        const scenario: any[] = await this.dataSource.query(`SELECT * FROM supplier_scenarios WHERE name = $1`, [name]);
        if (scenario.length === 0) return null;
        
        const suppliers: any[] = await this.dataSource.query(
            `SELECT supplier_code as "supplierCode", name FROM suppliers WHERE scenario_name = $1`, 
            [name]
        );
        
        const offers: any[] = await this.dataSource.query(
            `SELECT supplier_code as "supplierCode", product_sku as "productSku", price_amount as "priceEur", 
                    stock_unit_quantity as "stockUnitQuantity", lead_time_days as "leadTimeDays", daily_supply_limit as "dailySupplyLimit" 
             FROM supplier_offers WHERE scenario_name = $1`, 
            [name]
        );
        
        return {
            name: scenario[0].name,
            isSimulated: scenario[0].is_simulated,
            confirmedAt: scenario[0].confirmed_at ? scenario[0].confirmed_at.toISOString() : null,
            suppliers: suppliers.map((s: any) => ({ supplierCode: s.supplierCode, name: s.name })),
            offers: offers.map((o: any) => ({
                supplierCode: o.supplierCode,
                productSku: o.productSku,
                priceEur: parseFloat(o.priceEur),
                stockUnitQuantity: o.stockUnitQuantity,
                leadTimeDays: o.leadTimeDays,
                dailySupplyLimit: o.dailySupplyLimit
            }))
        };
    }

    async findAll(): Promise<SupplierScenarioDTO[]> {
        const rows: any[] = await this.dataSource.query(`SELECT name FROM supplier_scenarios ORDER BY name`);
        return Promise.all(rows.map((row) => this.findByName(row.name).then((value) => value!)));
    }

    async create(scenario: SupplierScenarioDTO): Promise<SupplierScenarioDTO> {
        await this.dataSource.transaction(async (manager) => {
            await manager.query(
                `INSERT INTO supplier_scenarios (name, is_simulated) VALUES ($1, $2)`,
                [scenario.name, scenario.isSimulated],
            );
            for (const supplier of scenario.suppliers) {
                await manager.query(
                    `INSERT INTO suppliers (scenario_name, supplier_code, name) VALUES ($1, $2, $3)`,
                    [scenario.name, supplier.supplierCode, supplier.name ?? null],
                );
            }
            for (const offer of scenario.offers) {
                await manager.query(
                    `INSERT INTO supplier_offers
                     (scenario_name, supplier_code, product_sku, price_amount, stock_unit_quantity, lead_time_days, daily_supply_limit)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [scenario.name, offer.supplierCode, offer.productSku, offer.priceEur,
                        offer.stockUnitQuantity, offer.leadTimeDays, offer.dailySupplyLimit ?? null],
                );
            }
        });
        return (await this.findByName(scenario.name))!;
    }

    async update(name: string, scenario: Omit<SupplierScenarioDTO, 'name' | 'confirmedAt'>): Promise<SupplierScenarioDTO | null> {
        const current = await this.findByName(name);
        if (!current) return null;
        await this.dataSource.transaction(async (manager) => {
            await manager.query(`UPDATE supplier_scenarios SET is_simulated = $1, confirmed_at = NULL WHERE name = $2`, [scenario.isSimulated, name]);
            await manager.query(`DELETE FROM suppliers WHERE scenario_name = $1`, [name]);
            for (const supplier of scenario.suppliers) {
                await manager.query(`INSERT INTO suppliers (scenario_name, supplier_code, name) VALUES ($1, $2, $3)`, [name, supplier.supplierCode, supplier.name ?? null]);
            }
            for (const offer of scenario.offers) {
                await manager.query(
                    `INSERT INTO supplier_offers
                     (scenario_name, supplier_code, product_sku, price_amount, stock_unit_quantity, lead_time_days, daily_supply_limit)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [name, offer.supplierCode, offer.productSku, offer.priceEur, offer.stockUnitQuantity, offer.leadTimeDays, offer.dailySupplyLimit ?? null],
                );
            }
        });
        return this.findByName(name);
    }

    async delete(name: string): Promise<boolean> {
        const result = await this.dataSource.query(`DELETE FROM supplier_scenarios WHERE name = $1`, [name]);
        return (result?.rowCount ?? result?.affected ?? result?.[1] ?? 0) > 0;
    }

    async confirm(name: string): Promise<SupplierScenarioDTO | null> {
        const scenario = await this.findByName(name);
        if (!scenario) return null;
        if (scenario.offers.length === 0) throw new Error('A scenario must contain at least one supplier offer');
        await this.dataSource.query(`UPDATE supplier_scenarios SET confirmed_at = NOW() WHERE name = $1`, [name]);
        return this.findByName(name);
    }
}