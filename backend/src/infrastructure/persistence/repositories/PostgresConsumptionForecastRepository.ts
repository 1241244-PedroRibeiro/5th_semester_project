import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IConsumptionForecastRepository, ConsumptionForecastDTO } from '../../../application/planning/IConsumptionForecastRepository';

@Injectable()
export class PostgresConsumptionForecastRepository implements IConsumptionForecastRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private toIsoDate(value: unknown): string {
        if (value instanceof Date) return value.toISOString().slice(0, 10);
        const text = String(value ?? '');
        return text.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
    }

    async findByName(name: string): Promise<ConsumptionForecastDTO | null> {
        const forecast: any[] = await this.dataSource.query(`SELECT * FROM consumption_forecasts WHERE name = $1`, [name]);
        if (forecast.length === 0) return null;
        
        const entries: any[] = await this.dataSource.query(
            `SELECT entry_date as date, product_sku as "productSku", pizza_size as "pizzaSize", quantity 
             FROM consumption_forecast_entries WHERE forecast_name = $1`, 
            [name]
        );
        
        return {
            name: forecast[0].name,
            startDate: forecast[0].start_date.toISOString().slice(0, 10),
            endDate: forecast[0].end_date.toISOString().slice(0, 10),
            entries: entries.map((e: any) => ({
                date: this.toIsoDate(e.date),
                productSku: e.productSku,
                pizzaSize: e.pizzaSize,
                quantity: e.quantity
            })),
            pendingDeliveries: forecast[0].pending_deliveries ?? [],
            createdAt: forecast[0].created_at.toISOString(),
            updatedAt: forecast[0].updated_at.toISOString(),
        };
    }

    async findAll(): Promise<ConsumptionForecastDTO[]> {
        const rows: any[] = await this.dataSource.query(
            `SELECT name FROM consumption_forecasts ORDER BY start_date DESC, name`,
        );
        return Promise.all(rows.map((row) => this.findByName(row.name).then((value) => value!)));
    }

    async create(forecast: ConsumptionForecastDTO): Promise<ConsumptionForecastDTO> {
        await this.dataSource.transaction(async (manager) => {
            await manager.query(
                `INSERT INTO consumption_forecasts (name, start_date, end_date, pending_deliveries) VALUES ($1, $2, $3, $4)`,
                [forecast.name, forecast.startDate, forecast.endDate, JSON.stringify(forecast.pendingDeliveries ?? [])],
            );
            for (const entry of forecast.entries) {
                await manager.query(
                    `INSERT INTO consumption_forecast_entries
                     (forecast_name, entry_date, product_sku, pizza_size, quantity)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [forecast.name, entry.date, entry.productSku, entry.pizzaSize ?? null, entry.quantity],
                );
            }
        });
        return (await this.findByName(forecast.name))!;
    }

    async update(name: string, forecast: Omit<ConsumptionForecastDTO, 'name'>): Promise<ConsumptionForecastDTO | null> {
        if (!(await this.findByName(name))) return null;
        await this.dataSource.transaction(async (manager) => {
            await manager.query(
                `UPDATE consumption_forecasts
                 SET start_date = $1, end_date = $2,
                     pending_deliveries = COALESCE($3::jsonb, pending_deliveries), updated_at = NOW()
                 WHERE name = $4`,
                [forecast.startDate, forecast.endDate,
                    forecast.pendingDeliveries === undefined ? null : JSON.stringify(forecast.pendingDeliveries), name],
            );
            await manager.query(`DELETE FROM consumption_forecast_entries WHERE forecast_name = $1`, [name]);
            for (const entry of forecast.entries) {
                await manager.query(
                    `INSERT INTO consumption_forecast_entries
                     (forecast_name, entry_date, product_sku, pizza_size, quantity)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [name, entry.date, entry.productSku, entry.pizzaSize ?? null, entry.quantity],
                );
            }
        });
        return this.findByName(name);
    }

    async delete(name: string): Promise<boolean> {
        const result = await this.dataSource.query(`DELETE FROM consumption_forecasts WHERE name = $1`, [name]);
        return (result?.rowCount ?? result?.affected ?? result?.[1] ?? 0) > 0;
    }

    async hasPizzaSize(name: string): Promise<boolean> {
        const rows: any[] = await this.dataSource.query(`SELECT 1 FROM pizza_sizes WHERE name = $1 LIMIT 1`, [name]);
        return rows.length > 0;
    }
}
