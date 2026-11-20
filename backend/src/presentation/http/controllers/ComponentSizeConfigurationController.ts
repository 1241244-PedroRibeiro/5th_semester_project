import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Put,
	Query,
	UseGuards,
} from '@nestjs/common';

import {
	ComponentSizeConfigurationService,
} from '../../../application/pizza/ComponentSizeConfigurationService';

import {
	CreateComponentSizeConfigurationDTO,
	UpdateComponentSizeConfigurationDTO,
} from '../../../application/pizza/ComponentSizeConfigurationDTOs';

import { RolesGuard } from '../middlewares/roles.guard';
import { Roles, Public } from '../middlewares/decorators';

@Controller('component-size-configurations')
export class ComponentSizeConfigurationController {
	constructor(
		private readonly service: ComponentSizeConfigurationService,
	) {}

	@Get()
	@Public()
	getAll(
		@Query('search') search?: string,
		@Query('componentSku') componentSku?: string,
		@Query('pizzaSize') pizzaSize?: string,
	) {
		return this.service.getAll(search, componentSku, pizzaSize);
	}

	// Declarar esta rota antes de /:id.
	@Get('product/:componentSku')
	@Public()
	getByProduct(@Param('componentSku') componentSku: string) {
		return this.service.getByProduct(componentSku);
	}

	@Get(':id')
	@Public()
	getById(@Param('id') id: string) {
		return this.service.getById(id);
	}

	@Post()
	@UseGuards(RolesGuard)
	@Roles('MANAGER')
	@HttpCode(HttpStatus.CREATED)
	create(
		@Body() body: CreateComponentSizeConfigurationDTO,
	) {
		if (
			!body ||
			typeof body.componentSku !== 'string' ||
			!body.componentSku.trim() ||
			typeof body.pizzaSize !== 'string' ||
			!body.pizzaSize.trim() ||
			body.price === undefined
		) {
			throw new BadRequestException(
				'componentSku, pizzaSize and price are required',
			);
		}

		return this.service.create(body);
	}

	@Put(':id')
	@UseGuards(RolesGuard)
	@Roles('MANAGER')
	update(
		@Param('id') id: string,
		@Body() body: UpdateComponentSizeConfigurationDTO,
	) {
		if (!body || body.price === undefined) {
			throw new BadRequestException('price is required');
		}

		return this.service.update(id, body);
	}

	@Delete(':id')
	@UseGuards(RolesGuard)
	@Roles('MANAGER')
	@HttpCode(HttpStatus.OK)
	delete(@Param('id') id: string) {
		return this.service.delete(id);
	}
}
