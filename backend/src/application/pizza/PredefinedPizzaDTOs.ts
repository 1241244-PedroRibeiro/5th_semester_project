export interface PredefinedPizzaIdDTO { pizzaSku: string; pizzaSize: string; }
export interface PredefinedPizzaRecipeLineDTO { componentSku: string; defaultQuantity: number; }
export interface CreatePredefinedPizzaDTO {
	pizzaSku: string;
	recipeName: string;
	defaultRecipeLines: PredefinedPizzaRecipeLineDTO[];
	availableSizes: string[];
}
export interface PredefinedPizzaResponseDTO {
	ids: PredefinedPizzaIdDTO[];
	pizzaSku: string;
	recipeName: string;
	defaultRecipeLines: PredefinedPizzaRecipeLineDTO[];
	supportedSizes: string[];
}
