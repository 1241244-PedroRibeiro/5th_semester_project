export interface CreateProductDTO {
	sku: string;
	name: string;
	description: string;
	categoryName: string;
	isSellable: boolean;
	isPizzaComponent: boolean;
	isStockControlled: boolean;
	componentTypeName?: string;
	directSellingPrice?: number | null;
}
export interface UpdateProductDTO {
	name: string;
	description: string;
	categoryName?: string;
	isSellable?: boolean;
	isPizzaComponent?: boolean;
	isStockControlled?: boolean;
	componentTypeName?: string;
	directSellingPrice?: number | null;
	active?: boolean;
}
export interface ProductResponseDTO {
	sku: string;
	name: string;
	description: string;
	categoryName: string;
	isSellable: boolean;
	isPizzaComponent: boolean;
	isStockControlled: boolean;
	componentTypeName: string | null;
	directSellingPrice: number | null;
	active: boolean;
	associatedAllergens: string[];
}
export interface ProductFilterQuery {
	categoryName?: string;
	allergenName?: string;
	componentTypeName?: string;
	name?: string;
	activeOnly?: boolean;
}
