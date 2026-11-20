import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Auth } from '../../../shared_components/core/auth/auth';
import { errorMessage } from '../../core/api/backoffice-api';
import { PasswordRecoveryForm } from '../../../shared_components/ui/password-recovery-form/password-recovery-form';
import { Brand } from '../brand/brand';
import { Icon } from '../../../shared_components/ui/icon/icon';
@Component({
	selector: 'app-auth-page',
	standalone: true,
	imports: [TranslatePipe, FormsModule, RouterLink, Brand, Icon, PasswordRecoveryForm],
	templateUrl: './auth-page.html',
	styleUrl: './auth-page.scss',
})
export class AuthPage {
	private readonly auth = inject(Auth);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);
	private readonly destroy = inject(DestroyRef);
	readonly registration = this.route.snapshot.data['registration'] === true;
	readonly busy = signal(false);
	readonly forgot = signal(false);
	readonly error = signal('');
	readonly success = signal('');
	readonly visible = signal(false);
	firstName = '';
	lastName = '';
	email = '';
	password = '';
	remember = false;
	submit() {
		this.error.set('');
		this.success.set('');
		this.busy.set(true);
		const request = this.registration
			? this.auth.register({
					firstName: this.firstName.trim(),
					lastName: this.lastName.trim(),
					email: this.email.trim(),
					password: this.password,
				})
			: this.auth.login({ email: this.email.trim(), password: this.password }, this.remember);
		request
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.busy.set(false)),
			)
			.subscribe({
				next: async () => {
					this.password = '';
					if (!this.auth.staff()) {
						if (!(await this.auth.logout())) {
							this.error.set(this.auth.logoutError());
							return;
						}
						this.success.set(
							this.registration
								? 'Your account is ready. Backoffice access requires an Administrator, LaPrizza Manager or Restaurant Staff invitation. Ask your website administrator to invite your work email.'
								: 'This account does not have backoffice access. Sign in with an active Administrator, LaPrizza Manager or Restaurant Staff account.',
						);
						return;
					}
					const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
					void this.router.navigateByUrl(
						returnUrl?.startsWith('/backoffice/')
							? returnUrl
							: this.auth.manager()
								? '/backoffice/products'
								: this.auth.administrator()
									? '/backoffice/users'
									: '/backoffice/orders',
					);
				},
				error: (error) => this.error.set(errorMessage(error)),
			});
	}

	loginWithGoogle(): void {
		window.location.href = '/api/auth/external/login';
	}
}
