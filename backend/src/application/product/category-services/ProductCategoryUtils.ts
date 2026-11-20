import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProductCategory } from "../../../domain/product/product-category/ProductCategory";
import { CategoryName } from "../../../domain/product/product-category/valueObjects";
import { DomainError } from "../../../domain/common/DomainError";



/**
*  Turns an invalid name (domain rule) into an application error.
* @param categoryName
* @throws InvalidCategoryInputError
**/
export function parseName(raw: string): CategoryName {
	try {
		return CategoryName.create(raw);
	} catch (error) {
		if (error instanceof DomainError)
			throw new InvalidCategoryInputError(error.message);
		throw error;
	}
}

/** What the API sends to the client: only primitives, no domain classes. */
export interface CategoryDto {
	name: string;
}

/** Converts the domain aggregate into its DTO. */
export function toCategoryDto(category: ProductCategory): CategoryDto {
	return {
		name: category.name.value,
	};
}

//! ============== ERRORS ============== !//

export class InvalidCategoryInputError extends BadRequestException {
	constructor(message: string)
	{
		super(message);
		this.name = 'InvalidCategoryInputError';
	}
}

export class CategoryNotFoundError extends NotFoundException {
	constructor(message = 'Category not found.')
	{
		super(message);
		this.name = 'CategoryNotFoundError';
	}
}

export class CategoryAlreadyExistsError extends ConflictException {
	constructor(message = 'Category already exists.')
	{
		super(message);
		this.name = 'CategoryAlreadyExistsError';
	}
}

export class CategoryInUseError extends ConflictException {
	constructor(message = 'Category is in use by existing products.')
	{
		super(message);
		this.name = 'CategoryInUseError';
	}
}
