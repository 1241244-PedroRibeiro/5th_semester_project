import { emptyLoginBucket, ILoginAttemptStore, LoginBucket } from '../../src/application/auth/ILoginAttemptStore';

/** Synchronous callbacks make updates atomic within a test process. */
export class TestLoginAttemptStore implements ILoginAttemptStore {
	readonly buckets = new Map<string, LoginBucket>();
	async update<T>(keys: string[], change: (buckets: Map<string, LoginBucket>) => T): Promise<T> {
		const selected = new Map(keys.map(key => [key, structuredClone(this.buckets.get(key) ?? emptyLoginBucket())]));
		const result = change(selected);
		for (const [key, bucket] of selected) this.buckets.set(key, bucket);
		return result;
	}
}

export const testLoginAttempts = new TestLoginAttemptStore();
