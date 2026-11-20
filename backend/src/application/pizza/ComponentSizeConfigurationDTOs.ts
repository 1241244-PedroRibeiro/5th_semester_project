export interface CreateComponentSizeConfigurationDTO {
	componentSku: string;
	pizzaSize: string;
	price: number;
	stockUnitsConsumed?: number;
}

export interface UpdateComponentSizeConfigurationDTO {
	price: number;
	stockUnitsConsumed?: number;
}

export interface ComponentSizeConfigurationResponseDTO {
	id: string;
	componentSku: string;
	productName: string;
	pizzaSize: string;
	sizeName: string;
	price: number;
	stockUnitsConsumed: number | null;
	stockControlled: boolean;
}
