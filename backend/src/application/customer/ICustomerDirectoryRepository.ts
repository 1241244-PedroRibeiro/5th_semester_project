import { Page, PageRequest } from '../../domain/common/Pagination';
import { CustomerListItemDTO } from './CustomerDTOs';

export const CUSTOMER_DIRECTORY_REPOSITORY = 'ICustomerDirectoryRepository';

export interface ICustomerDirectoryRepository {
	search(query: string | undefined, page: PageRequest): Promise<Page<CustomerListItemDTO>>;
}
