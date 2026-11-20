// auth/auth.guard.ts
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AUTH_SESSION_REPOSITORY, IAuthSessionRepository } from '../application/auth/IAuthSessionRepository';

import { USER_REPOSITORY } from '../application/auth/AuthDTOs';
import type { IUserRepository } from '../application/auth/IUserRepository';
import { AuthSession } from '../domain/user/AuthSession';
import { Username } from '../domain/user/Username';

import { IS_PUBLIC_KEY } from './http/middlewares/decorators';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		@Inject(JwtService) private readonly jwt: JwtService,
		@Inject(Reflector) private readonly reflector: Reflector,
		@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
		@Inject(AUTH_SESSION_REPOSITORY) private readonly sessions: IAuthSessionRepository,
	) {}


	/**
	* Function checks the JWT token sent with the request,
	* if valid - it will send an AuthenticatedUser,
	* if not  - throw an exception, UnauthorizedException, that will be
	*			 transformed in HTTP error by the Handler.
	*
	* @param context
	* @throws UnauthorizedException()
	*
	* @returns True
	*/
	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Check the decorator used in the controller, to see if there is any role requirement
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
																context.getHandler(),
																context.getClass(),
																]);
		if (isPublic)
			return (true);

		const request = context.switchToHttp().getRequest();
		const [type, token] = request.headers.authorization?.split(' ') ?? [];

		if (type !== 'Bearer' || !token)
			throw new UnauthorizedException('Authentication required.');

		let jwtPayload: { sub?: unknown; sid?: unknown };
		try {
			jwtPayload = await this.jwt.verifyAsync(token, { algorithms: ['HS256'] }); // checks signature and expiry
		} catch {
			throw new UnauthorizedException('Invalid or expired token.');
		}

		if (!jwtPayload || typeof jwtPayload.sub !== 'string')
			throw new UnauthorizedException('Invalid token subject.');

		if (!AuthSession.isValidId(jwtPayload.sid))
			throw new UnauthorizedException('Invalid or ended session.');
		const session = await this.sessions.findById(jwtPayload.sid);
		if (!session?.isActiveFor(jwtPayload.sub))
			throw new UnauthorizedException('Invalid or ended session.');

		let username: Username;
		try { username = Username.create(jwtPayload.sub); }
		catch { throw new UnauthorizedException('Invalid token subject.'); }
		const user = await this.userRepo.findByUsername(username);
		if (!user)
			throw new UnauthorizedException('User no longer exists.');

		request.user = {
			username: user.username.value,
			sid: jwtPayload.sid,
			roles: [...user.roles].map(role => role.name),
			status: user.status,
		};
		return (true);
	}

}
