import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_SESSION_REPOSITORY, IAuthSessionRepository } from '../../application/auth/IAuthSessionRepository';
import { ITokenService } from '../../application/auth/ISecurityServices';
import { User } from '../../domain/user/User';
import { AuthSession } from '../../domain/user/AuthSession';
import { Timestamp } from '../../domain/common/Timestamp';
import { UserStatus } from '../../domain/user/UserStatus';
import { IUserRepository, USER_REPOSITORY } from '../../application/auth/IUserRepository';
import { Username } from '../../domain/user/Username';

@Injectable()
export class JwtTokenService implements ITokenService {
	constructor(
		@Inject(JwtService) private readonly jwt: JwtService,
		@Inject(AUTH_SESSION_REPOSITORY) private readonly sessions: IAuthSessionRepository,
		@Inject(USER_REPOSITORY) @Optional() private readonly users?: IUserRepository,
	) {}

	async generateToken(user: User): Promise<string> {
		const sid = randomUUID();
		const token = this.jwt.sign({
			sid,
			sub: user.username.value,
			email: user.email.address,
			roles: [...user.roles].map(role => role.name),
			status: user.status,
		});
		const { exp } = this.jwt.decode<{ exp: number }>(token);
		await this.sessions.create(AuthSession.create({ id: sid, username: user.username, expiresAt: Timestamp.create(new Date(exp * 1000)) }));
		return token;
	}

	async generateSession(user: User): Promise<{ token: string; refreshToken: string }> {
		const refreshToken = randomBytes(48).toString('base64url');
		const generated = this.createSessionToken(user, refreshToken);
		await this.sessions.create(generated.session);
		const token = generated.token;
		return { token, refreshToken };
	}

	async refreshSession(refreshToken: string): Promise<{ token: string; refreshToken: string } | null> {
		if (typeof refreshToken !== 'string' || refreshToken.length < 32 || !this.sessions.findByRefreshTokenHash || !this.sessions.rotate)
			return null;
		const currentHash = this.hashRefreshToken(refreshToken);
		const session = await this.sessions.findByRefreshTokenHash(currentHash);
		if (!session?.isActive()) return null;
		if (!this.users) return null;
		const user = await this.users.findByUsername(session.username);
		if (!user || user.status !== UserStatus.ACTIVE) return null;
		const replacementRefreshToken = randomBytes(48).toString('base64url');
		const generated = this.createSessionToken(user, replacementRefreshToken);
		if (!await this.sessions.rotate(currentHash, generated.session))
			return null;
		return { token: generated.token, refreshToken: replacementRefreshToken };
	}

	private createSessionToken(user: User, refreshToken: string): { token: string; session: AuthSession } {
		const sid = randomUUID();
		const token = this.jwt.sign({
			sid,
			sub: user.username.value,
			email: user.email.address,
			roles: [...user.roles].map(role => role.name),
			status: user.status,
		});
		const refreshLifetime = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000);
		const session = AuthSession.create({
			id: sid,
			username: user.username,
			expiresAt: Timestamp.create(new Date(Date.now() + refreshLifetime * 1000)),
			refreshTokenHash: this.hashRefreshToken(refreshToken),
		});
		return { token, session };
	}

	private hashRefreshToken(token: string): string {
		return createHash('sha256').update(token).digest('hex');
	}

	async verifyToken(token: string): Promise<{ username: string; roles: string[]; status: UserStatus } | null> {
		let payload: { sub?: unknown; sid?: unknown; roles?: unknown; status?: unknown };
		try {
			payload = this.jwt.verify(token, { algorithms: ['HS256'] });
		} catch {
			return null;
		}
		if (!AuthSession.isValidId(payload.sid)
			|| typeof payload.sub !== 'string' || !Array.isArray(payload.roles)
			|| !payload.roles.every((role: unknown) => typeof role === 'string'))
			return null;
		const status = Object.values(UserStatus).find(value => value === payload.status);
		if (status === undefined) return null;
		// Database errors propagate; a failed lookup must never authorize an operation.
		const session = await this.sessions.findById(payload.sid);
		if (!session?.isActiveFor(payload.sub)) return null;
		return { username: payload.sub, roles: payload.roles as string[], status };
	}
}
