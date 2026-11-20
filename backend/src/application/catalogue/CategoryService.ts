import { Inject, Injectable } from '@nestjs/common';
import { ICategoryRepository } from './ICategoryRepository';
import { CreateCategoryDTO, UpdateCategoryDTO, CategoryResponseDTO } from './CategoryDTOs';
import { ProductCategory } from '../../domain/product/product-category/ProductCategory';
import { CategoryName } from '../../domain/product/product-category/CategoryName';
import { Result } from '../../domain/common/Result';

@Injectable()
export class CategoryService {
	constructor(
		@Inject('ICategoryRepository')
		private readonly categoryRepo: ICategoryRepository
	) {}

	public async createCategory(dto: CreateCategoryDTO): Promise<Result<CategoryResponseDTO>> {
		const nameResult = CategoryName.create(dto.name);
		const nameExists = await this.categoryRepo.findByName(nameResult);
		if (nameExists) {
			return Result.fail<CategoryResponseDTO>('Category name already exists');
		}

		const category = ProductCategory.create({
			name: nameResult,
			description: dto.description ?? '',
		});

		await this.categoryRepo.save(category);
		return Result.ok<CategoryResponseDTO>(this.toDTO(category));
	}

	public async getCategories(search?: string): Promise<Result<CategoryResponseDTO[]>> {
		const categories = await this.categoryRepo.findAll(search);
		return Result.ok<CategoryResponseDTO[]>(categories.map((c) => this.toDTO(c)));
	}

	public async getCategoryByName(raw: string): Promise<Result<CategoryResponseDTO>> {
		const name = CategoryName.create(raw);
		const category = await this.categoryRepo.findByName(name);
		if (!category) return Result.fail<CategoryResponseDTO>('Category not found');
		return Result.ok<CategoryResponseDTO>(this.toDTO(category));
	}

	public async updateCategory(raw: string, dto: UpdateCategoryDTO): Promise<Result<CategoryResponseDTO>> {
		const currentName = CategoryName.create(raw);
		const category = await this.categoryRepo.findByName(currentName);
		if (!category) return Result.fail<CategoryResponseDTO>('Category not found');

		const newName = CategoryName.create(dto.name);

		if (newName.value !== currentName.value) {
			const existing = await this.categoryRepo.findByName(newName);
			if (existing) {
				return Result.fail<CategoryResponseDTO>('Category name already exists');
			}

			const isReferenced = await this.categoryRepo.isReferencedByProducts(currentName);
			if (isReferenced) {
				return Result.fail<CategoryResponseDTO>('Category is referenced by existing products and cannot be renamed');
			}
			await this.categoryRepo.delete(currentName);
		}

		const updatedCategory = ProductCategory.create({
			name: newName,
			description: dto.description,
		});

		await this.categoryRepo.save(updatedCategory);
		return Result.ok<CategoryResponseDTO>(this.toDTO(updatedCategory));
	}

	public async deleteCategory(raw: string): Promise<Result<void>> {
		const name = CategoryName.create(raw);
		const category = await this.categoryRepo.findByName(name);
		if (!category) return Result.fail<void>('Category not found');

		const isReferenced = await this.categoryRepo.isReferencedByProducts(name);
		if (isReferenced) {
			return Result.fail<void>('Category is referenced by existing products and cannot be deleted');
		}

		await this.categoryRepo.delete(name);
		return Result.ok<void>();
	}

	private toDTO(value: ProductCategory): CategoryResponseDTO {
		return {
			name: value.name.value,
			description: value.description,
		};
	}
}