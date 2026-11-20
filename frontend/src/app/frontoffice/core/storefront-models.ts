import type { User } from '../../shared_components/core/api/models';

export interface Money {
	amount: number;
	currency: string;
}
export interface SizeVariant {
	pizzaSize: string;
	sizeName: string;
	computedPrice: Money;
	isAvailable: boolean;
}
export interface CatalogueItem {
	productSku: string;
	name: string;
	description: string;
	categoryName: string;
	allergens: string[];
	directPrice?: Money;
	isPredefinedPizza: boolean;
	isAvailable: boolean;
	recipeName?: string;
	defaultRecipeLines?: { componentSku: string; defaultQuantity: number }[];
	sizeVariants?: SizeVariant[];
}
export interface Address {
	street: string;
	postalCode: string;
	city: string;
	extraDetails?: string;
}
export interface ContactProfile extends User {
	address?: Address;
	phoneNumber?: string;
}
export interface UserAllergies {
	username: string;
	allergens: string[];
}
export interface CartIngredient {
	sku: string;
	name: string;
	quantity: number;
	unitPrice: number;
}
export interface CartLine {
	id: string;
	productSku: string;
	name: string;
	size?: string;
	unitPrice: number;
	currency: string;
	quantity: number;
	ingredients: CartIngredient[];
	allergens: string[];
}

export function itemPrice(item: CatalogueItem): Money | null {
	if (item.isPredefinedPizza) {
		const variants = (item.sizeVariants ?? []).filter((v) => v.isAvailable);
		return variants.length
			? variants.reduce(
					(lowest, variant) =>
						variant.computedPrice.amount < lowest.amount ? variant.computedPrice : lowest,
					variants[0].computedPrice,
				)
			: null;
	}
	return item.directPrice ?? null;
}

/**
 * Pictures are served by the backend ImageController (GET /images/:nameOrSku).
 * When an item has no stored picture the backend answers with a default placeholder image.
 */
export function productImage(item: { name: string; productSku?: string }): string {
	return `/api/images/${encodeURIComponent(item.productSku || item.name)}`;
}
