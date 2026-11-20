export const UNAUTHORIZED_ATTEMPT_REPOSITORY = Symbol('UNAUTHORIZED_ATTEMPT_REPOSITORY');

export interface UnauthorizedAttemptDTO {
	id: string;
	user: string | null;
	timestamp: string;
	endpoint: string;
}

/** Infrastructure audit storage; no authentication domain entity is required. */
export interface IUnauthorizedAttemptRepository {
	record(user: string, endpoint: string): Promise<void>;
	findPage(page: number, pageSize: number): Promise<{
		items: UnauthorizedAttemptDTO[];
		total: number;
	}>;
	findFilteredPage(filters: {
		page: number;
		pageSize: number;
		user?: string;
		from?: Date;
		to?: Date;
	}): Promise<{
		items: UnauthorizedAttemptDTO[];
		total: number;
	}>;
}
