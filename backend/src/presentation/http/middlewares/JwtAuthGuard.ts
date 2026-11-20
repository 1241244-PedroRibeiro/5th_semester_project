import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
	Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { ITokenService } from '../../../application/auth/ISecurityServices';
import { TOKEN_SERVICE } from '../../../application/auth/AuthDTOs';

export interface AuthenticatedRequest extends Request {
	user?: {
		username: string;
		roles: string[];
	};
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		@Inject(TOKEN_SERVICE)
		private readonly tokenService: ITokenService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const authHeader = request.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer '))
			throw new UnauthorizedException('Missing or invalid Authorization header');

		const token = authHeader.split(' ')[1];
		const decoded = await this.tokenService.verifyToken(token);

		if (!decoded)
			throw new UnauthorizedException('Invalid or expired token');

		request.user = decoded;
		return true;
	}
}
