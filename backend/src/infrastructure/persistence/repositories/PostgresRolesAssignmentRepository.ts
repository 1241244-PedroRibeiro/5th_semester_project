import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IRolesAssignmentRepository } from '../../../application/user/IRolesAssignmentRepository';
import { UserRole } from '../../../application/user/UserRoles';
import { RolesAssignmentEntity } from '../entities/RolesAssignmentEntity';

@Injectable()
export class PostgresRolesAssignmentRepository implements IRolesAssignmentRepository {
	constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

	async record(assignedFrom: string, assignedTo: string, roles: readonly UserRole[]): Promise<void> {
		if (!roles.length) return;
		await this.dataSource.getRepository(RolesAssignmentEntity).insert(
			roles.map(role => ({ assigned_from: assignedFrom, assigned_to: assignedTo, role })),
		);
	}
}
