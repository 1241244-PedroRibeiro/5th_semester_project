import { RolesAssignmentService } from '../../src/application/user/RolesAssignmentService';
import { UserRole } from '../../src/application/user/UserRoles';

export const testRolesAssignmentRepository = {
	entries: [] as { assigned_from: string; assigned_to: string; role: UserRole }[],
	async record(assignedFrom: string, assignedTo: string, roles: readonly UserRole[]): Promise<void> {
		for (const role of roles) this.entries.push({ assigned_from: assignedFrom, assigned_to: assignedTo, role });
	},
};
export const testRolesAssignments = new RolesAssignmentService(testRolesAssignmentRepository);
