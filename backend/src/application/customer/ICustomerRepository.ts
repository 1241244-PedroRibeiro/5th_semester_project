import { Customer } from '../../domain/customer/Customer';
import { CustomerId } from '../../domain/customer/CustomerId';
import { Username } from '../../domain/user/Username';

export const CUSTOMER_REPOSITORY = 'ICustomerRepository';

export interface ICustomerRepository {
	findById(id: CustomerId): Promise<Customer | null>;
	findByUsername(username: Username): Promise<Customer | null>;
	findByEmail(email: string): Promise<Customer | null>;
	delete(id: CustomerId): Promise<void>;
	hasOrders(customerEmail: string): Promise<boolean>;
	insert(customer: Customer): Promise<void>;
	/** Persists the complete aggregate, including its customer_addresses rows. */
	save(customer: Customer): Promise<void>;
}
