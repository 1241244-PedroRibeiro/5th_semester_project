import {
	BadRequestException, Body, Controller, Delete, Get,
	HttpCode, HttpStatus, Param, Post, Put, Query,
} from '@nestjs/common';
import { PizzaComponentTypeService } from '../../../application/pizza/PizzaComponentTypeService';
import { CreatePizzaComponentTypeDTO, UpdatePizzaComponentTypeDTO } from '../../../application/pizza/PizzaComponentTypeDTOs';
import { UserStatus } from '../../../domain/user/UserStatus';
import { UserRole } from '../../../application/user/UserRoles';
import { Public, Roles, UserStatuses } from '../middlewares/decorators';

@Controller('pizza-component-types')
export class PizzaComponentTypeController {
	constructor(private readonly service: PizzaComponentTypeService) {}



	// * ======================== Get ======================== * //

	@Get()
	@UserStatuses(UserStatus.ACTIVE)
	@Public()
	async getAll(@Query('page') page: unknown, @Query('pageSize') pageSize: unknown,
			@Query('search') search?: string) {
		// search is completely optional, it will try to match some of the string characteristics to the search
		// implemented in case we wanted to add a search bar
		return this.service.getComponentTypes(this.readPageNumber(page), this.readPageNumber(pageSize), search);
	}

	@Get(':name')
	@UserStatuses(UserStatus.ACTIVE)
	@Public()
	async getById(@Param('name') name: string) {
		return this.service.getComponentTypeByName(name);
	}

	// * ======================== Put ======================== * //

	@Put(':name')
	@UserStatuses(UserStatus.ACTIVE)
	@Roles(UserRole.MANAGER)
	async update(@Param('name') name: string, @Body() body: UpdatePizzaComponentTypeDTO) {
		return this.service.updateComponentType(name, body);
	}


	@Post()
	@Roles(UserRole.MANAGER)
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.CREATED)
	async create(@Body() body: CreatePizzaComponentTypeDTO) {
		return this.service.createComponentType(body);
	}

	// * ======================== Delete ======================== * //

	@Delete(':name')
	@UserStatuses(UserStatus.ACTIVE)
	@Roles(UserRole.MANAGER)
	@HttpCode(HttpStatus.OK)
	async delete(@Param('name') name: string) {
		await this.service.deleteComponentType(name);
		return { message: 'Pizza component type removed successfully' };
	}



	// * ======================== Utils ======================== * //

	private readPageNumber(value: unknown): number {
		if (value === undefined)
			throw new BadRequestException('Both page and pageSize are required.');
		if (typeof value !== 'string' || !/^\d+$/.test(value))
			throw new BadRequestException('Pagination values must be positive integers.');
		return Number(value);
	}

}
