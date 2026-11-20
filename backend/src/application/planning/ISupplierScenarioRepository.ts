export interface SupplierOfferDTO {
    supplierCode: string;
    productSku: string;
    priceEur: number;
    stockUnitQuantity: number;
    leadTimeDays: number;
    dailySupplyLimit: number | null;
}
export interface SupplierDTO {
    supplierCode: string;
    name: string;
}
export interface SupplierScenarioDTO {
    name: string;
    isSimulated: boolean;
    confirmedAt: string | null;
    suppliers: SupplierDTO[];
    offers: SupplierOfferDTO[];
}
export const SUPPLIER_SCENARIO_REPOSITORY = 'ISupplierScenarioRepository';
export interface ISupplierScenarioRepository {
    findByName(name: string): Promise<SupplierScenarioDTO | null>;
    findAll(): Promise<SupplierScenarioDTO[]>;
    create(scenario: SupplierScenarioDTO): Promise<SupplierScenarioDTO>;
    update(name: string, scenario: Omit<SupplierScenarioDTO, 'name' | 'confirmedAt'>): Promise<SupplierScenarioDTO | null>;
    delete(name: string): Promise<boolean>;
    confirm(name: string): Promise<SupplierScenarioDTO | null>;
}