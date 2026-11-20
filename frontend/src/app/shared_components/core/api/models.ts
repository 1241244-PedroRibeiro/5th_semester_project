export interface Page<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}
export interface User {
	username: string;
	firstName: string;
	lastName: string;
	email: string;
	roles: string[];
	status: string;
	createdAt: string;
}
export interface CommercialCustomerAddress {
	id: string;
	street: string;
	postalCode: string;
	city: string;
	extraDetails: string;
	isDefault: boolean;
}
export interface CommercialCustomerRestriction { allergenId: string; description: string; recordedAt: string; }
export interface CommercialCustomerSummary {
	id: string;
	firstName: string;
	lastName: string;
	phone: string;
	email: string;
	vatNumber: string | null;
}
export interface CommercialCustomer extends CommercialCustomerSummary {
	username: string | null;
	marketingConsent: boolean;
	consentTimestamp: string;
	addresses: CommercialCustomerAddress[];
	dietaryRestrictions: CommercialCustomerRestriction[];
	createdAt: string;
	updatedAt: string;
}
export interface Session {
	token: string;
	refreshToken: string;
	user: User;
}
export interface Product {
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
export interface NamedResource {
	name: string;
	description?: string;
	active?: boolean;
	assemblyOrder?: number;
	minCardinality?: number;
	maxCardinality?: number | null;
}
export interface ComponentConfiguration {
	id: string;
	componentSku: string;
	productName: string;
	pizzaSize: string;
	sizeName: string;
	price: number;
	stockUnitsConsumed: number | null;
	stockControlled: boolean;
}
