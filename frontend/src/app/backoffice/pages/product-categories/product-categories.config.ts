import type { ResourceConfig } from '../../shared_components/resource-management/resources';

export const productCategoriesConfig: ResourceConfig = {
	path: 'categories',
	title: 'Product Categories',
	singular: 'Product category',
	description: 'Organise your products into reusable categories.',
	editable: true,
	descriptionField: true,
};
