import {
	BadRequestException,
	Controller,
	Get,
	Param,
	Query,
} from '@nestjs/common';

import { CatalogueService } from '../../../application/catalogue/CatalogueService';
import { CatalogueFilterQuery } from '../../../application/catalogue/CatalogueDTOs';
import { Public } from '../middlewares/decorators';

@Controller('catalogue')
export class CatalogueController {
	constructor(
		private readonly catalogueService: CatalogueService,
	) {}

	@Get()
	@Public()
	async getCatalogue(
		@Query('category') categoryName?: string,
		@Query('excludeAllergens') excludeAllergensParam?: string,
		@Query('availableOnly') availableOnlyParam?: string,
	) {
		const filters: CatalogueFilterQuery = {};

		if (categoryName !== undefined) {
			filters.categoryName = categoryName;
		}

		if (excludeAllergensParam !== undefined) {
			filters.excludeAllergens = excludeAllergensParam
				.split(',')
				.map((code) => code.trim())
				.filter((code) => code.length > 0);
		}

		if (availableOnlyParam !== undefined) {
			const value = availableOnlyParam.trim().toLowerCase();

			if (value !== 'true' && value !== 'false') {
				throw new BadRequestException(
					'availableOnly must be true or false',
				);
			}

			filters.availableOnly = value === 'true';
		}

		return this.catalogueService.getCatalogue(filters);
	}

	@Get(':productSku')
	@Public()
	async getCatalogueItemByCode(
		@Param('productSku') productSku: string,
	) {
		return this.catalogueService.getCatalogueItemByCode(productSku);
	}
}
