import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Auth } from '../../../shared_components/core/auth/auth';
import { BackofficeApi, errorMessage } from '../../core/api/backoffice-api';
import type { ProfileAddress } from '../../core/api/models';
import { StaffContacts } from '../../core/staff-contacts';
import { PageHeader } from '../../shared_components/page-header/page-header';
import { Panel } from '../../shared_components/panel/panel';
import {
	AccountDetailsEditor,
	AccountEditMode,
} from '../../shared_components/account-details-editor/account-details-editor';
import type { User } from '../../../shared_components/core/api/models';

@Component({
	selector: 'app-staff-profile-page',
	standalone: true,
	imports: [TranslatePipe, FormsModule, PageHeader, Panel, AccountDetailsEditor],
	templateUrl: './profile-page.html',
	styleUrl: './profile-page.scss',
})
export class StaffProfilePage {
	readonly auth = inject(Auth);
	private readonly api = inject(BackofficeApi);
	private readonly contacts = inject(StaffContacts);
	private readonly destroy = inject(DestroyRef);
	readonly phoneBusy = signal(false);
	readonly addressBusy = signal(false);
	readonly phoneError = signal('');
	readonly addressError = signal('');
	readonly phoneNotice = signal('');
	readonly addressNotice = signal('');
	readonly editing = signal<AccountEditMode | null>(null);
	readonly accountNotice = signal('');
	openAccount(mode: AccountEditMode) {
		if (!this.phoneBusy() && !this.addressBusy()) {
			this.accountNotice.set('');
			this.editing.set(mode);
		}
	}
	accountSaved(user: User) {
		const mode = this.editing();
		this.auth.updateUser(user);
		this.editing.set(null);
		this.accountNotice.set(
			mode === 'password'
				? 'Password changed successfully.'
				: mode === 'email'
					? 'Email updated. Use your new email the next time you sign in.'
					: 'Name updated successfully.',
		);
	}
	phone = this.contacts.value().phoneNumber ?? '';
	address: ProfileAddress = {
		street: '',
		city: '',
		postalCode: '',
		extraDetails: '',
		...this.contacts.value().address,
	};
	savePhone() {
		if (this.phoneBusy() || this.addressBusy()) return;
		this.phoneBusy.set(true);
		this.phoneError.set('');
		this.phoneNotice.set('');
		this.api
			.saveOwnPhone(this.phone.trim())
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.phoneBusy.set(false)),
			)
			.subscribe({
				next: (saved) => {
					this.contacts.remember(saved);
					this.phone = saved.phoneNumber ?? this.phone;
					this.phoneNotice.set('Phone number saved.');
				},
				error: (e) => this.phoneError.set(errorMessage(e)),
			});
	}
	saveAddress() {
		if (this.phoneBusy() || this.addressBusy()) return;
		this.addressBusy.set(true);
		this.addressError.set('');
		this.addressNotice.set('');
		const value = {
			street: this.address.street.trim(),
			city: this.address.city.trim(),
			postalCode: this.address.postalCode.trim(),
			extraDetails: this.address.extraDetails?.trim() ?? '',
		};
		this.api
			.saveOwnAddress(value)
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.addressBusy.set(false)),
			)
			.subscribe({
				next: (saved) => {
					this.contacts.remember(saved);
					this.address = saved.address ?? value;
					this.addressNotice.set('Address saved.');
				},
				error: (e) => this.addressError.set(errorMessage(e)),
			});
	}
}
