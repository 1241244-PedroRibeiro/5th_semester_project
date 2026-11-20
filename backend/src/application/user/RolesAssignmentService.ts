import { Inject, Injectable } from '@nestjs/common';
import { IRolesAssignmentRepository, ROLES_ASSIGNMENT_REPOSITORY } from './IRolesAssignmentRepository';
import { UserRole } from './UserRoles';

@Injectable()
export class RolesAssignmentService {
	constructor(@Inject(ROLES_ASSIGNMENT_REPOSITORY) private readonly repository: IRolesAssignmentRepository) {}

	async recordAssignments(assignedFrom: string, assignedTo: string, roles: readonly UserRole[]): Promise<void> {
		await this.repository.record(assignedFrom, assignedTo, [...new Set(roles)]);
	}
}
