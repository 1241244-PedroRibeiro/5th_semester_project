import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Auth } from '../../../shared_components/core/auth/auth';
import { errorMessage } from '../../../shared_components/core/api/api-errors';
import { CustomerProfile } from '../../core/customer-profile';
import { StorefrontApi } from '../../core/storefront-api';
import { StorefrontBrand } from '../../shared_components/storefront-brand/storefront-brand';
import { StorefrontButton } from '../../shared_components/storefront-button/storefront-button';
import { PhoneNumberInput } from '../../shared_components/phone-number-input/phone-number-input';

@Component({
	selector: 'app-complete-profile-page',
	standalone: true,
	imports: [TranslatePipe, FormsModule, StorefrontBrand, StorefrontButton, PhoneNumberInput],
	styleUrl: './complete-profile-page.scss',
	template: `
		<section class="profile-completion" aria-labelledby="profile-title">
			<div class="completion-card shop-panel">
				<div class="auth-brand"><app-storefront-brand /></div>
				<div class="completion-icon" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none">
						<path
							d="M7.2 3.8h2.1l1.2 4.1-1.7 1.4a14.3 14.3 0 0 0 5.9 5.9l1.4-1.7 4.1 1.2v2.1a2 2 0 0 1-2.2 2A16.7 16.7 0 0 1 5.2 6a2 2 0 0 1 2-2.2Z"
						/>
					</svg>
				</div>
				<p class="completion-eyebrow">{{ 'PROFILE SETUP' | translate }}</p>
				<h1 id="profile-title">{{ 'Before you order, one quick detail.' | translate }}</h1>
				<p class="completion-intro">
					{{ 'Add a phone number so the restaurant can reach you about your order.' | translate }}
				</p>
				@if (loading()) {
					<div class="profile-loading" role="status">
						<span class="loading-dot" aria-hidden="true"></span>
						{{ 'Checking your profile…' | translate }}
					</div>
				} @else {
					@if (error()) {
						<p class="shop-notice error" role="alert">{{ error() | translate }}</p>
					}
					<form #form="ngForm" (ngSubmit)="form.valid && save()">
						<fieldset class="completion-fields" [disabled]="busy()">
							<app-phone-number-input name="phone" [(ngModel)]="phone" [required]="true" />
							<button shopButton [disabled]="busy() || form.invalid">
								{{ busy() ? ('Saving…' | translate) : ('Save and continue' | translate) }}
							</button>
						</fieldset>
					</form>
				}
				<div class="completion-actions">
					<button type="button" class="shop-link" [disabled]="busy() || loading()" (click)="load()">
						{{ 'Retry profile check' | translate }}
					</button>
					<button type="button" class="shop-link" [disabled]="auth.loggingOut()" (click)="logout()">
						{{ 'Sign out' | translate }}
					</button>
				</div>
			</div>
		</section>
	`,
})
export class CompleteProfilePage {
	readonly auth = inject(Auth);
	private readonly api = inject(StorefrontApi);
	private readonly profile = inject(CustomerProfile);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroy = inject(DestroyRef);
	readonly loading = signal(false);
	readonly busy = signal(false);
	readonly error = signal('');
	phone = '';

	constructor() {
		this.load();
	}

	load() {
		this.loading.set(true);
		this.error.set('');
		this.profile
			.refresh()
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (contact) => {
					this.phone = contact.phoneNumber ?? '';
					if (contact.phoneNumber) this.continue();
				},
				error: (e) => this.error.set(errorMessage(e)),
			});
	}

	save() {
		const value = this.phone.trim();
		if (!/^\+[1-9]\d{6,14}$/.test(value)) {
			this.error.set('Enter a valid phone number.');
			return;
		}
		this.busy.set(true);
		this.error.set('');
		this.api
			.savePhone(value)
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.busy.set(false)),
			)
			.subscribe({
				next: (contact) => {
					this.profile.remember(contact);
					this.continue();
				},
				error: (e) => this.error.set(errorMessage(e)),
			});
	}

	async logout() {
		if (await this.auth.logout()) void this.router.navigate(['/']);
	}

	private continue() {
		const target = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/account';
		const allowed = ['/account', '/order', '/menu', '/'].includes(target.split('?')[0]);
		void this.router.navigateByUrl(allowed && !target.startsWith('//') ? target : '/account');
	}
}
