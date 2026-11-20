import { StatusAssignmentService } from '../../src/application/user/StatusAssignmentService';
import { UserStatus } from '../../src/domain/user/UserStatus';

export const testStatusAssignmentRepository = {
	entries: [] as { assigned_from: string; assigned_to: string; status: UserStatus }[],
	async record(assignedFrom: string, assignedTo: string, status: UserStatus): Promise<void> {
		this.entries.push({ assigned_from: assignedFrom, assigned_to: assignedTo, status });
	},
};
export const testStatusAssignments = new StatusAssignmentService(testStatusAssignmentRepository);
