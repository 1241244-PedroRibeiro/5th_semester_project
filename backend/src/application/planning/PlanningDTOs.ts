export interface BomOrderDTO {
    productSku: string;
    pizzaSize?: string;
    quantity: number;
}

export interface BomExecutionRequestDTO {
    orders: BomOrderDTO[];
    scenarioName?: string | null;
    referenceDate?: string | null;
    isSimulated: boolean;
    source: 'simulated' | 'fromForecast';
}

export interface PlanningExecutionRequestDTO {
    forecastName: string;
    scenarioName: string;
    referenceDate?: string;
    pendingDeliveries?: PendingDeliveryDTO[];
}

export interface ForecastEntryInputDTO {
    date: string;
    productSku: string;
    pizzaSize?: string | null;
    quantity: number;
}

export interface ForecastInputDTO {
    name: string;
    startDate: string;
    endDate: string;
    entries: ForecastEntryInputDTO[];
    pendingDeliveries?: PendingDeliveryDTO[];
}

export interface SupplierOfferInputDTO {
    supplierCode: string;
    productSku: string;
    priceEur: number;
    stockUnitQuantity: number;
    leadTimeDays: number;
    dailySupplyLimit?: number | null;
}

export interface SupplierScenarioInputDTO {
    name: string;
    isSimulated: boolean;
    suppliers: Array<{ supplierCode: string; name?: string | null }>;
    offers: SupplierOfferInputDTO[];
}

export interface PendingDeliveryDTO {
    productSku: string;
    quantity: number;
    expectedDeliveryDate: string;
}

export interface PlanningRequirementDTO {
    date?: string; // Opcional para AI01, obrigatório para AI02
    productSku: string;
    requiredUnits: number;
    availableUnits: number;
    hypotheticalRemainingUnits: number;
    replenishmentUnits: number;
}

export interface PurchaseProposalDTO {
    supplierCode: string;
    productSku: string;
    quantity: number;
    orderDate: string;
    expectedDelivery: string;
    priceEur: number;
    meetsRequiredDate: boolean;
    lateByDays: number;
}

export interface UnmetNeedDTO {
    date?: string;
    productSku: string;
    reason: string;
    detail?: string;
    shortfallUnits?: number;
    quantity?: number;
    lateByDays?: number;
    lateFulfilledQuantity?: number;
    stillUnmetQuantity?: number;
    lateFulfillments?: Array<{ fulfilledDate: string; quantity: number; lateByDays: number }>;
}

export interface LateFulfilledDTO {
    dueDate: string;
    fulfilledDate: string;
    productSku: string;
    quantity: number;
    lateByDays: number;
}

export interface PlanningResultResponseDTO {
    executionId: number;
    forecastName: string | null;
    scenarioName: string | null;
    referenceDate: string;
    isReplay: boolean;
    isSimulated: boolean;
    executedAt: string;
    requirements: PlanningRequirementDTO[];
    proposals: PurchaseProposalDTO[];
    unmetNeeds: UnmetNeedDTO[];
    unmetOnTime?: UnmetNeedDTO[];
    lateFulfilled?: LateFulfilledDTO[];
}

export interface PrologProductDTO {
    sku: string;
    name: string;
    category: string;
    isPizzaComponent: boolean;
    isStockControlled: boolean;
    isSellable: boolean;
    componentTypeName: string | null;
    stockUnitsPerSale: number | null;
    currentStock: number;
    isActive: boolean;
}

export interface PrologComponentConfigDTO {
    componentSku: string;
    pizzaSize: string;
    stockUnitsConsumed: number;
}

export interface PrologRecipeLineDTO {
    componentSku: string;
    defaultQuantity: number;
}

export interface PrologBomDTO {
    pizzaSku: string;
    recipeName: string;
    lines: PrologRecipeLineDTO[];
}

export interface PrologRequestDTO {
    executionType: 'BOM' | 'REQUIREMENTS_PLANNING';
    referenceDate: string;
    isSimulated?: boolean;
    orders?: BomOrderDTO[];
    products: PrologProductDTO[];
    componentSizeConfigurations: PrologComponentConfigDTO[];
    boms: PrologBomDTO[];
    forecast?: {
        name: string;
        startDate: string;
        endDate: string;
        entries: any[];
        pendingDeliveries?: PendingDeliveryDTO[];
    };
    scenario?: { name: string; suppliers: any[]; offers: any[] };
    pendingDeliveries?: PendingDeliveryDTO[];
}

export interface PrologResponseDTO {
    requirements: PlanningRequirementDTO[];
    proposals?: PurchaseProposalDTO[];
    unmetNeeds: UnmetNeedDTO[];
    unmetOnTime?: UnmetNeedDTO[];
    lateFulfilled?: LateFulfilledDTO[];
}
