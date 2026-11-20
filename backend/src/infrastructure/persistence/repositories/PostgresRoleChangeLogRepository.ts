import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IRoleChangeLogRepository, RoleChangeLogDTO } from '../../../application/user/IRoleChangeLogRepository';
import { Page, PageRequest, createPage } from '../../../domain/common/Pagination';
import { UserRole } from '../../../application/user/UserRoles';
import { RoleChangeLogEntity } from '../entities/RoleChangeLogEntity';

@Injectable()
export class PostgresRoleChangeLogRepository implements IRoleChangeLogRepository {
	constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

	async record(entry: Omit<RoleChangeLogDTO, 'changedAt'>): Promise<void> {
		await this.dataSource.getRepository(RoleChangeLogEntity).insert({
			actor_username: entry.actorUsername,
			target_username: entry.targetUsername,
			previous_roles: entry.previousRoles,
			new_roles: entry.newRoles,
			reason: entry.reason,
		});
	}

	async findByTarget(targetUsername: string, page: number, pageSize: number): Promise<Page<RoleChangeLogDTO>> {
		const [rows, total] = await this.dataSource.getRepository(RoleChangeLogEntity).findAndCount({
			where: { target_username: targetUsername },
			order: { changed_at: 'DESC', id: 'DESC' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		});
		return createPage(rows.map(row => ({
			actorUsername: row.actor_username,
			targetUsername: row.target_username,
			previousRoles: row.previous_roles as UserRole[],
			newRoles: row.new_roles as UserRole[],
			reason: row.reason,
			changedAt: row.changed_at.toISOString(),
		})), total, PageRequest.create(page, pageSize));
	}
}
