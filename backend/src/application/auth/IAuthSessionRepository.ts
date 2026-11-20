import { AuthSession } from '../../domain/user/AuthSession';

export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');

export interface IAuthSessionRepository {
	create(session: AuthSession): Promise<void>;
	findById(id: string): Promise<AuthSession | null>;
	save(session: AuthSession): Promise<void>;
	findByRefreshTokenHash?(hash: string): Promise<AuthSession | null>;
	rotate?(currentHash: string, replacement: AuthSession): Promise<boolean>;
}
