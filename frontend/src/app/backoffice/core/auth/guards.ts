import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../../shared_components/core/auth/auth';

export const staffGuard: CanActivateFn = (_, state) => {
	const auth = inject(Auth);
	const router = inject(Router);
	if (auth.staff()) return true;
	if (auth.user()?.roles.includes('CUSTOMER')) return router.createUrlTree(['/']);
	return router.createUrlTree(['/backoffice/login'], { queryParams: { returnUrl: state.url } });
};
export const managerGuard: CanActivateFn = () =>
	inject(Auth).manager() || inject(Router).createUrlTree(['/unauthorized']);

export const administratorGuard: CanActivateFn = () =>
	inject(Auth).administrator() || inject(Router).createUrlTree(['/unauthorized']);

export const restaurantGuard: CanActivateFn = () =>
	inject(Auth).restaurant() || inject(Router).createUrlTree(['/unauthorized']);

export const invitationGuard: CanActivateFn = () =>
	inject(Auth).administrator() ||
	inject(Auth).manager() ||
	inject(Router).createUrlTree(['/unauthorized']);
