import { randomUUID } from 'node:crypto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { IAuthSessionRepository } from '../../src/application/auth/IAuthSessionRepository';
import { AuthSession } from '../../src/domain/user/AuthSession';
import { AuthSessionMap } from '../../src/infrastructure/persistence/mappers/AuthSessionMap';
import { Username } from '../../src/domain/user/Username';
import { Timestamp } from '../../src/domain/common/Timestamp';

export class InMemoryAuthSessionRepository implements IAuthSessionRepository {
	readonly sessions = new Map<string, AuthSession>();
	private copy(session: AuthSession): AuthSession {
		return AuthSessionMap.toDomain(AuthSessionMap.toPersistence(session));
	}
	async create(session: AuthSession): Promise<void> { this.sessions.set(session.id, this.copy(session)); }
	async findById(id: string): Promise<AuthSession | null> {
		const session = this.sessions.get(id);
		return session ? this.copy(session) : null;
	}
	async save(session: AuthSession): Promise<void> {
		const current = this.sessions.get(session.id);
		if (current?.username.equals(session.username) && current.revokedAt === null)
			this.sessions.set(session.id, this.copy(session));
	}
	async findByRefreshTokenHash(hash: string): Promise<AuthSession | null> {
		for (const session of this.sessions.values())
			if (session.refreshTokenHash === hash && session.revokedAt === null) return this.copy(session);
		return null;
	}
	async rotate(currentHash: string, replacement: AuthSession): Promise<boolean> {
		const current = await this.findByRefreshTokenHash(currentHash);
		if (!current) return false;
		current.revoke();
		await this.save(current);
		await this.create(replacement);
		return true;
	}
}

export const testSessions = new InMemoryAuthSessionRepository();

/** Explicitly create the server record as well as the signed credential. */
export function signSession(jwt: JwtService, payload: { sub: string; [key: string]: unknown }, options: JwtSignOptions = {}): string {
	const sid = randomUUID();
	const token = jwt.sign({ ...payload, sid }, { expiresIn: '15m', ...options });
	const { exp } = jwt.decode<{ exp: number }>(token);
	testSessions.sessions.set(sid, AuthSession.create({ id: sid, username: Username.create(payload.sub), expiresAt: Timestamp.create(new Date(exp * 1000)) }));
	return token;
}
