import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Page, PageRequest, createPage } from '../../../domain/common/Pagination';
import { CustomerListItemDTO } from '../../../application/customer/CustomerDTOs';
import { ICustomerDirectoryRepository } from '../../../application/customer/ICustomerDirectoryRepository';

@Injectable()
export class PostgresCustomerDirectoryRepository implements ICustomerDirectoryRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

	async search(search: string | undefined, page: PageRequest): Promise<Page<CustomerListItemDTO>> {
		const term = search?.trim();
		const query = this.dataSource.createQueryBuilder().from('customers', 'c');
		if (term) {
			query.where(`LOWER(CONCAT(c.first_name, ' ', c.last_name)) LIKE :term
				OR LOWER(c.email) LIKE :term OR c.phone LIKE :term OR LOWER(COALESCE(c.vat_number, '')) LIKE :term`,
			{ term: `%${term.toLowerCase()}%` });
		}
		const total = await query.clone().getCount();
		const rows = await query.select([
			'c.id AS id', 'c.first_name AS "firstName"', 'c.last_name AS "lastName"',
			'c.phone AS phone', 'c.email AS email', 'c.vat_number AS "vatNumber"',
		]).orderBy('c.last_name', 'ASC').addOrderBy('c.first_name', 'ASC')
			.offset(page.offset).limit(page.pageSize).getRawMany<CustomerListItemDTO>();
		return createPage(rows, total, page);
	}
}
