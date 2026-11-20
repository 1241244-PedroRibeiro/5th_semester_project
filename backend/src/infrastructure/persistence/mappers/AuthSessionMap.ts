import { AuthSession } from '../../../domain/user/AuthSession';
import { Username } from '../../../domain/user/Username';
import { Timestamp } from '../../../domain/common/Timestamp';
import { AuthSessionEntity } from '../entities/AuthSessionEntity';

export type AuthSessionPersistenceRow = Pick<AuthSessionEntity, 'id' | 'username' | 'expires_at' | 'revoked_at' | 'refresh_token_hash'>;

export class AuthSessionMap {
	static toDomain(row: AuthSessionPersistenceRow): AuthSession {
		return AuthSession.reconstitute({ id: row.id, username: Username.create(row.username),
			expiresAt: Timestamp.create(row.expires_at), revokedAt: row.revoked_at === null ? null : Timestamp.create(row.revoked_at),
			refreshTokenHash: row.refresh_token_hash });
	}

	static toPersistence(session: AuthSession): AuthSessionPersistenceRow {
		return { id: session.id, username: session.username.value, expires_at: session.expiresAt.value,
			revoked_at: session.revokedAt?.value ?? null, refresh_token_hash: session.refreshTokenHash };
	}
}
