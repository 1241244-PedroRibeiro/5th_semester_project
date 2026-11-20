import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { StorefrontApi } from '../../core/storefront-api';
import { CustomerProfile } from '../../core/customer-profile';
import { Address, ContactProfile } from '../../core/storefront-models';
import { errorMessage } from '../../../shared_components/core/api/api-errors';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { StorefrontButton } from '../storefront-button/storefront-button';

@Component({
	selector: 'app-address-editor',
	standalone: true,
	imports: [TranslatePipe, FormsModule, Modal, StorefrontButton],
	templateUrl: './address-editor.html',
})
export class AddressEditor implements OnInit {
	readonly initial = input<Address | null>(null);
	readonly closed = output<void>();
	readonly saved = output<ContactProfile>();
	private readonly api = inject(StorefrontApi);
	private readonly profile = inject(CustomerProfile);
	private readonly destroy = inject(DestroyRef);
	readonly busy = signal(false);
	readonly error = signal('');
	draft: Address = { street: '', postalCode: '', city: '', extraDetails: '' };
	ngOnInit() {
		if (this.initial()) this.draft = { ...this.initial()! };
	}
	save() {
		this.busy.set(true);
		this.error.set('');
		const value = {
			street: this.draft.street.trim(),
			city: this.draft.city.trim(),
			postalCode: this.draft.postalCode.trim(),
			extraDetails: this.draft.extraDetails?.trim() || '',
		};
		this.api
			.saveAddress(value)
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
