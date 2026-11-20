import type { Routes } from '@angular/router';
import { backofficeRoutes } from './backoffice/backoffice.routes';
import { frontofficeRoutes } from './frontoffice/frontoffice.routes';

export const routes: Routes = [
	{
		path: 'auth/activate',
		title: 'Activate your account · LaPrizza',
		loadComponent: () =>
			import('./shared_components/pages/activate-account/activate-account').then(
				(m) => m.ActivateAccountPage,
			),
	},
	{
		path: 'auth/activate-external',
		title: 'Activate your account · LaPrizza',
		loadComponent: () =>
			import('./shared_components/pages/activate-external/activate-external').then(
				(m) => m.ActivateExternalPage,
			),
	},
	{
		path: 'auth/callback',
		title: 'A autenticar · LaPrizza',
		loadComponent: () =>
			import('./shared_components/pages/auth-callback/auth-callback').then(
				(m) => m.AuthCallbackPage,
			),
	},
	{
		path: 'unauthorized',
		title: 'Access denied · LaPrizza',
		loadComponent: () =>
			import('./shared_components/pages/unauthorized/unauthorized-page').then(
				(m) => m.UnauthorizedPage,
			),
	},
	...backofficeRoutes,
	...frontofficeRoutes,
	{ path: '**', redirectTo: '' },
];