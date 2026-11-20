export const LOGIN_ATTEMPT_STORE = Symbol('LOGIN_ATTEMPT_STORE');

export interface LoginEvent {
	id: string;
	at: number;
	pending: boolean;
}

export interface LoginBucket {
	events: LoginEvent[];
	blockedUntil: number;
	strikes: number;
}

/** The callback runs atomically across all keys, and must not perform I/O. */
export interface ILoginAttemptStore {
	update<T>(keys: string[], change: (buckets: Map<string, LoginBucket>) => T): Promise<T>;
}

export const LOGIN_STATE_RETENTION_MS = 24 * 60 * 60 * 1000;
export function emptyLoginBucket(): LoginBucket {
	return { events: [], blockedUntil: 0, strikes: 0 };
}
