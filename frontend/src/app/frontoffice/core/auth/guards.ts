import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { Auth } from '../../../shared_components/core/auth/auth';
import { CustomerProfile } from '../customer-profile';

export const customerGuard: CanActivateFn = async (_, state) => {
	const auth = inject(Auth);
	const router = inject(Router);
	await auth.waitForSharedSession();
	return auth.user()?.status === 'ACTIVE' ||
		router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Require a server-confirmed phone before customers enter order or account actions. */
export const customerPhoneGuard: CanActivateFn = async (_, state) => {
	const auth = inject(Auth);
	const router = inject(Router);
	const profile = inject(CustomerProfile);
	await auth.waitForSharedSession();
	const user = auth.user();
	if (!user?.roles.includes('CUSTOMER')) return true;
	const completion = router.createUrlTree(['/complete-profile'], {
		queryParams: { returnUrl: state.url },
	});
	return firstValueFrom(profile.refresh().pipe(
		map((profile) => profile.phoneNumber ? true : completion),
		catchError(() => of(completion)),
	));
};

export const customerOnlyGuard: CanActivateFn = async (_, state) => {
	const auth = inject(Auth);
	const router = inject(Router);
	await auth.waitForSharedSession();
	const user = auth.user();
	if (!user || user.status !== 'ACTIVE')
		return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
	return user.roles.includes('CUSTOMER') || router.createUrlTree(['/menu']);
};
