import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Raw } from 'typeorm';
import { ICustomerRepository } from '../../../application/customer/ICustomerRepository';
import { CustomerPersistenceConflictError, CustomerReferencedByOrdersError } from '../../../application/customer/CustomerErrors';
import { Customer } from '../../../domain/customer/Customer';
import { CustomerId } from '../../../domain/customer/CustomerId';
import { Username } from '../../../domain/user/Username';
import { AddressId } from '../../../domain/customer/AddressId';
import { CustomerAddress } from '../../../domain/customer/CustomerAddress';
import { CustomerDietaryRestriction } from '../../../domain/customer/CustomerDietaryRestriction';
import { DeliveryAddress } from '../../../domain/customer/DeliveryAddress';
import { CustomerEntity, CustomerAddressEntity, CustomerDietaryRestrictionEntity, CustomerOrderEntity } from '../entities';
import { Email } from '../../../domain/common/Email';
import { PersonName } from '../../../domain/common/PersonName';
import { ContactInformation } from '../../../domain/customer/ContactInformation';
import { PhoneNumber } from '../../../domain/customer/PhoneNumber';
import { ConsentPreferences } from '../../../domain/customer/ConsentPreferences';
import { Timestamp } from '../../../domain/common/Timestamp';
import { AllergenName } from '../../../domain/allergen/AllergenName';
import { VatNumber } from '../../../domain/customer/VatNumber';

@Injectable()
export class PostgresCustomerRepository implements ICustomerRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

	async findById(id: CustomerId): Promise<Customer | null> {
		const row = await this.dataSource.getRepository(CustomerEntity).findOne({
			where: { id: id.value }, relations: { addresses: true, dietaryRestrictions: true },
		});
		return row ? this.map(row) : null;
	}

	async findByUsername(username: Username): Promise<Customer | null> {
		const row = await this.dataSource.getRepository(CustomerEntity).findOne({
			where: { username: username.value }, relations: { addresses: true, dietaryRestrictions: true },
		});
		return row ? this.map(row) : null;
	}

	async findByEmail(email: string): Promise<Customer | null> {
		const row = await this.dataSource.getRepository(CustomerEntity).findOne({
			where: { email: Raw(alias => `LOWER(${alias}) = LOWER(:email)`, { email: email.trim() }) }, relations: { addresses: true, dietaryRestrictions: true },
		});
		return row ? this.map(row) : null;
	}

	async hasOrders(customerEmail: string): Promise<boolean> {
		return this.dataSource.getRepository(CustomerOrderEntity).existsBy({ customer_email: customerEmail });
	}

	async insert(customer: Customer): Promise<void> {
		try {
			await this.dataSource.transaction(async manager => {
				await manager.insert(CustomerEntity, this.toRow(customer));
				await this.replaceChildren(manager, customer);
			});
		} catch (error) {
			if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505')
				throw new CustomerPersistenceConflictError();
			throw error;
		}
	}

	async save(customer: Customer): Promise<void> {
		try {
			await this.dataSource.transaction(async manager => {
				const result = await manager.update(CustomerEntity, { id: customer.id.value }, this.toRow(customer));
				if (!result.affected) throw new Error('Customer aggregate disappeared during update.');
				await this.replaceChildren(manager, customer);
			});
		} catch (error) {
			if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505')
				throw new CustomerPersistenceConflictError();
			throw error;
		}
	}

	async delete(id: CustomerId): Promise<void> {
		try {
			await this.dataSource.getRepository(CustomerEntity).delete({ id: id.value });
		} catch (error) {
			if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503')
				throw new CustomerReferencedByOrdersError();
			throw error;
		}
	}

	private async replaceChildren(manager: EntityManager, customer: Customer): Promise<void> {
		const customerEmail = customer.contactInfo.email.address;
		await manager.delete(CustomerAddressEntity, { customer_email: customerEmail });
		if (customer.addresses.length) {
			await manager.insert(CustomerAddressEntity, customer.addresses.map(entry => ({
				id: entry.id.value, customer_email: customerEmail,
				street: entry.address.street, postal_code: entry.address.postalCode,
				city: entry.address.city, extra_details: entry.address.extraDetails,
				is_default: entry.isDefault,
			})));
		}
		await manager.delete(CustomerDietaryRestrictionEntity, { customer_email: customerEmail });
		if (customer.dietaryRestrictions.length) {
			await manager.insert(CustomerDietaryRestrictionEntity, customer.dietaryRestrictions.map(entry => ({
				customer_email: customerEmail, allergen_name: entry.allergenName.value,
				description: entry.description, recorded_at: entry.recordedAt.value,
			})));
		}
	}

	private toRow(customer: Customer): Partial<CustomerEntity> {
		return {
			id: customer.id.value, username: customer.username?.value ?? null,
			first_name: customer.name.firstName, last_name: customer.name.lastName,
			phone: customer.contactInfo.phone.value, email: customer.contactInfo.email.address,
			vat_number: customer.vatNumber?.value ?? null,
			marketing_consent: customer.consent.marketingConsent,
			consent_timestamp: customer.consent.consentTimestamp.value,
			created_at: customer.createdAt.value, updated_at: customer.updatedAt.value,
		};
	}

	private map(row: CustomerEntity): Customer {
		const email = Email.create(row.email);
		if (email.isFailure) throw new Error('Persisted customer email is invalid.');
		return Customer.reconstitute({
			id: CustomerId.create(row.id),
			username: row.username ? Username.create(row.username) : undefined,
			name: PersonName.create(row.first_name, row.last_name),
			contactInfo: new ContactInformation(PhoneNumber.create(row.phone), email.getValue()),
			vatNumber: row.vat_number ? VatNumber.create(row.vat_number) : undefined,
			consent: new ConsentPreferences(row.marketing_consent, Timestamp.create(row.consent_timestamp ?? row.created_at)),
			addresses: (row.addresses ?? []).map(entry => new CustomerAddress(
				AddressId.create(entry.id), entry.is_default,
				new DeliveryAddress(entry.street, entry.postal_code, entry.city, entry.extra_details ?? ''),
			)),
			dietaryRestrictions: (row.dietaryRestrictions ?? []).map(entry => new CustomerDietaryRestriction(
				AllergenName.create(entry.allergen_name), entry.description, Timestamp.create(entry.recorded_at),
			)),
			createdAt: Timestamp.create(row.created_at), updatedAt: Timestamp.create(row.updated_at),
		});
	}
}
