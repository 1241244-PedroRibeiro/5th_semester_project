import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../application/user/UserRoles';

export const ROLES_KEY = 'roles';

/**
* Custom decorator to attach authorized UserRoles to route handlers or controllers.
* Consumed by RolesGuard to enforce Role-Based Access Control (RBAC).
*
* @param roles Array of UserRole required to access the endpoint
*/
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
