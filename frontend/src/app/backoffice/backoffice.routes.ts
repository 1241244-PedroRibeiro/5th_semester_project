import { productCategoriesConfig } from './pages/product-categories/product-categories.config';
import { pizzaComponentsConfig } from './pages/pizza-components/pizza-components.config';
import { pizzaSizesConfig } from './pages/pizza-sizes/pizza-sizes.config';
import { allergensConfig } from './pages/allergens/allergens.config';
import type { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../shared_components/core/auth/auth';
import { invitationGuard, managerGuard, restaurantGuard, staffGuard } from './core/auth/guards';

export const backofficeRoutes: Routes = [
	{
		path: 'backoffice/login',
		title: 'Sign in · Forno',
		loadComponent: () => import('./pages/login/login-page').then((m) => m.StaffLoginPage),
	},
	{
		path: 'backoffice/register',
		title: 'Create account · Forno',
		data: { registration: true },
		loadComponent: () => import('./pages/register/register-page').then((m) => m.StaffRegisterPage),
	},
	{
		path: 'status',
		title: 'Service status · Forno',
		loadComponent: () => import('./pages/status/status').then((m) => m.Status),
	},
	{
		path: 'backoffice',
		canActivate: [staffGuard],
		loadComponent: () => import('./shared_components/layout/backoffice').then((m) => m.Backoffice),
		children: [
			{
				path: 'ai-config',
				canActivate: [managerGuard],
				title: 'AI planning · Forno',
				loadComponent: () =>
					import('./pages/ai-config/ai-config-page').then((m) => m.AiConfigPage),
			},
			{
				path: 'kitchen-configurations',
				canActivate: [managerGuard],
				title: 'Kitchen Configurations · Forno',
				loadComponent: () =>
					import('./pages/kitchen-configurations/kitchen-configurations')
						.then(m => m.KitchenConfigurations),
			},
			{
				path: 'kitchen',
				canActivate: [restaurantGuard],
				title: 'Kitchen Visualization · Forno',
				loadComponent: () => import('./pages/kitchen/kitchen-page').then((m) => m.KitchenPage),
			},

			{
				path: 'profile',
				title: 'My profile · Forno',
				loadComponent: () => import('./pages/profile/profile-page').then((m) => m.StaffProfilePage),
			},
			{
				path: '',
				pathMatch: 'full',
				redirectTo: () =>
					inject(Auth).manager() ? 'products' : inject(Auth).administrator() ? 'users' : 'orders',
			},
			{
				path: 'orders',
				canActivate: [restaurantGuard],
				title: 'Orders · Forno',
				loadComponent: () => import('./pages/orders/orders').then((m) => m.Orders),
			},
			{
				path: 'access',
				pathMatch: 'full',
				redirectTo: '/unauthorized',
			},
			{
				path: 'customers',
				canActivate: [managerGuard],
				title: 'Customer Management · Forno',
				loadComponent: () => import('./pages/customers/customers').then((m) => m.Customers),
			},
			{
				path: 'stock',
				canActivate: [restaurantGuard],
				title: 'Stock Management · Forno',
				loadComponent: () => import('./pages/stock/stock').then((m) => m.Stock),
			},
			{
				path: 'products',
				canActivate: [restaurantGuard],
				title: 'Products · Forno',
				loadComponent: () => import('./pages/products/products').then((m) => m.Products),
			},
			{
				path: 'users',
				canActivate: [invitationGuard],
				title: 'Users · Forno',
				loadComponent: () => import('./pages/users/users').then((m) => m.Users),
			},
			{
				path: 'pizzas',
				canActivate: [managerGuard],
				title: 'Pizza recipes · Forno',
				loadComponent: () => import('./pages/pizzas/pizzas').then((m) => m.Pizzas),
			},
			{
				path: 'component-configurations',
				canActivate: [managerGuard],
				title: 'Size configurations · Forno',
				loadComponent: () =>
					import('./pages/configurations/configurations').then((m) => m.Configurations),
			},
			{
				path: 'product-types',
				pathMatch: 'full',
				redirectTo: 'product-categories',
			},
			{
				path: 'product-categories',
				canActivate: [managerGuard],
				title: 'Product categories · Forno',
				loadComponent: () =>
					import('./pages/product-categories/product-categories-page').then(
						(m) => m.ProductCategoriesPage,
					),
				data: { resource: productCategoriesConfig },
			},
			{
				path: 'pizza-components',
				canActivate: [managerGuard],
				title: 'Pizza components · Forno',
				loadComponent: () =>
					import('./pages/pizza-components/pizza-components-page').then(
						(m) => m.PizzaComponentsPage,
					),
				data: { resource: pizzaComponentsConfig },
			},
			{
				path: 'pizza-sizes',
				canActivate: [restaurantGuard],
				title: 'Pizza sizes · Forno',
				loadComponent: () =>
					import('./pages/pizza-sizes/pizza-sizes-page').then((m) => m.PizzaSizesPage),
				data: { resource: pizzaSizesConfig },
			},
			{
				path: 'allergens',
				canActivate: [managerGuard],
				title: 'Allergens · Forno',
				loadComponent: () =>
					import('./pages/allergens/allergens-page').then((m) => m.AllergensPage),
				data: { resource: allergensConfig },
			},
		],
	},
];
