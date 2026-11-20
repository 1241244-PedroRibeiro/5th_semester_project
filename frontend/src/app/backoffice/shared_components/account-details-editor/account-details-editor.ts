import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import type { User } from '../../../shared_components/core/api/models';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { BackofficeApi, errorMessage } from '../../core/api/backoffice-api';
import { validPassword } from '../../../shared_components/core/auth/password-policy';

export type AccountEditMode = 'name' | 'email' | 'password';

@Component({
	selector: 'app-account-details-editor',
	standalone: true,
	imports: [TranslatePipe, FormsModule, Modal],
	templateUrl: './account-details-editor.html',
})
export class AccountDetailsEditor implements OnInit {
	readonly mode = input.required<AccountEditMode>();
	readonly user = input.required<User>();
	readonly closed = output<void>();
	readonly saved = output<User>();
	private readonly api = inject(BackofficeApi);
	private readonly destroy = inject(DestroyRef);
	readonly busy = signal(false);
	readonly error = signal('');
	firstName = '';
	lastName = '';
	email = '';
	currentPassword = '';
	newPassword = '';
	confirmation = '';
	ngOnInit() {
		this.firstName = this.user().firstName;
		this.lastName = this.user().lastName;
		this.email = this.user().email;
	}
	title() {
		return `Change ${this.mode() === 'name' ? 'name' : this.mode() === 'email' ? 'email' : 'password'}`;
	}
	passwordValid() {
		return validPassword(this.newPassword) && this.newPassword === this.confirmation;
	}
	valid() {
		return this.mode() === 'name'
			? !!this.firstName.trim() && !!this.lastName.trim()
			: this.mode() === 'email'
				? !!this.currentPassword && !!this.email.trim()
				: !!this.currentPassword && this.passwordValid();
	}
	save() {
		if (this.busy() || !this.valid()) return;
		const request =
			this.mode() === 'name'
				? this.api.saveOwnName({ firstName: this.firstName.trim(), lastName: this.lastName.trim() })
				: this.mode() === 'email'
					? this.api.saveOwnEmail({
							email: this.email.trim(),
							currentPassword: this.currentPassword,
						})
					: this.api.saveOwnPassword({
							currentPassword: this.currentPassword,
							newPassword: this.newPassword,
						});
		this.busy.set(true);
		this.error.set('');
		request
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => {
					this.busy.set(false);
					this.currentPassword = this.newPassword = this.confirmation = '';
				}),
			)
			.subscribe({
				next: (user) => this.saved.emit(user),
				error: (e) => this.error.set(errorMessage(e)),
			});
	}
}
