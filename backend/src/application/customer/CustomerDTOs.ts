export interface CustomerContactDTO {
	phone: string;
	email: string;
}

export interface CreateCustomerDTO extends CustomerContactDTO {
	username?: string | null;
	firstName: string;
	lastName: string;
	vatNumber?: string | null;
	marketingConsent?: boolean;
	deliveryAddresses?: CustomerAddressInputDTO[];
	dietaryRestrictions?: CustomerDietaryRestrictionInputDTO[];
}

export interface CustomerAddressInputDTO {
	street: string;
	postalCode: string;
	city: string;
	extraDetails?: string;
	isDefault?: boolean;
}

export interface UpdateCustomerAddressDTO extends CustomerAddressInputDTO { isDefault?: boolean; }

export interface CustomerAddressDTO extends CustomerAddressInputDTO { id: string; isDefault: boolean; }
export interface CustomerDietaryRestrictionInputDTO { allergenId: string; description?: string; }
export interface CustomerDietaryRestrictionDTO { allergenId: string; description: string; recordedAt: string; }

export interface CustomerUpdateDTO {
	firstName: string;
	lastName: string;
	phone: string;
	email: string;
	vatNumber?: string | null;
	marketingConsent?: boolean;
}

export interface CustomerListItemDTO {
	id: string;
	firstName: string;
	lastName: string;
	phone: string;
	email: string;
	vatNumber: string | null;
}

export interface CustomerResponseDTO extends CustomerContactDTO {
	id: string;
	username: string | null;
	firstName: string;
	lastName: string;
	vatNumber: string | null;
	marketingConsent: boolean;
	consentTimestamp: string;
	addresses: CustomerAddressDTO[];
	dietaryRestrictions: CustomerDietaryRestrictionDTO[];
	createdAt: string;
	updatedAt: string;
}
