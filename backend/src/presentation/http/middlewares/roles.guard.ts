import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTHENTICATED_KEY, IS_PUBLIC_KEY, ROLES_KEY, type RoleName } from './decorators';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		@Inject(Reflector) private readonly reflector: Reflector) {}


	/**
	 * Function checks the AuthenticatedUser Roles, to see if they met
	 * the necessry ones to access the endpoint.
	 * if valid - it will return true,
	 * if not  - throw an exception, ForbiddenException, that will be
	 *			 transformed in HTTP error by the Handler.
	 *
	 * @param context
	 * @throws ForbiddenException()
	 *
	 * @returns True
	 */
	canActivate(context: ExecutionContext): boolean {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		const required = this.reflector.getAllAndOverride<RoleName[] | undefined>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		const { user } = context.switchToHttp().getRequest();
		if (!required) {
			const authenticatedOnly = this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_KEY, [
				context.getHandler(),
				context.getClass(),
			]);
			if (authenticatedOnly && user) return true;
			throw new ForbiddenException('Route access policy is not configured.');
		}

		if (!required.length || !user || !required.some((role) => user.roles.includes(role)))
			throw new ForbiddenException('You do not have permission to do this.');

		return (true);
	}
}
