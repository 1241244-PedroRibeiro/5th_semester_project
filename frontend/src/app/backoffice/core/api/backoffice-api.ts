import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ResourceLookups } from '../../../shared_components/core/api/resource-lookups';
import type {
	ComponentConfiguration,
	NamedResource,
	Page,
	Product,
	User,
} from '../../../shared_components/core/api/models';
import type {
    KitchenConfiguration,
    KitchenConfigurationInput,
    KitchenConfigurationUpdate,
} from './models';
import type { CommercialCustomer, CommercialCustomerSummary } from '../../../shared_components/core/api/models';

export interface PlanningRequirement {
	date?: string;
	productSku: string;
	requiredUnits: number;
	availableUnits: number;
	replenishmentUnits: number;
}
export interface PlanningProposal {
	supplierCode: string;
	productSku: string;
	quantity: number;
	expectedDelivery: string;
	priceEur: number;
}
export interface PlanningUnmetNeed {
	date?: string;
	productSku: string;
	reason: string;
	detail?: string;
	quantity?: number;
	shortfallUnits?: number;
	lateByDays?: number;
	lateFulfilledQuantity?: number;
	stillUnmetQuantity?: number;
	lateFulfillments?: Array<{ fulfilledDate: string; quantity: number; lateByDays: number }>;
}
export interface PlanningLateFulfilled {
	dueDate: string;
	fulfilledDate: string;
	productSku: string;
	quantity: number;
	lateByDays: number;
}
export interface PlanningResult {
	executionId: number;
	forecastName: string | null;
	scenarioName: string | null;
	referenceDate: string;
	isReplay: boolean;
	isSimulated: boolean;
	executedAt: string;
	requirements: PlanningRequirement[];
	proposals: PlanningProposal[];
	unmetNeeds: PlanningUnmetNeed[];
	unmetOnTime?: PlanningUnmetNeed[];
	lateFulfilled?: PlanningLateFulfilled[];
}
export interface ForecastEntry {
	date: string;
	productSku: string;
	pizzaSize: string | null;
	quantity: number;
}
export interface ConsumptionForecast {
	name: string;
	startDate: string;
	endDate: string;
	entries: ForecastEntry[];
	createdAt?: string;
	updatedAt?: string;
}
export interface SupplierOffer {
	supplierCode: string;
	productSku: string;
	priceEur: number;
	stockUnitQuantity: number;
	leadTimeDays: number;
	dailySupplyLimit: number | null;
}
export interface SupplierScenario {
	name: string;
	isSimulated: boolean;
	confirmedAt: string | null;
	suppliers: Array<{ supplierCode: string; name: string | null }>;
	offers: SupplierOffer[];
}
import type {
	ConfigurationInput,
	Pizza,
	PizzaInput,
	ProductInput,
	Stock,
	ProfileAddress,
	StaffContactResponse,
} from './models';

export { errorMessage } from '../../../shared_components/core/api/api-errors';

@Injectable({ providedIn: 'root' })
export class BackofficeApi {
	private readonly http = inject(HttpClient);
	private readonly lookups = inject(ResourceLookups);
	products() {
		return this.http.get<Product[]>('/api/products');
	}
	pizzaSizes() {
		return this.http.get<Array<{ name: string }>>('/api/pizza-sizes');
	}
	saveProduct(value: ProductInput, sku?: string) {
		return sku
			? this.http.put<Product>(`/api/products/${encodeURIComponent(sku)}`, value)
			: this.http.post<Product>('/api/products', value);
	}
	/** Uploads (or replaces) the picture of a product or pizza, identified by name or SKU. */
	uploadImage(identifier: string, file: File) {
		const body = new FormData();
		body.append('image', file, file.name);
		return this.http.post<{ sku: string; fileName: string }>(
			`/api/images/${encodeURIComponent(identifier)}`,
			body,
		);
	}
	imageUrl(identifier: string) {
		return `/api/images/${encodeURIComponent(identifier)}`;
	}
	setProductActive(product: Product) {
		return this.http.patch<Product>(
			`/api/products/${encodeURIComponent(product.sku)}/${product.active ? 'block' : 'activate'}`,
			{},
		);
	}
	associateProductAllergen(sku: string, allergenName: string) {
		return this.http.post<Product>(`/api/products/${encodeURIComponent(sku)}/allergens`, {
			allergenName,
		});
	}
	saveOwnAddress(value: ProfileAddress) {
		return this.http.put<StaffContactResponse>('/api/user/me/address', value);
	}
	saveOwnPhone(phoneNumber: string) {
		return this.http.put<StaffContactResponse>('/api/user/me/phone-number', { phoneNumber });
	}
	saveOwnName(value: { firstName: string; lastName: string }) {
		return this.http.put<User>('/api/user/me/name', value);
	}
	saveOwnEmail(value: { email: string; currentPassword: string }) {
		return this.http.put<User>('/api/user/me/email', value);
	}
	saveOwnPassword(value: { currentPassword: string; newPassword: string }) {
		return this.http.put<User>('/api/user/me/password', value);
	}
	stock(filters: { active?: boolean } = {}) {
		return this.http.get<Stock[]>('/api/stock', { params: filters });
	}
	executePlanning(value: {
		forecastName: string;
		scenarioName: string;
		referenceDate?: string;
	}) {
		return this.http.post<PlanningResult>('/api/planning/executions', value);
	}
	planningHistory() {
		return this.http.get<PlanningResult[]>('/api/planning/executions');
	}
	replayExecution(executionId: number) {
		return this.http.post<PlanningResult>(`/api/planning/executions/${executionId}/replay`, {});
	}
	forecasts() {
		return this.http.get<ConsumptionForecast[]>('/api/consumption-forecasts');
	}
	saveForecast(value: Omit<ConsumptionForecast, 'createdAt' | 'updatedAt'>, originalName?: string) {
		return originalName
			? this.http.put<ConsumptionForecast>(`/api/consumption-forecasts/${encodeURIComponent(originalName)}`, value)
			: this.http.post<ConsumptionForecast>('/api/consumption-forecasts', value);
	}
	deleteForecast(name: string) {
		return this.http.delete<void>(`/api/consumption-forecasts/${encodeURIComponent(name)}`);
	}
	scenarios() {
		return this.http.get<SupplierScenario[]>('/api/supplier-scenarios');
	}
	saveScenario(value: Omit<SupplierScenario, 'confirmedAt'>, originalName?: string) {
		return originalName
			? this.http.put<SupplierScenario>(`/api/supplier-scenarios/${encodeURIComponent(originalName)}`, value)
			: this.http.post<SupplierScenario>('/api/supplier-scenarios', value);
	}
	deleteScenario(name: string) {
		return this.http.delete<void>(`/api/supplier-scenarios/${encodeURIComponent(name)}`);
	}
	confirmScenario(name: string) {
		return this.http.post<SupplierScenario>(`/api/supplier-scenarios/${encodeURIComponent(name)}/confirm`, {});
	}
	productExport() {
		return this.http.get<unknown>('/api/products/export');
	}
	increaseStock(sku: string, amount: number) {
		return this.adjustStock(sku, 'INCREASE', amount);
	}
	adjustStock(sku: string, adjustmentType: 'INCREASE' | 'DECREASE', amount: number) {
		return this.http.post<Stock>(`/api/stock/${encodeURIComponent(sku)}/adjustments`, {
			adjustmentType,
			amount,
			reason: 'Backoffice adjustment',
		});
	}
	users(page: number, pageSize: number, role = '') {
		return this.http.get<Page<User>>(
			`/api/users${role ? '/filter/role/' + encodeURIComponent(role) : ''}`,
			{ params: { page, pageSize } },
		);
	}
	customers(page: number, pageSize: number, search = '') {
		return this.http.get<Page<CommercialCustomerSummary>>('/api/customers', { params: { page, pageSize, search } });
	}
	customer(id: string) {
		return this.http.get<CommercialCustomer>(`/api/customers/${encodeURIComponent(id)}`);
	}
	createCustomer(value: Omit<CommercialCustomer, 'id' | 'createdAt' | 'updatedAt' | 'consentTimestamp' | 'addresses' | 'dietaryRestrictions' | 'username'> & {
		username?: string | null; deliveryAddresses?: Array<{ street: string; postalCode: string; city: string; extraDetails?: string; isDefault?: boolean }>;
	}) {
		return this.http.post<CommercialCustomer>('/api/customers', value);
	}
	updateCustomer(id: string, value: Pick<CommercialCustomer, 'firstName' | 'lastName' | 'phone' | 'email' | 'vatNumber' | 'marketingConsent'>) {
		return this.http.put<CommercialCustomer>(`/api/customers/${encodeURIComponent(id)}`, value);
	}
	deleteCustomer(id: string) {
		return this.http.delete<void>(`/api/customers/${encodeURIComponent(id)}`);
	}
	linkCustomerUser(id: string, username: string | null) {
		return this.http.put<CommercialCustomer>(`/api/customers/${encodeURIComponent(id)}/user`, { username });
	}
	updateCustomerDietaryRestrictions(id: string, dietaryRestrictions: Array<{ allergenId: string; description?: string }>) {
		return this.http.put<CommercialCustomer>(`/api/customers/${encodeURIComponent(id)}/dietary-restrictions`, { dietaryRestrictions });
	}
	addCustomerAddress(id: string, address: { street: string; postalCode: string; city: string; extraDetails?: string; isDefault?: boolean }) {
		return this.http.post<CommercialCustomer>(`/api/customers/${encodeURIComponent(id)}/addresses`, address);
	}
	updateCustomerAddress(id: string, addressId: string, address: { street: string; postalCode: string; city: string; extraDetails?: string; isDefault?: boolean }) {
		return this.http.put<CommercialCustomer>(`/api/customers/${encodeURIComponent(id)}/addresses/${encodeURIComponent(addressId)}`, address);
	}
	deleteCustomerAddress(id: string, addressId: string) {
		return this.http.delete<CommercialCustomer>(`/api/customers/${encodeURIComponent(id)}/addresses/${encodeURIComponent(addressId)}`);
	}
	setDefaultCustomerAddress(id: string, addressId: string) {
		return this.http.put<CommercialCustomer>(`/api/customers/${encodeURIComponent(id)}/addresses/${encodeURIComponent(addressId)}/default`, {});
	}
	invite(value: { email: string; roleName: string }) {
		return this.http.post<User>('/api/auth/invite', value);
	}
	setUserRoles(username: string, roles: string[]) {
		return this.http.put<User>(`/api/user/${encodeURIComponent(username)}/roles`, { roles });
	}

	reactivateUser(username: string) {
		return this.http.post<void>(`/api/user/${encodeURIComponent(username)}/reactivate`, {});
	}

	deactivateUser(username: string) {
		return this.http.delete<void>(`/api/user/${encodeURIComponent(username)}`);
	}
	resources(path: string, page = 1, pageSize = 10, search?: string) {
		return this.lookups.page(path, page, pageSize, search);
	}
	/** Fetch every page for form options through the shared lookup service. */
	allResources(path: string) {
		return this.lookups.all(path);
	}
	saveResource(path: string, value: NamedResource, original?: string) {
		const body =
			path === 'categories' && !original
				? {
						categoryName: value.name,
						...(value.description !== undefined ? { description: value.description } : {}),
					}
				: value;
		return original
			? this.http.put<NamedResource>(`/api/${path}/${encodeURIComponent(original)}`, body)
			: this.http.post<NamedResource>(`/api/${path}`, body);
	}
	deleteResource(path: string, name: string) {
		return this.http.delete<{ message: string }>(`/api/${path}/${encodeURIComponent(name)}`);
	}
	pizzas() {
		return this.http.get<Pizza[]>('/api/predefined-pizzas');
	}
	createPizza(value: PizzaInput) {
		return this.http.post<Pizza>('/api/predefined-pizzas', value);
	}
	updatePizza(value: PizzaInput) {
		const { pizzaSku, ...body } = value;
		return this.http.put<Pizza>(`/api/predefined-pizzas/${encodeURIComponent(pizzaSku)}`, body);
	}
	pizza(sku: string) {
		return this.http.get<Pizza>(`/api/predefined-pizzas/${encodeURIComponent(sku)}`);
	}
	configurations() {
		return this.http.get<ComponentConfiguration[]>('/api/component-size-configurations');
	}
	saveConfiguration(value: ConfigurationInput, id?: string) {
		return id
			? this.http.put<ComponentConfiguration>(
					`/api/component-size-configurations/${encodeURIComponent(id)}`,
					{ price: value.price, stockUnitsConsumed: value.stockUnitsConsumed },
				)
			: this.http.post<ComponentConfiguration>('/api/component-size-configurations', value);
	}
	deleteConfiguration(id: string) {
		return this.http.delete<void>(`/api/component-size-configurations/${encodeURIComponent(id)}`);
	}
	// ========================================
// KITCHEN CONFIGURATIONS - WEB06
// ========================================


// ========================================
// KITCHEN CONFIGURATIONS - WEB06
// ========================================

	kitchenConfigurations() {
		return this.http.get<KitchenConfiguration[]>(
			'/api/kitchen-configurations'
		);
	}

	kitchenConfiguration(id: string) {
		return this.http.get<KitchenConfiguration>(
			`/api/kitchen-configurations/${encodeURIComponent(id)}`
		);
	}

	createKitchenConfiguration(value: KitchenConfigurationInput) {
		return this.http.post<KitchenConfiguration>(
			'/api/kitchen-configurations',
			value
		);
	}

	updateKitchenConfiguration(
		id: string,
		value: KitchenConfigurationUpdate
	) {
		return this.http.put<KitchenConfiguration>(
			`/api/kitchen-configurations/${encodeURIComponent(id)}`,
			value
		);
	}

	deleteKitchenConfiguration(id: string) {
		return this.http.delete<void>(
			`/api/kitchen-configurations/${encodeURIComponent(id)}`
		);
	}

	activateKitchenConfiguration(id: string) {
		return this.http.post<KitchenConfiguration>(
			`/api/kitchen-configurations/${encodeURIComponent(id)}/activate`,
			{}
		);
	}

	activeKitchenConfiguration() {
		return this.http.get<KitchenConfiguration>(
			'/api/kitchen-configurations/active'
		);
	}

}
