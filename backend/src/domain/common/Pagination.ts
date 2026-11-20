import { DomainError } from './DomainError';
import { requirePositiveInteger } from './Guard';

export interface Page<T> {
	items: T[];
	total: number;       // total matches, not only this page
	page: number;
	pageSize: number;
	totalPages: number;
}

//! ================== Class ================== !//

export class PageRequest {
	static readonly DEFAULT_PAGE_SIZE = 20;
	static readonly MAX_PAGE_SIZE = 100;

	private constructor(
		public readonly page: number,      // starts at 1
		public readonly pageSize: number,
	) {}

	static create(page = 1, pageSize = PageRequest.DEFAULT_PAGE_SIZE): PageRequest {
		requirePositiveInteger('Page', page);
		requirePositiveInteger('Page size', pageSize);

		if (pageSize > PageRequest.MAX_PAGE_SIZE)
			throw new DomainError(`Page size cannot exceed ${PageRequest.MAX_PAGE_SIZE}`);

		return new PageRequest(page, pageSize);
	}

	/** How many documents to skip in the database. */
	get offset(): number { return (this.page - 1) * this.pageSize; }
}

//! ================== Function ================== !//

export function createPage<T>(items: T[], total: number, request: PageRequest): Page<T> {
	return {
		items,
		total,
		page: request.page,
		pageSize: request.pageSize,
		totalPages: Math.ceil(total / request.pageSize),
	};
}
