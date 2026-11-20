import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Brand } from '../../../backoffice/shared_components/brand/brand';

@Component({
	selector: 'app-activate-account',
	standalone: true,
	imports: [FormsModule, RouterLink, TranslatePipe, Brand],
	templateUrl: './activate-account.html',
	styleUrl: './activate-account.scss',
})
export class ActivateAccountPage {
	private readonly http = inject(HttpClient);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroy = inject(DestroyRef);
	readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
	readonly loading = signal(true);
	readonly busy = signal(false);
	readonly valid = signal(false);
	readonly email = signal('');
	readonly error = signal('');
	readonly success = signal(false);
	password = '';
	confirmPassword = '';

	constructor() {
		if (!this.token) {
			this.loading.set(false);
			this.error.set('This invitation link is missing its token.');
			return;
		}
		this.http.get<{ maskedEmail: string; valid: boolean }>('/api/auth/invitation/' + encodeURIComponent(this.token))
			.pipe(takeUntilDestroyed(this.destroy))
			.subscribe({
				next: value => { this.email.set(value.maskedEmail); this.valid.set(value.valid); this.loading.set(false); },
				error: error => { this.error.set(this.message(error)); this.loading.set(false); },
			});
	}

	submit(): void {
		this.error.set('');
		if (this.password !== this.confirmPassword) {
			this.error.set('The passwords do not match.');
			return;
		}
		this.busy.set(true);
		this.http.post('/api/auth/activate', { token: this.token, password: this.password })
			.pipe(takeUntilDestroyed(this.destroy))
			.subscribe({
				next: () => { this.success.set(true); this.busy.set(false); this.password = ''; this.confirmPassword = ''; },
				error: error => { this.error.set(this.message(error)); this.busy.set(false); },
			});
	}

	goToLogin(): void {
		void this.router.navigateByUrl('/backoffice/login');
	}

	private message(error: unknown): string {
		if (!(error instanceof HttpErrorResponse)) return 'The invitation could not be checked. Please try again.';
		if (error.status === 404) return 'This invitation does not exist.';
		if (error.status === 410) return 'This invitation has expired or was already used.';
		if (error.status === 409) return 'This account has already been activated.';
		if (error.status === 422) return 'The password does not meet the minimum requirements.';
		return 'The invitation could not be processed. Please try again.';
	}
}
