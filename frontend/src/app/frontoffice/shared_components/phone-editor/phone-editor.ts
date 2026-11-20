import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { StorefrontApi } from '../../core/storefront-api';
import { CustomerProfile } from '../../core/customer-profile';
import { ContactProfile } from '../../core/storefront-models';
import { errorMessage } from '../../../shared_components/core/api/api-errors';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { StorefrontButton } from '../storefront-button/storefront-button';
import { PhoneNumberInput } from '../phone-number-input/phone-number-input';

@Component({
	selector: 'app-phone-editor',
	standalone: true,
	imports: [TranslatePipe, FormsModule, Modal, StorefrontButton, PhoneNumberInput],
	template: `<app-modal
		[title]="'Update phone number' | translate"
		[description]="'Choose your country and enter your national phone number.' | translate"
		[busy]="busy()"
		(closed)="closed.emit()"
		><form id="customer-phone" #form="ngForm" (ngSubmit)="form.valid && save()">
			<fieldset class="stack" [disabled]="busy()">
				<app-phone-number-input name="phone" [(ngModel)]="phone" [required]="true" />
				@if (error()) {
					<p class="shop-notice error" role="alert">{{ error() | translate }}</p>
				}
			</fieldset>
		</form>
		<div modal-actions class="row-actions">
			<button shopButton tone="secondary" [disabled]="busy()" (click)="closed.emit()">
				{{ 'Cancel' | translate }}</button
			><button shopButton type="submit" form="customer-phone" [disabled]="busy() || form.invalid">
				{{ busy() ? ('Saving…' | translate) : ('Save phone number' | translate) }}
			</button>
		</div></app-modal
	>`,
})
export class PhoneEditor {
	readonly closed = output<void>();
	readonly saved = output<ContactProfile>();
	private readonly api = inject(StorefrontApi);
	private readonly profile = inject(CustomerProfile);
	private readonly destroy = inject(DestroyRef);
	readonly busy = signal(false);
	readonly error = signal('');
	phone = this.profile.contact()?.phoneNumber ?? '';
	save() {
		this.busy.set(true);
		this.error.set('');
		this.api
			.savePhone(this.phone.trim())
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.busy.set(false)),
			)
			.subscribe({
				next: (result) => {
					this.profile.remember(result);
					this.saved.emit(result);
				},
				error: (e) => this.error.set(errorMessage(e)),
			});
	}
}
