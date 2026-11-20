import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { CustomerService } from '../../../application/customer/CustomerService';
import { CreateCustomerDTO, CustomerAddressInputDTO, CustomerDietaryRestrictionInputDTO, CustomerUpdateDTO } from '../../../application/customer/CustomerDTOs';
import { UserRole } from '../../../application/user/UserRoles';
import { UserStatus } from '../../../domain/user/UserStatus';
import { Roles, UserStatuses } from '../middlewares/decorators';

@Controller('customers')
@Roles(UserRole.MANAGER)
@UserStatuses(UserStatus.ACTIVE)
export class CustomerManagementController {
	constructor(@Inject(CustomerService) private readonly service: CustomerService) {}

	@Get()
	async search(
		@Query('search') search: unknown,
		@Query('page') page: unknown,
		@Query('pageSize') pageSize: unknown,
	) {
		if (search !== undefined && typeof search !== 'string') throw new BadRequestException('Search must be text.');
		if (typeof search === 'string' && search.length > 100) throw new BadRequestException('Search must not exceed 100 characters.');
		return this.service.searchCustomers(search as string | undefined, this.readPositiveInteger(page, 1), this.readPositiveInteger(pageSize, 12));
	}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	create(@Body() body: unknown) {
		const input = this.record(body);
		return this.service.createCustomer(input as unknown as CreateCustomerDTO);
	}

	@Get(':id')
	get(@Param('id') id: string) { return this.service.getCustomer(id); }

	@Put(':id')
	update(@Param('id') id: string, @Body() body: unknown) {
		return this.service.updateCustomer(id, this.record(body) as unknown as CustomerUpdateDTO);
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async remove(@Param('id') id: string): Promise<void> { await this.service.removeCustomer(id); }

	@Put(':id/user')
	setUserLink(@Param('id') id: string, @Body() body: unknown) {
		const input = this.record(body);
		if (input.username !== null && typeof input.username !== 'string')
			throw new BadRequestException('username must be text or null.');
		return this.service.setUserLink(id, input.username as string | null);
	}

	@Put(':id/dietary-restrictions')
	updateDietaryRestrictions(@Param('id') id: string, @Body() body: unknown) {
		const input = this.record(body);
		if (!Array.isArray(input.dietaryRestrictions)) throw new BadRequestException('dietaryRestrictions must be an array.');
		return this.service.updateDietaryRestrictions(id, input.dietaryRestrictions as CustomerDietaryRestrictionInputDTO[]);
	}

	@Post(':id/addresses')
	addAddress(@Param('id') id: string, @Body() body: unknown) {
		return this.service.addAddress(id, this.record(body) as unknown as CustomerAddressInputDTO);
	}

	@Put(':id/addresses/:addressId')
	updateAddress(@Param('id') id: string, @Param('addressId') addressId: string, @Body() body: unknown) {
		return this.service.updateAddress(id, addressId, this.record(body) as unknown as CustomerAddressInputDTO);
	}

	@Delete(':id/addresses/:addressId')
	removeAddress(@Param('id') id: string, @Param('addressId') addressId: string) {
		return this.service.removeAddress(id, addressId);
	}

	@Put(':id/addresses/:addressId/default')
	setDefaultAddress(@Param('id') id: string, @Param('addressId') addressId: string) {
		return this.service.setDefaultAddress(id, addressId);
	}

	private record(value: unknown): Record<string, unknown> {
		if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Request body must be an object.');
		return value as Record<string, unknown>;
	}

	private readPositiveInteger(value: unknown, fallback: number): number {
		if (value === undefined) return fallback;
		if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1)
			throw new BadRequestException('Pagination values must be positive integers.');
		const parsed = Number(value);
		if (parsed > 100)
			throw new BadRequestException('Pagination values must not exceed 100.');
		return parsed;
	}
}
