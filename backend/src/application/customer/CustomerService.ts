import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AllergenName } from '../../domain/allergen/AllergenName';
import { Email } from '../../domain/common/Email';
import { requireBoolean, requireText } from '../../domain/common/Guard';
import { Page, PageRequest } from '../../domain/common/Pagination';
import { PersonName } from '../../domain/common/PersonName';
import { Timestamp } from '../../domain/common/Timestamp';
import { AddressId } from '../../domain/customer/AddressId';
import { ConsentPreferences } from '../../domain/customer/ConsentPreferences';
import { ContactInformation } from '../../domain/customer/ContactInformation';
import { Customer } from '../../domain/customer/Customer';
import { CustomerDietaryRestriction } from '../../domain/customer/CustomerDietaryRestriction';
import { CustomerId } from '../../domain/customer/CustomerId';
import { DeliveryAddress } from '../../domain/customer/DeliveryAddress';
import { PhoneNumber } from '../../domain/customer/PhoneNumber';
import { VatNumber } from '../../domain/customer/VatNumber';
import { Username } from '../../domain/user/Username';
import { IUserRepository, USER_REPOSITORY } from '../auth/IUserRepository';
import { AllergenService } from '../allergen/AllergenService';
import {
	CreateCustomerDTO, CustomerAddressInputDTO, CustomerContactDTO,
	CustomerDietaryRestrictionInputDTO, CustomerListItemDTO, CustomerResponseDTO,
	CustomerUpdateDTO, UpdateCustomerAddressDTO,
} from './CustomerDTOs';
import { CustomerPersistenceConflictError, CustomerReferencedByOrdersError } from './CustomerErrors';
import { CUSTOMER_DIRECTORY_REPOSITORY, ICustomerDirectoryRepository } from './ICustomerDirectoryRepository';
import { CUSTOMER_REPOSITORY, ICustomerRepository } from './ICustomerRepository';

@Injectable()
export class CustomerService {
	constructor(
		@Inject(CUSTOMER_REPOSITORY) private readonly customerRepo: ICustomerRepository,
		@Inject(CUSTOMER_DIRECTORY_REPOSITORY) private readonly directoryRepo: ICustomerDirectoryRepository,
		@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
		@Inject('AllergenService') private readonly allergenService: AllergenService,
	) {}

	async searchCustomers(search: string | undefined, page = 1, pageSize = PageRequest.DEFAULT_PAGE_SIZE): Promise<Page<CustomerListItemDTO>> {
		return this.directoryRepo.search(search, PageRequest.create(page, pageSize));
	}

	async createCustomer(dto: CreateCustomerDTO): Promise<CustomerResponseDTO> {
		const now = Timestamp.create(new Date());
		const contactInfo = this.toContactInformation(dto);
		if (await this.customerRepo.findByEmail(contactInfo.email.address))
			throw new ConflictException('A customer with this email already exists.');
		const username = dto.username == null || dto.username === '' ? undefined : Username.create(dto.username);
		if (username) await this.assertUserCanBeLinked(username, contactInfo.email.address);
		const name = this.toPersonName(dto.firstName, dto.lastName);
		if (dto.deliveryAddresses !== undefined && !Array.isArray(dto.deliveryAddresses))
			throw new BadRequestException('deliveryAddresses must be an array.');
		const addresses = (dto.deliveryAddresses ?? []).map((address, index) => {
			if (!address || typeof address !== 'object' || Array.isArray(address))
				throw new BadRequestException('Each delivery address must be an object.');
			return this.toAddress(address, address.isDefault ?? index === 0);
		});
		const restrictions = await this.toDietaryRestrictions(dto.dietaryRestrictions ?? []);
		const marketingConsent = dto.marketingConsent ?? false;
		requireBoolean('Marketing consent', marketingConsent);
		const customer = Customer.create({
			id: CustomerId.create(randomUUID()), username, name, contactInfo,
			vatNumber: this.toVatNumber(dto.vatNumber), consent: new ConsentPreferences(marketingConsent, now),
			addresses, dietaryRestrictions: restrictions, createdAt: now, updatedAt: now,
		});
		await this.persist(customer, true);
		return this.toDTO(customer);
	}

	async getCustomer(id: string): Promise<CustomerResponseDTO> { return this.toDTO(await this.requireCustomer(id)); }

	async updateCustomer(id: string, dto: CustomerUpdateDTO): Promise<CustomerResponseDTO> {
		const current = await this.requireCustomer(id);
		const contactInfo = this.toContactInformation(dto);
		const duplicate = await this.customerRepo.findByEmail(contactInfo.email.address);
		if (duplicate && !duplicate.id.equals(current.id))
			throw new ConflictException('A customer with this email already exists.');
		if (current.username) {
			const user = await this.userRepo.findByUsername(current.username);
			if (user && user.email.address.toLowerCase() !== contactInfo.email.address.toLowerCase())
				throw new ConflictException('The email of a linked customer must match the linked user account. Update the account email first.');
		}
		current.updateProfile(this.toPersonName(dto.firstName, dto.lastName), contactInfo, this.toVatNumber(dto.vatNumber));
		if (dto.marketingConsent !== undefined) current.updateConsent(requireBoolean('Marketing consent', dto.marketingConsent));
		await this.persist(current);
		return this.toDTO(current);
	}

	async removeCustomer(id: string): Promise<void> {
		const customer = await this.requireCustomer(id);
		const customerId = customer.id;
		if (await this.customerRepo.hasOrders(customer.contactInfo.email.address))
			throw new ConflictException('Customer has historical orders and cannot be removed.');
		try {
			await this.customerRepo.delete(customerId);
		} catch (error) {
			if (error instanceof CustomerReferencedByOrdersError)
				throw new ConflictException('Customer has historical orders and cannot be removed.');
			throw error;
		}
	}

	async setUserLink(id: string, username: string | null): Promise<CustomerResponseDTO> {
		const customer = await this.requireCustomer(id);
		if (username === null) {
			customer.unLinkUser();
		} else {
			const userName = Username.create(username);
			await this.assertUserCanBeLinked(userName, customer.contactInfo.email.address, customer.id);
			customer.linkUser(userName);
		}
		await this.persist(customer);
		return this.toDTO(customer);
	}

	async updateDietaryRestrictions(id: string, restrictions: CustomerDietaryRestrictionInputDTO[]): Promise<CustomerResponseDTO> {
		const customer = await this.requireCustomer(id);
		customer.replaceDietaryRestrictions(await this.toDietaryRestrictions(restrictions));
		await this.persist(customer);
		return this.toDTO(customer);
	}

	async addAddress(id: string, dto: CustomerAddressInputDTO & { isDefault?: boolean }): Promise<CustomerResponseDTO> {
		const customer = await this.requireCustomer(id);
		if (dto.isDefault !== undefined) requireBoolean('Default address', dto.isDefault);
		customer.addAddress(this.toDeliveryAddress(dto), dto.isDefault ?? customer.addresses.length === 0);
		await this.persist(customer);
		return this.toDTO(customer);
	}

	async updateAddress(id: string, addressId: string, dto: UpdateCustomerAddressDTO): Promise<CustomerResponseDTO> {
		const customer = await this.requireCustomer(id);
		if (dto.isDefault !== undefined) requireBoolean('Default address', dto.isDefault);
		customer.updateAddress(this.toAddressId(addressId), this.toDeliveryAddress(dto), dto.isDefault);
		await this.persist(customer);
		return this.toDTO(customer);
	}

	async removeAddress(id: string, addressId: string): Promise<CustomerResponseDTO> {
		const customer = await this.requireCustomer(id);
		customer.removeAddress(this.toAddressId(addressId));
		await this.persist(customer);
		return this.toDTO(customer);
	}

	async setDefaultAddress(id: string, addressId: string): Promise<CustomerResponseDTO> {
		const customer = await this.requireCustomer(id);
		customer.setDefaultAddress(this.toAddressId(addressId));
		await this.persist(customer);
		return this.toDTO(customer);
	}

	async updateConsent(id: string, marketingConsent: boolean): Promise<CustomerResponseDTO> {
		const customer = await this.requireCustomer(id);
		customer.updateConsent(requireBoolean('Marketing consent', marketingConsent));
		await this.persist(customer);
		return this.toDTO(customer);
	}

	private async assertUserCanBeLinked(username: Username, customerEmail: string, currentId?: CustomerId): Promise<void> {
		const user = await this.userRepo.findByUsername(username);
		if (!user) throw new NotFoundException('User account not found.');
		if (user.email.address.toLowerCase() !== customerEmail.toLowerCase())
			throw new ConflictException('Customer and user account email addresses must match.');
		const existing = await this.customerRepo.findByUsername(username);
		if (existing && (!currentId || !existing.id.equals(currentId)))
			throw new ConflictException('User account is already linked to another customer.');
	}

	private toPersonName(firstName: string, lastName: string): PersonName {
		const first = requireText('First name', firstName, 75);
		const last = requireText('Last name', lastName, 75);
		if (first.length < 2 || last.length < 2) throw new BadRequestException('First and last names must contain at least 2 characters.');
		return PersonName.create(first, last);
	}

	private toContactInformation(dto: CustomerContactDTO): ContactInformation {
		const email = Email.create(dto.email);
		if (email.isFailure) throw new BadRequestException(email.getError());
		if (email.getValue().address.length > 255) throw new BadRequestException('Email must not exceed 255 characters.');
		const phone = requireText('Phone number', dto.phone, 16);
		if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new BadRequestException('Phone number must use E.164 format.');
		return new ContactInformation(PhoneNumber.create(phone), email.getValue());
	}

	private toVatNumber(value?: string | null): VatNumber | undefined {
		if (value == null) return undefined;
		if (typeof value !== 'string') throw new BadRequestException('VAT number must be text.');
		if (value.trim() === '') return undefined;
		const normalized = value.trim().toUpperCase();
		const portugueseNif = /^\d{9}$/.test(normalized);
		if (!portugueseNif && !/^[A-Z]{2}[A-Z0-9]{2,14}$/.test(normalized))
			throw new BadRequestException('VAT number must be a 9-digit Portuguese NIF or an international VAT identifier.');
		if (portugueseNif && !this.hasValidPortugueseNifCheckDigit(normalized))
			throw new BadRequestException('Portuguese NIF check digit is invalid.');
		return VatNumber.create(normalized);
	}

	private hasValidPortugueseNifCheckDigit(nif: string): boolean {
		const sum = [...nif.slice(0, 8)].reduce((total, digit, index) => total + Number(digit) * (9 - index), 0);
		const remainder = sum % 11;
		const checkDigit = remainder < 2 ? 0 : 11 - remainder;
		return checkDigit === Number(nif[8]);
	}

	private toDeliveryAddress(dto: CustomerAddressInputDTO): DeliveryAddress {
		if (!dto || typeof dto !== 'object' || Array.isArray(dto))
			throw new BadRequestException('Delivery address must be an object.');
		if (dto.extraDetails !== undefined && (typeof dto.extraDetails !== 'string' || dto.extraDetails.length > 500))
			throw new BadRequestException('Extra details must be text up to 500 characters.');
		return new DeliveryAddress(
			requireText('Street', dto.street, 255),
			requireText('Postal code', dto.postalCode, 20),
			requireText('City', dto.city, 100),
			dto.extraDetails?.trim() ?? '',
		);
	}

	private toAddress(dto: CustomerAddressInputDTO & { isDefault?: boolean }, isDefault: boolean) {
		requireBoolean('Default address', isDefault);
		return { id: AddressId.create(randomUUID()), isDefault, address: this.toDeliveryAddress(dto) };
	}

	private async toDietaryRestrictions(input: CustomerDietaryRestrictionInputDTO[]): Promise<CustomerDietaryRestriction[]> {
		if (!Array.isArray(input)) throw new BadRequestException('Dietary restrictions must be an array.');
		const allergenNames = input.map(item => {
			if (!item || typeof item.allergenId !== 'string') throw new BadRequestException('Each dietary restriction requires an allergen identifier.');
			if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > 500))
				throw new BadRequestException('Dietary restriction descriptions must be text up to 500 characters.');
			return item.allergenId.trim();
		});
		if (new Set(allergenNames).size !== allergenNames.length)
			throw new BadRequestException('Each allergen may only appear once.');
		await this.allergenService.checkAllergens(allergenNames);
		const now = Timestamp.create(new Date());
		return input.map((item, index) => new CustomerDietaryRestriction(
			AllergenName.create(allergenNames[index]), item.description?.trim() ?? '', now,
		));
	}

	private async requireCustomer(id: string): Promise<Customer> {
		const customer = await this.customerRepo.findById(this.toCustomerId(id));
		if (!customer) throw new NotFoundException('Customer not found.');
		return customer;
	}

	private async persist(customer: Customer, insert = false): Promise<void> {
		try {
			if (insert) await this.customerRepo.insert(customer);
			else await this.customerRepo.save(customer);
		} catch (error) {
			if (error instanceof CustomerPersistenceConflictError)
				throw new ConflictException('The customer email or linked user is already in use.');
			throw error;
		}
	}

	private toCustomerId(value: string): CustomerId {
		if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
			throw new BadRequestException('Customer id must be a UUID.');
		return CustomerId.create(value);
	}

	private toAddressId(value: string): AddressId {
		if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
			throw new BadRequestException('Address id must be a UUID.');
		return AddressId.create(value);
	}

	private toDTO(customer: Customer): CustomerResponseDTO {
		return {
			id: customer.id.value, username: customer.username?.value ?? null,
			firstName: customer.name.firstName, lastName: customer.name.lastName,
			phone: customer.contactInfo.phone.value, email: customer.contactInfo.email.address,
			vatNumber: customer.vatNumber?.value ?? null,
			marketingConsent: customer.consent.marketingConsent,
			consentTimestamp: customer.consent.consentTimestamp.value.toISOString(),
			addresses: customer.addresses.map(entry => ({
				id: entry.id.value, isDefault: entry.isDefault, street: entry.address.street,
				postalCode: entry.address.postalCode, city: entry.address.city, extraDetails: entry.address.extraDetails,
			})),
			dietaryRestrictions: customer.dietaryRestrictions.map(entry => ({
				allergenId: entry.allergenName.value, description: entry.description, recordedAt: entry.recordedAt.value.toISOString(),
			})),
			createdAt: customer.createdAt.value.toISOString(), updatedAt: customer.updatedAt.value.toISOString(),
		};
	}
}
