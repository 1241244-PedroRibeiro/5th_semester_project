import {
	Controller,
	Get,
	Post,
	Put,
	Patch,
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
import { ProductService } from '../../../application/product/ProductService';
import { CreateProductDTO, UpdateProductDTO } from '../../../application/product/ProductDTOs';
import { RolesGuard } from '../middlewares/roles.guard';
import { Roles, Public } from '../middlewares/decorators';
import { UserRole } from '../../../application/user/UserRoles';
import { ProductExportDTO, ProductExportService } from '../../../application/product/ProductExportService';
import { JwtAuthGuard } from '../middlewares/JwtAuthGuard';
import { StatusGuard } from '../middlewares/UserStatus.guard';

@Controller('products')
export class ProductController {
	constructor(
		private readonly productService: ProductService,
		private readonly productExportService: ProductExportService,
	) {}

	@Get()
	@Public()
	async getAll(
		@Query('category') categoryName?: string,
		@Query('allergen') allergenName?: string,
		@Query('componentType') componentTypeName?: string,
		@Query('name') name?: string,
	) {
		const result = await this.productService.getProducts({
			categoryName,
			allergenName,
			componentTypeName,
			name,
			activeOnly: false,
		});
		return result.getValue();
	}

	@Get('export')
	@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
	@Roles(UserRole.MANAGER)
	async exportForPlanning(): Promise<ProductExportDTO> {
		return this.productExportService.export();
	}

	@Get(':sku')
	@Public()
	async getByCode(@Param('sku') sku: string) {
		const result = await this.productService.getProductBySku(sku);
		if (result.isFailure) throw new NotFoundException(result.getError());
		return result.getValue();
	}

	@Post()
	@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
	@Roles(UserRole.MANAGER)
	@HttpCode(HttpStatus.CREATED)
	async create(@Body() body: CreateProductDTO) {
		const result = await this.productService.createProduct(body);
		if (result.isFailure) {
			const err = result.getError();
			if (err.includes('already exists') || err.includes('SKU already exists')) throw new ConflictException(err);
			throw new BadRequestException(err);
		}
		return result.getValue();
	}

	@Put(':sku')
	@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
	@Roles(UserRole.MANAGER)
	async update(@Param('sku') sku: string, @Body() body: UpdateProductDTO) {
		const result = await this.productService.updateProduct(sku, body);
		if (result.isFailure) {
			const err = result.getError();
			if (err.includes('not found')) throw new NotFoundException(err);
			if (err.includes('already exists')) throw new ConflictException(err);
			throw new BadRequestException(err);
		}
		return result.getValue();
	}

	@Patch(':sku/block')
	@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
	@Roles(UserRole.MANAGER)
	@HttpCode(HttpStatus.OK)
	async block(@Param('sku') sku: string) {
		const result = await this.productService.blockProduct(sku);
		if (result.isFailure) throw new NotFoundException(result.getError());
		return result.getValue();
	}

	@Patch(':sku/activate')
	@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
	@Roles(UserRole.MANAGER)
	@HttpCode(HttpStatus.OK)
	async activate(@Param('sku') sku: string) {
		const result = await this.productService.activateProduct(sku);
		if (result.isFailure) throw new NotFoundException(result.getError());
		return result.getValue();
	}

	@Post(':sku/allergens')
	@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
	@Roles(UserRole.MANAGER)
	@HttpCode(HttpStatus.OK)
	async addAllergen(
		@Param('sku') sku: string,
		@Body('allergenName') allergenName: string,
	) {
		if (!allergenName) throw new BadRequestException('allergenName is required');
		const result = await this.productService.associateAllergen(sku, allergenName);
		if (result.isFailure) throw new BadRequestException(result.getError());
		return result.getValue();
	}
}