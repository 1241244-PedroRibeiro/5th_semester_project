import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { Auth } from '../../../shared_components/core/auth/auth';
import { StorefrontApi } from '../../core/storefront-api';
import { CustomerProfile } from '../../core/customer-profile';
import { errorMessage } from '../../../shared_components/core/api/api-errors';
import { AddressEditor } from '../../shared_components/address-editor/address-editor';
import { PhoneEditor } from '../../shared_components/phone-editor/phone-editor';
import { AllergyEditor } from '../../shared_components/allergy-editor/allergy-editor';
import { CredentialEditor } from '../../shared_components/credential-editor/credential-editor';
import { AllergenChips } from '../../shared_components/allergen-chips/allergen-chips';
import { ServiceUnavailableDialog } from '../../shared_components/service-unavailable-dialog/service-unavailable-dialog';
import { StorefrontButton } from '../../shared_components/storefront-button/storefront-button';
import { Icon } from '../../../shared_components/ui/icon/icon';

@Component({
	selector: 'app-account-page',
	standalone: true,
	imports: [
		TranslatePipe,
		RouterLink,
		AddressEditor,
		PhoneEditor,
		AllergyEditor,
		CredentialEditor,
		AllergenChips,
		ServiceUnavailableDialog,
		StorefrontButton,
		Icon,
	],
	templateUrl: './account-page.html',
	styleUrl: './account-page.scss',
})
export class AccountPage {
	readonly auth = inject(Auth);
	readonly profile = inject(CustomerProfile);
	private readonly api = inject(StorefrontApi);
	private readonly router = inject(Router);
	private readonly destroy = inject(DestroyRef);
	readonly allergies = signal<string[]>([]);
	readonly loading = signal(true);
	readonly error = signal('');
	readonly allergyError = signal('');
	readonly notice = signal('');
	readonly dialog = signal<
		'address' | 'phone' | 'allergies' | 'password' | 'email' | 'history' | null
	>(null);
	constructor() {
		this.load();
	}
	load() {
		const user = this.auth.user();
		if (!user) return;
		this.loading.set(true);
		this.error.set('');
		this.allergyError.set('');
		// Own dietary restrictions are a customer feature; the manager path only reads customer records.
		const canReadAllergies = user.roles.includes('CUSTOMER');
		forkJoin({
			profile: this.api.profile(),
			allergies: canReadAllergies
				? this.api.userAllergies(user.username).pipe(
						catchError((e) => {
							this.allergyError.set(errorMessage(e));
							return of(null);
						}),
					)
				: of(null),
		})
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (result) => {
					this.profile.remember(result.profile);
					if (result.allergies) this.allergies.set(result.allergies.allergens);
				},
				error: (e) => this.error.set(errorMessage(e)),
			});
	}
	saved(message: string) {
		this.dialog.set(null);
		this.notice.set(message);
	}
	savedAllergies(names: string[]) {
		this.allergies.set(names);
		this.saved('Your allergies have been saved.');
	}
	async logout() {
		if (!(await this.auth.logout())) return;
		void this.router.navigate(['/']);
	}
	initials() {
		const user = this.auth.user();
		return `${user?.firstName[0] ?? ''}${user?.lastName[0] ?? ''}`;
	}
}
