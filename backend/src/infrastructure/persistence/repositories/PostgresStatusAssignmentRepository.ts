import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IStatusAssignmentRepository } from '../../../application/user/IStatusAssignmentRepository';
import { UserStatus } from '../../../domain/user/UserStatus';
import { StatusAssignmentEntity } from '../entities/StatusAssignmentEntity';

@Injectable()
export class PostgresStatusAssignmentRepository implements IStatusAssignmentRepository {
	constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

	async record(assignedFrom: string, assignedTo: string, status: UserStatus): Promise<void> {
		await this.dataSource.getRepository(StatusAssignmentEntity).insert({ assigned_from: assignedFrom, assigned_to: assignedTo, status });
	}
}
