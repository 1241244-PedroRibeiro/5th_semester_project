import type { Routes } from '@angular/router';
import { customerGuard, customerOnlyGuard, customerPhoneGuard } from './core/auth/guards';

export const frontofficeRoutes: Routes = [
	{
		path: '',
		loadComponent: () =>
			import('./shared_components/storefront-layout/storefront-layout').then(
				(m) => m.StorefrontLayout,
			),
		children: [
			{
				path: '',
				pathMatch: 'full',
				title: 'LaPrizza · A slice above the rest',
				loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
			},
			{
				path: 'menu',
				title: 'Our menu · LaPrizza',
				loadComponent: () => import('./pages/menu/menu-page').then((m) => m.MenuPage),
			},
			{
				path: 'order',
				canActivate: [customerPhoneGuard],
				title: 'Your order · LaPrizza',
				loadComponent: () => import('./pages/order/order-page').then((m) => m.CustomerOrderPage),
			},
			{
				path: 'account',
				canActivate: [customerGuard, customerPhoneGuard],
				title: 'My account · LaPrizza',
				loadComponent: () => import('./pages/account/account-page').then((m) => m.AccountPage),
			},
			{
				path: 'login',
				title: 'Sign in · LaPrizza',
				loadComponent: () => import('./pages/login/login-page').then((m) => m.CustomerLoginPage),
			},
			{
				path: 'register',
				title: 'Register · LaPrizza',
				data: { registration: true },
				loadComponent: () =>
					import('./pages/register/register-page').then((m) => m.CustomerRegisterPage),
			},
			{
				path: 'complete-profile',
				canActivate: [customerOnlyGuard],
				title: 'Complete your profile · LaPrizza',
				loadComponent: () =>
					import('./pages/complete-profile/complete-profile-page').then((m) => m.CompleteProfilePage),
			},
		],
	},
];
