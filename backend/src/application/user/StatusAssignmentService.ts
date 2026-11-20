import { Inject, Injectable } from '@nestjs/common';
import { IStatusAssignmentRepository, STATUS_ASSIGNMENT_REPOSITORY } from './IStatusAssignmentRepository';
import { UserStatus } from '../../domain/user/UserStatus';

@Injectable()
export class StatusAssignmentService {
	constructor(@Inject(STATUS_ASSIGNMENT_REPOSITORY) private readonly repository: IStatusAssignmentRepository) {}

	async recordAssignment(assignedFrom: string, assignedTo: string, status: UserStatus): Promise<void> {
		await this.repository.record(assignedFrom, assignedTo, status);
	}
}
