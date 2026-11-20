export class CustomerReferencedByOrdersError extends Error {
	constructor() {
		super('Customer is referenced by historical orders.');
		this.name = 'CustomerReferencedByOrdersError';
	}
}

export class CustomerPersistenceConflictError extends Error {
	constructor() {
		super('Customer persistence violated a uniqueness constraint.');
		this.name = 'CustomerPersistenceConflictError';
	}
}
