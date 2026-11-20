import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Brand } from '../../../backoffice/shared_components/brand/brand';

@Component({
	selector: 'app-activate-external',
	standalone: true,
	imports: [TranslatePipe, Brand],
	templateUrl: './activate-external.html',
	styleUrl: '../activate-account/activate-account.scss',
})
export class ActivateExternalPage {
	private readonly http = inject(HttpClient);
	private readonly route = inject(ActivatedRoute);
	private readonly destroy = inject(DestroyRef);
	readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
	readonly loading = signal(true);
	readonly valid = signal(false);
	readonly email = signal('');
	readonly error = signal('');

	constructor() {
		this.http.get<{ maskedEmail: string; valid: boolean }>('/api/auth/invitation/' + encodeURIComponent(this.token))
			.pipe(takeUntilDestroyed(this.destroy))
			.subscribe({
				next: value => { this.email.set(value.maskedEmail); this.valid.set(value.valid); this.loading.set(false); },
				error: error => { this.error.set(this.message(error)); this.loading.set(false); },
			});
	}

	continueWithProvider(): void {
		window.location.href = '/api/auth/external/login?invitationToken=' + encodeURIComponent(this.token);
	}

	private message(error: unknown): string {
		if (!(error instanceof HttpErrorResponse)) return 'The invitation could not be checked. Please try again.';
		if (error.status === 404) return 'This invitation does not exist.';
		if (error.status === 410) return 'This invitation has expired or was already used.';
		return 'The invitation could not be processed. Please try again.';
	}
}
