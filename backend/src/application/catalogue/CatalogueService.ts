import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
	CATALOGUE_REPOSITORY,
	ICatalogueRepository,
} from './ICatalogueRepository';
import {
	CatalogueFilterQuery,
	CatalogueItemDTO,
} from './CatalogueDTOs';

@Injectable()
export class CatalogueService {
	constructor(
		@Inject(CATALOGUE_REPOSITORY)
		private readonly catalogueRepository: ICatalogueRepository,
	) {}

	async getCatalogue(
		filters: CatalogueFilterQuery = {},
	): Promise<CatalogueItemDTO[]> {
		const items = await this.catalogueRepository.findAll();

		const categoryName = filters.categoryName
			?.trim()
			.toUpperCase();

		const excludedAllergens = new Set(
			(filters.excludeAllergens ?? [])
				.map((code) => code.trim().toUpperCase())
				.filter((code) => code.length > 0),
		);

		return items
			.map((item) => this.withDerivedAvailability(item))
			.filter(
				(item) =>
					!categoryName ||
					item.categoryName.trim().toUpperCase() === categoryName,
			)
			.filter(
				(item) =>
					!item.allergens.some((allergen) =>
						excludedAllergens.has(allergen.trim().toUpperCase()),
					),
			)
			.filter(
				(item) => filters.availableOnly !== true || item.isAvailable,
			);
	}

	async getCatalogueItemByCode(
		productSku: string,
	): Promise<CatalogueItemDTO> {
		const item = await this.catalogueRepository.findByProductSku(
			productSku.trim(),
		);

		if (!item) {
			throw new NotFoundException(
				`Catalogue product '${productSku}' was not found`,
			);
		}

		return this.withDerivedAvailability(item);
	}

	private withDerivedAvailability(
		item: CatalogueItemDTO,
	): CatalogueItemDTO {
		if (!item.isPredefinedPizza) {
			return item;
		}

		const isAvailable = (item.sizeVariants ?? []).some(
			(variant) => variant.isAvailable,
		);

		return {
			...item,
			isAvailable,
		};
	}
}
