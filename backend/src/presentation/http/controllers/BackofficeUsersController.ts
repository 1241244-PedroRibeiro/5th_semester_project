import { BadRequestException, Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { Roles, UserStatuses } from '../middlewares/decorators';
import { UserRole } from '../../../application/user/UserRoles';
import { UserStatus } from '../../../domain/user/UserStatus';
import { UserService } from '../../../application/user/UserService';
import { UserResponseDTO } from '../../../application/user/UserDTOs';
import { Page } from '../../../domain/common/Pagination';

@Controller('users')
@Roles(UserRole.MANAGER, UserRole.ADMINISTRATOR)
@UserStatuses(UserStatus.ACTIVE)
export class BackofficeUsersController {
	constructor(@Inject(UserService) private readonly userService: UserService) {}

	@Get()
	async getAllUsers(@Query('page') page: unknown, @Query('pageSize') pageSize: unknown): Promise<Page<UserResponseDTO>> {
		return this.userService.getAllUsers(this.readPageNumber(page), this.readPageNumber(pageSize));
	}

	@Get('filter/creation-date/:date')
	async getFilterByCreationDate(@Param('date') date: string,
				@Query('page') page: unknown, @Query('pageSize') pageSize: unknown): Promise<Page<UserResponseDTO>> {
		return this.userService.getFilterByCreationDate(date, this.readPageNumber(page), this.readPageNumber(pageSize));
	}

	@Get('filter/role/:role')
	async getFilterByRole(@Param('role') role: UserRole,
				@Query('page') page: unknown, @Query('pageSize') pageSize: unknown): Promise<Page<UserResponseDTO>> {
		return this.userService.getFilterByRole(role, this.readPageNumber(page), this.readPageNumber(pageSize));
	}

	@Get('filter/status/:status')
	async getFilterByStatus(@Param('status') status: UserStatus,
				@Query('page') page: unknown, @Query('pageSize') pageSize: unknown): Promise<Page<UserResponseDTO>> {
		return this.userService.getFilterByStatus(status, this.readPageNumber(page), this.readPageNumber(pageSize));
	}

	private readPageNumber(value: unknown): number | undefined {
		if (value === undefined)
			return undefined;
		if (typeof value !== 'string' || !/^\d+$/.test(value))
			throw new BadRequestException('Pagination values must be positive integers.');
		return Number(value);
	}
}
