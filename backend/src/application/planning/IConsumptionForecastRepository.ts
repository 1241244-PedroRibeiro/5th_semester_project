export interface ForecastEntryDTO {
    date: string;
    productSku: string;
    pizzaSize: string | null;
    quantity: number;
}
export interface ConsumptionForecastDTO {
    name: string;
    startDate: string;
    endDate: string;
    entries: ForecastEntryDTO[];
    pendingDeliveries?: Array<{ productSku: string; quantity: number; expectedDeliveryDate: string }>;
    createdAt?: string;
    updatedAt?: string;
}
export const CONSUMPTION_FORECAST_REPOSITORY = 'IConsumptionForecastRepository';
export interface IConsumptionForecastRepository {
    findByName(name: string): Promise<ConsumptionForecastDTO | null>;
    findAll(): Promise<ConsumptionForecastDTO[]>;
    create(forecast: ConsumptionForecastDTO): Promise<ConsumptionForecastDTO>;
    update(name: string, forecast: Omit<ConsumptionForecastDTO, 'name'>): Promise<ConsumptionForecastDTO | null>;
    delete(name: string): Promise<boolean>;
    hasPizzaSize(name: string): Promise<boolean>;
}
