import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../application/user/UserRoles';
import { UserStatus } from '../../../domain/user/UserStatus';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Explicitly marks a protected endpoint as available to any authenticated role. */
export const AUTHENTICATED_KEY = 'authenticated';
export const Authenticated = () => SetMetadata(AUTHENTICATED_KEY, true);



// ! -------------------- Maintain it with new user roles if they are created
export const ROLES_KEY = 'roles';
export type RoleName = `${UserRole}`;
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

// ! -------------------- Maintain it with new user roles if they are created
export const USER_STATUSES_KEY = 'userStatuses';
export type StatusName ='ACTIVE' | 'DEACTIVATED' | 'PENDING_REGISTRATION';
export const UserStatuses = (...statuses: UserStatus[]) => SetMetadata(USER_STATUSES_KEY, statuses);

export interface AuthenticatedUser {
	username: string;
	roles: RoleName[];
	status: UserStatus;
	//! could add username or name here later if needed
}


export const CurrentUser = createParamDecorator(
	(_data: unknown, context: ExecutionContext): AuthenticatedUser =>
		context.switchToHttp().getRequest().user,
);


/**
Controller code to use it would be like this:

@Post()
@Roles('MANAGER')
add(@Body() body: AddCategoryDto, @CurrentUser() user: AuthenticatedUser) {
	// user.username and user.roles are available here
}
*/
