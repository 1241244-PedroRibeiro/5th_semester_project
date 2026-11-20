import type { ResourceConfig } from '../../shared_components/resource-management/resources';

export const pizzaComponentsConfig: ResourceConfig = {
	path: 'pizza-component-types',
	title: 'Pizza Component Types',
	singular: 'Component type',
	description: 'Define assembly order and ingredient limits for your recipes.',
	editable: true,
	component: true,
};
