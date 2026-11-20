import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { Roles, UserStatuses } from '../middlewares/decorators';
import { UserRole } from '../../../application/user/UserRoles';
import { UserStatus } from '../../../domain/user/UserStatus';
import {
	 IUnauthorizedAttemptRepository,
	 UNAUTHORIZED_ATTEMPT_REPOSITORY,
} from '../../../application/auth/IUnauthorizedAttemptRepository';
import { Page } from '../../../domain/common/Pagination';

interface UnauthorizedAttemptResponseDTO {
	id: string;
	user: string | null;
	timestamp: string;
	endpoint: string;
}

@Controller('admin')
@Roles(UserRole.ADMINISTRATOR)
@UserStatuses(UserStatus.ACTIVE)
export class AdminAuditController {
	constructor(
		@Inject(UNAUTHORIZED_ATTEMPT_REPOSITORY)
		private readonly attempts: IUnauthorizedAttemptRepository,
	) {}

	@Get('unauthorized-attempts')
	async getUnauthorizedAttempts(
		@Query('page') page: unknown,
		@Query('pageSize') pageSize: unknown,
		@Query('user') user: unknown,
		@Query('from') from: unknown,
		@Query('to') to: unknown,
	): Promise<Page<UnauthorizedAttemptResponseDTO>> {
		const currentPage = this.readPositiveInteger(page, 1, 'page');
		const currentPageSize = this.readPositiveInteger(pageSize, 20, 'pageSize');
		if (currentPageSize > 100)
			throw new BadRequestException('pageSize cannot exceed 100');

		const filters = {
			page: currentPage,
			pageSize: currentPageSize,
			user: this.readOptionalString(user, 'user'),
			from: this.readDate(from, 'from'),
			to: this.readDate(to, 'to'),
		};
		if (filters.from && filters.to && filters.from >= filters.to)
			throw new BadRequestException('from must be earlier than to');
		const result = await this.attempts.findFilteredPage(filters);
		return {
			items: result.items,
			total: result.total,
			page: currentPage,
			pageSize: currentPageSize,
			totalPages: Math.ceil(result.total / currentPageSize),
		};
	}

	private readOptionalString(value: unknown, name: string): string | undefined {
		if (value === undefined) return undefined;
		if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${name} must be a non-empty string`);
		return value.trim();
	}

	private readDate(value: unknown, name: string): Date | undefined {
		if (value === undefined) return undefined;
		if (typeof value !== 'string') throw new BadRequestException(`${name} must be an ISO date`);
		const parsed = new Date(value);
		if (!Number.isFinite(parsed.getTime())) throw new BadRequestException(`${name} must be an ISO date`);
		return parsed;
	}

	private readPositiveInteger(value: unknown, fallback: number, name: string): number {
		if (value === undefined) return fallback;
		if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))
			throw new BadRequestException(`${name} must be a positive integer`);
		return Number(value);
	}
}
