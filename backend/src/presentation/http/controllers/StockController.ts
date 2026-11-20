import {
	Controller,
	Get,
	Post,
	Param,
	Body,
	Query,
	Inject,
	UseGuards,
	BadRequestException,
	NotFoundException,
	UnprocessableEntityException,
	InternalServerErrorException,
	HttpCode,
	HttpStatus,
} from '@nestjs/common';

import { StockService } from '../../../application/stock/StockService';
import {
	StockAdjustmentDTO,
	StockSearchDTO,
} from '../../../application/stock/StockDTOs';
import { RolesGuard } from '../middlewares/roles.guard';
import { Roles } from '../middlewares/decorators';
import { UserRole } from '../../../application/user/UserRoles';

@Controller('stock')
@UseGuards(RolesGuard)
@Roles(UserRole.MANAGER)
export class StockController {
	constructor(
		@Inject('StockService')
		private readonly stockService: StockService,
	) {}

	@Get()
	@Roles(UserRole.MANAGER, UserRole.EMPLOYEE)
	async getAll(
		@Query('search') search?: string,
		@Query('categoryName') categoryName?: string,
		@Query('lowStock') lowStock?: string,
		@Query('active') active?: string,
	) {
		if (
			lowStock !== undefined &&
			lowStock !== 'true' &&
			lowStock !== 'false'
		) {
			throw new BadRequestException(
				'lowStock must be true or false',
			);
		}
		if (active !== undefined && active !== 'true' && active !== 'false') {
			throw new BadRequestException('active must be true or false');
		}

		const filters: StockSearchDTO = {
			search,
			categoryName,
			lowStock: lowStock === undefined
				? undefined
				: lowStock === 'true',
			active: active === undefined ? undefined : active === 'true',
		};

		const result = await this.stockService.getAllStock(filters);

		if (result.isFailure) {
			throw new InternalServerErrorException(result.getError());
		}

		return result.getValue();
	}

	@Get(':productSku')
	@Roles(UserRole.MANAGER, UserRole.EMPLOYEE)
	async getByProductId(
		@Param('productSku') productSku: string,
	) {
		const result =
			await this.stockService.getStockByProductSku(productSku);

		if (result.isFailure) {
			const error = result.getError();

			if (error.includes('not found')) {
				throw new NotFoundException(error);
			}

			throw new InternalServerErrorException(error);
		}

		return result.getValue();
	}

	@Post(':productSku/adjustments')
	@HttpCode(HttpStatus.OK)
	async adjustStock(
		@Param('productSku') productSku: string,
		@Body() body: StockAdjustmentDTO,
	) {
		if (
			!body ||
			!['INCREASE', 'DECREASE'].includes(body.adjustmentType) ||
			!Number.isSafeInteger(body.amount) ||
			body.amount < 1
		) {
			throw new BadRequestException(
				'adjustmentType must be INCREASE or DECREASE and amount must be a positive integer',
			);
		}

		if (
			body.reason !== undefined &&
			typeof body.reason !== 'string'
		) {
			throw new BadRequestException('reason must be a string');
		}

		const result = await this.stockService.adjustStock(
			productSku,
			body,
		);

		if (result.isFailure) {
			const error = result.getError();

			if (error.includes('not found')) {
				throw new NotFoundException(error);
			}

			if (error.toLowerCase().includes('insufficient stock')) {
				throw new UnprocessableEntityException(error);
			}

			if (
				error.includes('required') ||
				error.includes('Invalid adjustment type') ||
				error.includes('positive integer') ||
				error.includes('Reason must')
			) {
				throw new BadRequestException(error);
			}

			throw new InternalServerErrorException(error);
		}

		return result.getValue();
	}
}
