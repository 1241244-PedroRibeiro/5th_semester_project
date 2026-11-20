import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Inject,
	Param,
	Query,
	Post,
	Put,
} from '@nestjs/common';
import { PredefinedPizzaService } from '../../../application/pizza/PredefinedPizzaService';
import { CreatePredefinedPizzaDTO } from '../../../application/pizza/PredefinedPizzaDTOs';
import { UserRole } from '../../../application/user/UserRoles';
import { UserStatus } from '../../../domain/user/UserStatus';
import { Public, Roles, UserStatuses } from '../middlewares/decorators';

@Controller('predefined-pizzas')
export class PredefinedPizzaController {
	constructor(
		@Inject(PredefinedPizzaService)
		private readonly service: PredefinedPizzaService,
	) {}

	@Post()
	@Roles(UserRole.MANAGER)
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.CREATED)
	create(@Body() body: CreatePredefinedPizzaDTO) {
		return this.service.create(body);
	}

	@Get()
	@Public()
	findAll() {
		return this.service.findAll();
	}

	@Put(':pizzaSku')
	@Roles(UserRole.MANAGER)
	@UserStatuses(UserStatus.ACTIVE)
	update(
		@Param('pizzaSku') pizzaSku: string,
		@Body() body: Omit<CreatePredefinedPizzaDTO, 'pizzaSku'>,
	) {
		return this.service.update(pizzaSku, body);
	}

	@Get(':pizzaSku')
	@Public()
	findById(@Param('pizzaSku') pizzaSku: string, @Query('pizzaSize') pizzaSize?: string) {
		return this.service.findById(pizzaSku, pizzaSize);
	}
}
