import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	Query,
	HttpCode,
	HttpStatus,
	BadRequestException,
	ConflictException,
	NotFoundException,
	UseGuards,
} from '@nestjs/common';
import { PizzaSizeService } from '../../../application/pizza/PizzaSizeService';
import { CreatePizzaSizeDTO, UpdatePizzaSizeDTO } from '../../../application/pizza/PizzaSizeDTOs';
import { RolesGuard } from '../middlewares/roles.guard';
import { Roles, Public } from '../middlewares/decorators';
import { UserRole } from '../../../application/user/UserRoles';

@Controller('pizza-sizes')
export class PizzaSizeController {
	constructor(private readonly sizeService: PizzaSizeService) {}

	@Get()
	@Public()
	async getAll(@Query('search') search?: string) {
		const result = await this.sizeService.getPizzaSizes(search);
		return result.getValue();
	}

	@Get(':name')
	@Public()
	async getById(@Param('name') name: string) {
		const result = await this.sizeService.getPizzaSizeByName(name);
		if (result.isFailure) throw new NotFoundException(result.getError());
		return result.getValue();
	}

	@Post()
	@UseGuards(RolesGuard)
	@Roles(UserRole.MANAGER)
	@HttpCode(HttpStatus.CREATED)
	async create(@Body() body: CreatePizzaSizeDTO) {
		if (!body?.name) {
			throw new BadRequestException('Pizza size name is required');
		}

		const result = await this.sizeService.createPizzaSize(body);
		if (result.isFailure) {
			const err = result.getError();
			if (err.includes('already exists')) throw new ConflictException(err);
			throw new BadRequestException(err);
		}
		return result.getValue();
	}

	@Put(':name')
	@UseGuards(RolesGuard)
	@Roles(UserRole.MANAGER)
	async update(@Param('name') name: string, @Body() body: UpdatePizzaSizeDTO) {
		if (!body?.name) {
			throw new BadRequestException('Pizza size name is required');
		}

		const result = await this.sizeService.updatePizzaSize(name, body);
		if (result.isFailure) {
			const err = result.getError();
			if (err.includes('not found')) throw new NotFoundException(err);
			if (err.includes('already exists')) throw new ConflictException(err);
			throw new BadRequestException(err);
		}
		return result.getValue();
	}

		@Delete(':name')
		@UseGuards(RolesGuard)
		@Roles(UserRole.MANAGER)
		@HttpCode(HttpStatus.OK)
		async delete(@Param('name') name: string) {
		const result = await this.sizeService.deletePizzaSize(name);
		if (result.isFailure) {
				const err = result.getError();
				if (err.includes('not found')) throw new NotFoundException(err);
				// Cobre ambas as formulações da mensagem:
				if (err.includes('in use') || err.includes('referenced')) {
				throw new ConflictException(err);
				}
				throw new BadRequestException(err);
		}
		return { message: 'Pizza size removed successfully' };
		}
}
