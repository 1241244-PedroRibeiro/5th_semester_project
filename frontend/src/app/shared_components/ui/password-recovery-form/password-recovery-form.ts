import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Auth } from '../../core/auth/auth';
import { validPassword } from '../../core/auth/password-policy';
import { errorMessage } from '../../core/api/api-errors';
import { Icon } from '../icon/icon';

@Component({
	selector: 'app-password-recovery-form',
	standalone: true,
	imports: [TranslatePipe, FormsModule, Icon],
	templateUrl: './password-recovery-form.html',
	styleUrl: './password-recovery-form.scss',
})
export class PasswordRecoveryForm implements OnInit {
	readonly initialEmail = input('');
	readonly customer = input(false);
	readonly closed = output<void>();
	private readonly auth = inject(Auth);
	private readonly destroy = inject(DestroyRef);
	readonly stage = signal<'request' | 'reset' | 'done'>('request');
	readonly busy = signal(false);
	readonly error = signal('');
	readonly errorReason = signal('');
	readonly retryMinutes = signal(0);
	readonly notice = signal('');
	readonly visible = signal(false);
	email = '';
	code = '';
	password = '';
	confirmation = '';
	ngOnInit(): void {
		this.email = this.initialEmail();
	}

	canReset(): boolean {
		return (
			/^[a-f0-9]{64}$/i.test(this.code.trim()) &&
			validPassword(this.password) &&
			this.password.length <= 128 &&
			this.password === this.confirmation
		);
	}

	requestCode(): void {
		if (this.busy()) return;
		this.busy.set(true);
		this.error.set('');
		this.notice.set('');
		this.auth
			.requestPasswordRecovery(this.email.trim())
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.busy.set(false)),
			)
			.subscribe({
				next: (result) => {
					this.notice.set(result.message);
					this.stage.set('reset');
				},
				error: (error) => {
					const message = errorMessage(error);
					const cooldown =
						/^A recovery code was requested recently\. Please wait (\d+) minute\(s\) before requesting another\.$/.exec(
							message,
						);
					if (cooldown) {
						this.retryMinutes.set(Number(cooldown[1]));
						this.error.set(
							'A recovery code was requested recently. Please wait {{minutes}} minute(s) before requesting another.',
						);
					} else this.error.set(message);
				},
			});
	}

	resetPassword(): void {
		if (this.busy() || !this.canReset()) return;
		this.busy.set(true);
		this.error.set('');
		this.auth
			.resetPassword(this.code.trim(), this.password)
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.busy.set(false)),
			)
			.subscribe({
				next: (result) => {
					this.code = '';
					this.password = '';
					this.confirmation = '';
					this.notice.set(result.message);
					this.stage.set('done');
				},
				error: (error) => {
					this.errorReason.set(errorMessage(error));
					this.error.set(
						error.status === 410
							? '{{reason}} You can request another code 30 minutes after your previous request.'
							: errorMessage(error),
					);
				},
			});
	}

	enterCode(): void {
		this.error.set('');
		this.notice.set('');
		this.stage.set('reset');
	}
	requestAgain(): void {
		this.error.set('');
		this.notice.set('');
		this.code = '';
		this.stage.set('request');
	}
}
