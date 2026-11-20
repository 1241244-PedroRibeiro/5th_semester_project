import { CatalogueItemDTO } from './CatalogueDTOs';

export const CATALOGUE_REPOSITORY = 'ICatalogueRepository';

export interface ICatalogueRepository {
	findAll(): Promise<CatalogueItemDTO[]>;

	findByProductSku(
		productSku: string,
	): Promise<CatalogueItemDTO | null>;
}
