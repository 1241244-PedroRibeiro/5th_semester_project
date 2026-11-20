import { HttpException, HttpStatus, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Email } from '../../domain/common/Email';
import { ILoginAttemptStore, LOGIN_ATTEMPT_STORE, LoginBucket } from './ILoginAttemptStore';

const MINUTE = 60_000;
const FAILURE_WINDOW = 15 * MINUTE;
const RESERVATION_TTL = 2 * MINUTE;

export interface LoginAttempt {
	id: string;
	accountKey?: string;
	pairKey?: string;
}

@Injectable()
export class LoginAbuseService {
	constructor(@Inject(LOGIN_ATTEMPT_STORE) private readonly store: ILoginAttemptStore) {}

	private key(scope: string, ...parts: string[]): string {
		return createHash('sha256').update(JSON.stringify([scope, ...parts])).digest('hex');
	}

	private prune(bucket: LoginBucket, now: number, window: number): void {
		bucket.events = bucket.events.filter(event => event.at > now - (event.pending ? RESERVATION_TTL : window));
	}

	private async update<T>(keys: string[], change: (buckets: Map<string, LoginBucket>) => T): Promise<T> {
		try { return await this.store.update(keys, change); }
		catch { throw new ServiceUnavailableException('Login protection is temporarily unavailable. Please try again later.'); }
	}

	async begin(emailInput: unknown, ip: string): Promise<LoginAttempt> {
		const email = Email.create(emailInput as string);
		const ipKey = this.key('ip', ip);
		const attempt: LoginAttempt = { id: randomUUID() };
		if (email.isSuccess) {
			attempt.accountKey = this.key('account', email.getValue().address);
			attempt.pairKey = this.key('pair', email.getValue().address, ip);
		}
		const ipRetry = await this.update([ipKey], buckets => {
			const now = Date.now();
			const ipBucket = buckets.get(ipKey)!;
			this.prune(ipBucket, now, MINUTE);
			if (ipBucket.events.length >= 20)
				return Math.max(1, Math.ceil((ipBucket.events[0].at + MINUTE - now) / 1000));
			// Count every admitted IP request, including account-throttled requests.
			ipBucket.events.push({ id: attempt.id, at: now, pending: false });
			return 0;
		});
		if (ipRetry) this.reject(ipRetry);
		const keys = this.accountKeys(attempt);
		if (!keys.length) return attempt;
		const retry = await this.update(keys, buckets => {
			const now = Date.now();
			let wait = 0;
			for (const key of this.accountKeys(attempt)) {
				const bucket = buckets.get(key)!;
				this.prune(bucket, now, FAILURE_WINDOW);
				wait = Math.max(wait, bucket.blockedUntil - now);
				const threshold = key === attempt.accountKey ? 10 : 5;
				if (bucket.events.length >= threshold) {
					// In-flight attempts occupy slots too, preventing concurrent guessing.
					const nextExpiry = Math.min(...bucket.events.map(event => event.at + (event.pending ? RESERVATION_TTL : FAILURE_WINDOW)));
					wait = Math.max(wait, nextExpiry - now);
				}
			}
			if (wait > 0) return Math.max(1, Math.ceil(wait / 1000));
			for (const key of this.accountKeys(attempt))
				buckets.get(key)!.events.push({ id: attempt.id, at: now, pending: true });
			return 0;
		});
		if (retry) this.reject(retry);
		return attempt;
	}

	private reject(retryAfterSeconds: number): never {
		throw new HttpException({ message: 'Too many login attempts. Please try again later.', retryAfterSeconds }, HttpStatus.TOO_MANY_REQUESTS);
	}

	async finish(attempt: LoginAttempt, outcome: 'success' | 'failure' | 'error'): Promise<void> {
		const keys = this.accountKeys(attempt);
		if (!keys.length) return;
		await this.update(keys, buckets => {
			const now = Date.now();
			for (const key of keys) {
				const bucket = buckets.get(key)!;
				this.prune(bucket, now, FAILURE_WINDOW);
				const reservation = bucket.events.find(event => event.id === attempt.id && event.pending);
				if (!reservation) continue;
				bucket.events = bucket.events.filter(event => event.id !== attempt.id);
				if (outcome === 'success') {
					// Preserve concurrent reservations and failures newer than this attempt.
					bucket.events = bucket.events.filter(event => event.pending || event.at > reservation.at);
					bucket.strikes = 0;
					bucket.blockedUntil = 0;
				} else if (outcome === 'failure') {
					bucket.events.push({ id: attempt.id, at: now, pending: false });
					const threshold = key === attempt.accountKey ? 10 : 5;
					if (bucket.events.filter(event => !event.pending).length >= threshold) {
						const seconds = key === attempt.accountKey ? Math.min(60 * 2 ** Math.min(bucket.strikes, 4), 900) : 300;
						bucket.strikes++;
						bucket.blockedUntil = now + seconds * 1000;
						// Start a fresh failure batch after this cooldown; retain in-flight slots.
						bucket.events = bucket.events.filter(event => event.pending);
					}
				}
			}
		});
	}

	private accountKeys(attempt: LoginAttempt): string[] {
		return [attempt.accountKey, attempt.pairKey].filter((key): key is string => key !== undefined);
	}
}
