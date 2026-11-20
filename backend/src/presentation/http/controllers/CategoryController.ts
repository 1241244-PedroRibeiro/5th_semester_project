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
import { CategoryService } from '../../../application/catalogue/CategoryService';
import { UpdateCategoryDTO } from '../../../application/catalogue/CategoryDTOs';
import { RolesGuard } from '../middlewares/roles.guard';
import { Roles, Public } from '../middlewares/decorators';
import { UserRole } from '../../../application/user/UserRoles';
import { ProductCategoryService } from '../../../application/product/category-services/ProductCategoryService';
import { CategoryDto } from '../../../application/product/category-services/ProductCategoryUtils';
import { createPage, PageRequest } from '../../../domain/common/Pagination';

@Controller('categories')
export class CategoryController {
	constructor(
		@Inject('CategoryService')
		private readonly categoryService: CategoryService,
		private readonly productCategories: ProductCategoryService,
	) {}

	// Consulta pública (permitida a qualquer utilizador anónimo ou autenticado)
	@Get()
	@Public()
	async getAll(
		@Query('search') search?: string,
		@Query('page') page?: unknown,
		@Query('pageSize') pageSize?: unknown,
	) {
		if (search !== undefined && typeof search !== 'string')
			throw new BadRequestException('search must be a string.');
		const pagination = page === undefined && pageSize === undefined
			? undefined
			: PageRequest.create(this.readOptionalNumber(page), this.readOptionalNumber(pageSize));
		const result = await this.categoryService.getCategories(search);
		const categories = result.getValue();
		return pagination
			? createPage(
				categories.slice(pagination.offset, pagination.offset + pagination.pageSize),
				categories.length,
				pagination,
			)
			: categories;
	}

	@Get(':name')
	@Public()
	async getById(@Param('name') name: string) {
		const result = await this.categoryService.getCategoryByName(name);
		if (result.isFailure) throw new NotFoundException(result.getError());
		return result.getValue();
	}

	// Operações de gestão restritas a MANAGER (BCK03)
	@Post()
	@UseGuards(RolesGuard)
	@Roles(UserRole.MANAGER)
	@HttpCode(HttpStatus.CREATED)
	async addCategory(@Body() body: unknown): Promise<CategoryDto> {
		const name = this.readCategoryName(body);
		const description = (body as { description?: unknown }).description;
		if (description !== undefined && typeof description !== 'string') {
			throw new BadRequestException('description must be a string.');
		}
		return this.productCategories.addCategory(name, description);
	}

	@Put(':name')
	@UseGuards(RolesGuard)
	@Roles(UserRole.MANAGER)
	async update(@Param('name') name: string, @Body() body: UpdateCategoryDTO) {
		if (!body.name || !body.description) {
			throw new BadRequestException('Name and description are required');
		}

		const result = await this.categoryService.updateCategory(name, body);
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
		const result = await this.categoryService.deleteCategory(name);
		if (result.isFailure) {
			const err = result.getError();
			if (err.includes('not found')) throw new NotFoundException(err);
			if (err.includes('referenced by existing products')) throw new ConflictException(err);
			throw new BadRequestException(err);
		}
		return { message: 'Category removed successfully' };
	}

	private readOptionalNumber(value: unknown): number | undefined {
		if (value === undefined) return undefined;
		if (typeof value !== 'string' || value.trim() === '')
			throw new BadRequestException('Pagination values must be numbers.');
		return Number(value);
	}

	private readCategoryName(body: unknown): string {
		if (typeof body !== 'object' || body === null
			|| !('categoryName' in body) || typeof body.categoryName !== 'string')
			throw new BadRequestException('categoryName must be a string.');
		return body.categoryName;
	}
}
