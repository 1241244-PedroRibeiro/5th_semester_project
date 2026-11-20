import { Entity } from '../common/Entity';
import { DomainError } from '../common/DomainError';
import { Timestamp } from '../common/Timestamp';
import { Username } from './Username';

export interface AuthSessionProps {
	id: string;
	username: Username;
	expiresAt: Timestamp;
	revokedAt: Timestamp | null;
	refreshTokenHash?: string | null;
}

/** A per-login credential lifecycle, independent of JWTs, cookies, and persistence. */
export class AuthSession extends Entity<string> {
	private constructor(private readonly props: AuthSessionProps) { super(props.id); }

	static isValidId(value: unknown): value is string {
		return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
	}

	static create(props: Omit<AuthSessionProps, 'revokedAt'>): AuthSession {
		return AuthSession.reconstitute({ ...props, revokedAt: null });
	}

	static reconstitute(props: AuthSessionProps): AuthSession {
		if (!AuthSession.isValidId(props.id)) throw new DomainError('Session ID must be a UUID v4');
		return new AuthSession({ ...props });
	}

	get username(): Username { return this.props.username; }
	get expiresAt(): Timestamp { return this.props.expiresAt; }
	get revokedAt(): Timestamp | null { return this.props.revokedAt; }
	get refreshTokenHash(): string | null { return this.props.refreshTokenHash ?? null; }

	isActive(at: Date = new Date()): boolean {
		return this.revokedAt === null && Timestamp.create(at).value.getTime() < this.expiresAt.value.getTime();
	}

	isActiveFor(username: string, at: Date = new Date()): boolean {
		return this.username.value === username && this.isActive(at);
	}

	revoke(at: Date = new Date()): void {
		// Revocation is irreversible and preserves the first recorded instant.
		if (this.props.revokedAt === null) this.props.revokedAt = Timestamp.create(at);
	}
}
