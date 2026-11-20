import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ResourceLookups } from '../../shared_components/core/api/resource-lookups';
import type { ComponentConfiguration, Product } from '../../shared_components/core/api/models';
import type { Address, CatalogueItem, ContactProfile, UserAllergies } from './storefront-models';

@Injectable({ providedIn: 'root' })
export class StorefrontApi {
	private readonly http = inject(HttpClient);
	private readonly lookups = inject(ResourceLookups);
	catalogue() {
		return this.http.get<CatalogueItem[]>('/api/catalogue');
	}
	products() {
		return this.http.get<Product[]>('/api/products');
	}
	componentTypes() {
		return this.lookups.all('pizza-component-types');
	}
	configurations() {
		return this.http.get<ComponentConfiguration[]>('/api/component-size-configurations');
	}
	allergens() {
		return this.lookups.all('allergens');
	}
	profile() {
		return this.http.get<ContactProfile>('/api/user/me/contact-details');
	}
	userAllergies(username: string) {
		return this.http.get<UserAllergies>(`/api/user/${encodeURIComponent(username)}/allergens`);
	}
	addAllergies(username: string, allergens: string[]) {
		return this.http.post<void>(`/api/user/${encodeURIComponent(username)}/allergen`, {
			allergens,
		});
	}
	saveAddress(address: Address) {
		return this.http.put<ContactProfile>('/api/user/me/address', address);
	}
	savePhone(phoneNumber: string) {
		return this.http.put<ContactProfile>('/api/user/me/phone-number', { phoneNumber });
	}
}
