import { UserRole } from './UserRoles';
import { Page } from '../../domain/common/Pagination';

export const ROLE_CHANGE_LOG_REPOSITORY = Symbol('ROLE_CHANGE_LOG_REPOSITORY');

export interface RoleChangeLogDTO {
	actorUsername: string;
	targetUsername: string;
	previousRoles: UserRole[];
	newRoles: UserRole[];
	reason: string | null;
	changedAt: string;
}

export interface IRoleChangeLogRepository {
	record(entry: Omit<RoleChangeLogDTO, 'changedAt'>): Promise<void>;
	findByTarget(targetUsername: string, page: number, pageSize: number): Promise<Page<RoleChangeLogDTO>>;
}
