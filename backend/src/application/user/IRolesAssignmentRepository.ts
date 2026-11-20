import { UserRole } from './UserRoles';

export const ROLES_ASSIGNMENT_REPOSITORY = Symbol('ROLES_ASSIGNMENT_REPOSITORY');

/** Append-only assignment history, separate from current user-role membership. */
export interface IRolesAssignmentRepository {
	record(assignedFrom: string, assignedTo: string, roles: readonly UserRole[]): Promise<void>;
}
