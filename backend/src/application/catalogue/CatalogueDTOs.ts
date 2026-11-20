export interface CatalogueMoneyDTO {
	amount: number;
	currency: string;
}

export interface CatalogueRecipeLineDTO {
	componentSku: string;
	defaultQuantity: number;
}

export interface CatalogueSizeVariantDTO {
	pizzaSize: string;
	sizeName: string;
	computedPrice: CatalogueMoneyDTO;
	isAvailable: boolean;
}

export interface CatalogueItemDTO {
	productSku: string;
	name: string;
	description: string;
	categoryName: string;
	allergens: string[];

	/**
	* Present when the product has a direct selling price.
	* Predefined pizzas use size-dependent prices instead.
	*/
	directPrice?: CatalogueMoneyDTO;

	isPredefinedPizza: boolean;
	isAvailable: boolean;

	/**
	* These fields are present only for predefined pizzas.
	*/
	recipeName?: string;
	defaultRecipeLines?: CatalogueRecipeLineDTO[];
	sizeVariants?: CatalogueSizeVariantDTO[];
}

export interface CatalogueFilterQuery {
	categoryName?: string;
	excludeAllergens?: string[];
	availableOnly?: boolean;
}
