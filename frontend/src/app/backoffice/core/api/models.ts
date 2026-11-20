import type { Product, User } from '../../../shared_components/core/api/models';

export interface ProfileAddress {
	street: string;
	postalCode: string;
	city: string;
	extraDetails?: string;
}
export interface StaffContactResponse extends User {
	address?: ProfileAddress;
	phoneNumber?: string;
}

export type ProductInput = Omit<Product, 'active' | 'associatedAllergens'>;
export interface Stock {
	productSku: string;
	productName: string;
	currentUnits: number;
	updatedAt: string;
}
export interface RecipeLine {
	componentSku: string;
	defaultQuantity: number;
}
export interface Pizza {
	ids: { pizzaSku: string; pizzaSize: string }[];
	pizzaSku: string;
	recipeName: string;
	defaultRecipeLines: RecipeLine[];
	supportedSizes: string[];
}
export interface PizzaInput {
	pizzaSku: string;
	recipeName: string;
	defaultRecipeLines: RecipeLine[];
	availableSizes: string[];
}
export interface ConfigurationInput {
	componentSku: string;
	pizzaSize: string;
	price: number;
	stockUnitsConsumed?: number;
}
export interface KitchenDimensions {
    x: number;
    y: number;
    z: number;
}


export interface KitchenConfiguration {
    id: string;
    name: string;
    jsonContent: Record<string, any>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface KitchenConfigurationInput {
    name: string;
    jsonContent: Record<string, any>;
}

export interface KitchenConfigurationUpdate {
    name: string;
    jsonContent: Record<string, any>;
}
