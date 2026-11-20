import { CanActivate, ExecutionContext, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';
import { LoginAbuseService, LoginAttempt } from '../../../application/auth/LoginAbuseService';

export type LoginRequest = Request & { loginAttempt: LoginAttempt };

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
	constructor(@Inject(LoginAbuseService) private readonly abuse: LoginAbuseService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<LoginRequest>();
		// Express resolves forwarding headers only from explicitly trusted proxies.
		const ip = request.ip || request.socket.remoteAddress;
		if (!ip)
			throw new ServiceUnavailableException('Client address is unavailable.');
		request.loginAttempt = await this.abuse.begin(request.body?.email, ip);
		return true;
	}
}
