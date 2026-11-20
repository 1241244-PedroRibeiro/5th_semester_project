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
	Inject,
} from '@nestjs/common';
import { AllergenService } from '../../../application/allergen/AllergenService';
import { CreateAllergenDTO, UpdateAllergenDTO } from '../../../application/allergen/AllergenDTOs';
import { RolesGuard } from '../middlewares/roles.guard';
import { Roles, Public } from '../middlewares/decorators';
import { UserRole } from '../../../application/user/UserRoles';

@Controller('allergens')
export class AllergenController {
	constructor(
		@Inject('AllergenService')
		private readonly allergenService: AllergenService,
	) {}

	@Get()
	@Public()
	async getAll(@Query('search') search?: string) {
		const result = await this.allergenService.getAllergens(search);
		return result.getValue();
	}

	@Get(':name')
	@Public()
	async getById(@Param('name') name: string) {
		const result = await this.allergenService.getAllergenByName(name);
		if (result.isFailure) throw new NotFoundException(result.getError());
		return result.getValue();
	}

	@Post()
	@UseGuards(RolesGuard)
	@Roles(UserRole.MANAGER)
	@HttpCode(HttpStatus.CREATED)
	async create(@Body() body: CreateAllergenDTO) {
		if (!body.name) {
			throw new BadRequestException('Name are required');
		}

		const result = await this.allergenService.createAllergen(body);
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
	async update(@Param('name') name: string, @Body() body: UpdateAllergenDTO) {
		if (!body.name) {
			throw new BadRequestException('Name is required');
		}

		const result = await this.allergenService.updateAllergen(name, body);
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
		const result = await this.allergenService.deleteAllergen(name);
		if (result.isFailure) {
			const err = result.getError();
			if (err.includes('not found')) throw new NotFoundException(err);
			if (err.includes('referenced by existing business information')) throw new ConflictException(err);
			throw new BadRequestException(err);
		}
		return { message: 'Allergen removed successfully' };
	}
}
