import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, USER_STATUSES_KEY, type StatusName } from './decorators';
import { UserStatus } from '../../../domain/user/UserStatus';

@Injectable()
export class StatusGuard implements CanActivate {
	constructor(
		@Inject(Reflector) private readonly reflector: Reflector) {}


	/**
	 * Function checks the AuthenticatedUser Status, to see if they met
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
		const required = this.reflector.getAllAndOverride<StatusName[] | undefined>(USER_STATUSES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		// * skiping validation if it is public method
		const isPublic = this.reflector.getAllAndOverride<boolean>(
			IS_PUBLIC_KEY,
			[context.getHandler(), context.getClass()],
		);
		if (isPublic)
			return true;


		const { user } = context.switchToHttp().getRequest();
		const permittedStatuses = required ?? [UserStatus.ACTIVE];

		if (!user || !permittedStatuses.length || !permittedStatuses.includes(user.status))
			throw new ForbiddenException('You do not have permission to do this.');
		return (true);
	}
}
