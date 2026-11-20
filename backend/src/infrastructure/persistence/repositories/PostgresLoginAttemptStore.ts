import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { emptyLoginBucket, ILoginAttemptStore, LOGIN_STATE_RETENTION_MS, LoginBucket } from '../../../application/auth/ILoginAttemptStore';
import { LoginAttemptBucketEntity } from '../entities/LoginAttemptBucketEntity';

@Injectable()
export class PostgresLoginAttemptStore implements ILoginAttemptStore {
	constructor(@Inject(DataSource) private readonly source: DataSource) {}

	async update<T>(keys: string[], change: (buckets: Map<string, LoginBucket>) => T): Promise<T> {
		// Commit cleanup separately so expiry locks cannot invert the bucket lock order.
		await this.source.transaction(async manager => {
			// Session configuration, not table access; TypeORM has no lock-timeout API.
			await manager.query("SET LOCAL lock_timeout = '2s'");
			const repository = manager.getRepository(LoginAttemptBucketEntity);
			const expired = await repository.createQueryBuilder('bucket')
				.where('bucket.expiresAt <= :now', { now: new Date() })
				.orderBy('bucket.expiresAt', 'ASC').take(100)
				.setLock('pessimistic_write').setOnLocked('skip_locked').getMany();
			if (expired.length) await repository.delete(expired.map(bucket => bucket.key));
		});
		return this.source.transaction(async manager => {
			await manager.query("SET LOCAL lock_timeout = '2s'");
			const repository = manager.getRepository(LoginAttemptBucketEntity);
			const buckets = new Map<string, LoginBucket>();
			// Identical lock order prevents deadlocks between overlapping account/IP keys.
			for (const key of [...new Set(keys)].sort()) {
				await repository.createQueryBuilder().insert().values({ key, state: emptyLoginBucket(),
					expiresAt: new Date(Date.now() + LOGIN_STATE_RETENTION_MS) }).orIgnore().execute();
				const row = await repository.findOneOrFail({ where: { key }, lock: { mode: 'pessimistic_write' } });
				buckets.set(key, row.expiresAt.getTime() <= Date.now() ? emptyLoginBucket() : row.state);
			}
			const result = change(buckets);
			for (const [key, bucket] of buckets)
				await repository.update({ key }, { state: bucket, expiresAt: new Date(Date.now() + LOGIN_STATE_RETENTION_MS) });
			return result;
		});
	}
}
