import { UserStatus } from '../../domain/user/UserStatus';

export const STATUS_ASSIGNMENT_REPOSITORY = Symbol('STATUS_ASSIGNMENT_REPOSITORY');

export interface IStatusAssignmentRepository {
	record(assignedFrom: string, assignedTo: string, status: UserStatus): Promise<void>;
}
