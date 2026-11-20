import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, of, switchMap, tap } from 'rxjs';
import { Auth } from '../../../shared_components/core/auth/auth';
import { StorefrontApi } from '../../core/storefront-api';
import { CustomerProfile } from '../../core/customer-profile';
import { errorMessage } from '../../../shared_components/core/api/api-errors';
import { StorefrontBrand } from '../storefront-brand/storefront-brand';
import { StorefrontButton } from '../storefront-button/storefront-button';
import { PasswordRules, validPassword } from '../password-rules/password-rules';
import { PasswordRecoveryForm } from '../../../shared_components/ui/password-recovery-form/password-recovery-form';
import { Icon } from '../../../shared_components/ui/icon/icon';
import { rememberExternalAuthReturnUrl } from '../../core/auth/external-auth-return-url';
import { PhoneNumberInput } from '../phone-number-input/phone-number-input';

@Component({
	selector: 'app-customer-auth-page',
	standalone: true,
	imports: [
		TranslatePipe,
		FormsModule,
		RouterLink,
		StorefrontBrand,
		StorefrontButton,
		PasswordRules,
		PasswordRecoveryForm,
		Icon,
		PhoneNumberInput,
	],
	templateUrl: './customer-auth-page.html',
	styleUrl: './customer-auth-page.scss',
})
export class CustomerAuthPage {
	readonly auth = inject(Auth);
	private readonly api = inject(StorefrontApi);
	private readonly profile = inject(CustomerProfile);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);
	private readonly destroy = inject(DestroyRef);
	readonly registration = this.route.snapshot.data['registration'] === true;
	readonly step = signal(1);
	readonly busy = signal(false);
	readonly error = signal('');
	readonly errorReason = signal('');
	readonly visible = signal(false);
	readonly forgot = signal(false);
	readonly created = signal(false);
	firstName = '';
	lastName = '';
	email = '';
	phone = '';
	password = '';
	confirmation = '';
	remember = false;
	passwordValid() {
		return validPassword(this.password) && this.password === this.confirmation;
	}
	login() {
		this.busy.set(true);
		this.error.set('');
		this.auth
			.login({ email: this.email.trim(), password: this.password }, this.remember)
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.busy.set(false)),
			)
			.subscribe({
				next: () => {
					this.password = '';
					this.navigate();
				},
				error: (e) => this.error.set(errorMessage(e)),
			});
	}
	register() {
		if (!this.passwordValid()) return;
		this.busy.set(true);
		this.error.set('');
		this.auth
			.register({
				firstName: this.firstName.trim(),
				lastName: this.lastName.trim(),
				email: this.email.trim(),
				password: this.password,
			})
			.pipe(
				tap(() => {
					this.created.set(true);
					this.password = '';
					this.confirmation = '';
				}),
				switchMap(() =>
					this.phone.trim()
						? this.api
								.savePhone(this.phone.trim())
								.pipe(tap((result) => this.profile.remember(result)))
						: of(null),
				),
				takeUntilDestroyed(this.destroy),
				finalize(() => this.busy.set(false)),
			)
			.subscribe({
				next: () => this.navigate(),
				error: (e) => {
					this.errorReason.set(errorMessage(e));
					this.error.set(
						this.created()
							? 'Your account was created, but the phone number was not saved. You can update it in My account. {{reason}}'
							: errorMessage(e),
					);
				},
			});
	}
	private navigate() {
		const target = this.route.snapshot.queryParamMap.get('returnUrl');
		const safe =
			target &&
			['/account', '/order', '/menu', '/'].includes(target.split('?')[0]) &&
			!target.startsWith('//');
		void this.router.navigateByUrl(safe ? target : this.registration ? '/account' : '/menu');
	}

	loginWithGoogle(): void {
		rememberExternalAuthReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
		window.location.href = '/api/auth/external/login';
	}
}
