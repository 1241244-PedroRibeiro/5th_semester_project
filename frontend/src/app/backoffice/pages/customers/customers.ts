import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { BackofficeApi, errorMessage } from '../../core/api/backoffice-api';
import type { CommercialCustomer, CommercialCustomerSummary, NamedResource } from '../../../shared_components/core/api/models';
import { PageHeader } from '../../shared_components/page-header/page-header';
import { Panel } from '../../shared_components/panel/panel';
import { DataTable, Column } from '../../shared_components/data-table/data-table';
import { Pagination } from '../../shared_components/pagination/pagination';
import { Feedback } from '../../shared_components/feedback/feedback';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { Icon } from '../../../shared_components/ui/icon/icon';

type CustomerDraft = Pick<CommercialCustomer, 'firstName' | 'lastName' | 'phone' | 'email' | 'vatNumber' | 'marketingConsent'> & { username: string };
type AddressDraft = { street: string; postalCode: string; city: string; extraDetails: string; isDefault: boolean };

@Component({
	selector: 'app-customers',
	standalone: true,
	imports: [TranslatePipe, DatePipe, FormsModule, PageHeader, Panel, DataTable, Pagination, Feedback, Modal, Icon],
	templateUrl: './customers.html',
	styleUrl: './customers.scss',
})
export class Customers {
	private readonly api = inject(BackofficeApi);
	private readonly destroy = inject(DestroyRef);
	readonly items = signal<CommercialCustomerSummary[]>([]);
	readonly total = signal(0);
	readonly page = signal(1);
	readonly pageSize = 12;
	readonly columns: Column[] = [
		{ key: 'name', label: 'Name' },
		{ key: 'email', label: 'Email' },
		{ key: 'phone', label: 'Phone' },
		{ key: 'vatNumber', label: 'VAT number' },
		{ key: 'actions', label: 'Actions' },
	];
	readonly loading = signal(true);
	readonly saving = signal(false);
	readonly error = signal('');
	readonly formError = signal('');
	readonly search = signal('');
	readonly selected = signal<CommercialCustomer | null>(null);
	readonly detailsLoading = signal(false);
	readonly editing = signal(false);
	readonly creating = signal(false);
	readonly removeTarget = signal<CommercialCustomer | null>(null);
	readonly allergens = signal<NamedResource[]>([]);
	readonly selectedAllergens = signal<string[]>([]);
	readonly restrictionDescriptions = signal<Record<string, string>>({});
	readonly dietarySaved = signal(false);
	readonly addressDraft = signal<AddressDraft>(this.emptyAddress());
	readonly addressId = signal<string | null>(null);
	draft: CustomerDraft = this.emptyCustomer();

	isValidVat(value?: string | null): boolean {
		const vat = value?.trim().toUpperCase() ?? '';
		if (!vat) return true;
		if (!/^\d{9}$/.test(vat)) return /^[A-Z]{2}[A-Z0-9]{2,14}$/.test(vat);
		const sum = [...vat.slice(0, 8)].reduce((total, digit, index) => total + Number(digit) * (9 - index), 0);
		const remainder = sum % 11;
		return (remainder < 2 ? 0 : 11 - remainder) === Number(vat[8]);
	}

	showVatError(value: string | null | undefined, touched: boolean | null, submitted: boolean): boolean {
		return !!value?.trim() && !this.isValidVat(value) && (touched || submitted);
	}

	constructor() { this.load(); this.loadAllergens(); }

	load(): void {
		this.loading.set(true);
		this.error.set('');
		this.api.customers(this.page(), this.pageSize, this.search()).pipe(takeUntilDestroyed(this.destroy)).subscribe({
			next: result => { this.items.set(result.items); this.total.set(result.total); },
			error: error => { this.error.set(errorMessage(error)); this.loading.set(false); },
			complete: () => this.loading.set(false),
		});
	}

	private loadAllergens(): void {
		this.api.allResources('allergens').pipe(takeUntilDestroyed(this.destroy)).subscribe({
			next: values => this.allergens.set(values),
			error: () => this.allergens.set([]),
		});
	}

	searchChanged(value: string): void { this.search.set(value); this.page.set(1); this.load(); }

	view(customer: CommercialCustomerSummary): void {
		this.detailsLoading.set(true);
		this.formError.set('');
		this.api.customer(customer.id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
			next: detail => {
				this.selected.set(detail);
				this.draft = { firstName: detail.firstName, lastName: detail.lastName, phone: detail.phone,
					email: detail.email, vatNumber: detail.vatNumber, marketingConsent: detail.marketingConsent,
					username: detail.username ?? '' };
				this.selectedAllergens.set(detail.dietaryRestrictions.map(item => item.allergenId));
				this.restrictionDescriptions.set(Object.fromEntries(detail.dietaryRestrictions.map(item => [item.allergenId, item.description])));
			},
			error: error => this.formError.set(errorMessage(error)),
			complete: () => this.detailsLoading.set(false),
		});
	}

	startCreate(): void {
		this.draft = this.emptyCustomer();
		this.creating.set(true);
		this.editing.set(true);
		this.formError.set('');
	}

	startEdit(): void {
		const customer = this.selected();
		if (!customer) return;
		this.draft = {
			firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone,
			email: customer.email, vatNumber: customer.vatNumber, marketingConsent: customer.marketingConsent,
			username: customer.username ?? '',
		};
		this.creating.set(false);
		this.editing.set(true);
		this.formError.set('');
	}

	saveProfile(): void {
		if (this.saving()) return;
		this.saving.set(true);
		this.formError.set('');
		const request = this.creating()
			? this.api.createCustomer({ ...this.draft, username: this.draft.username.trim() || null })
			: this.api.updateCustomer(this.selected()!.id, this.draft);
		request.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.saving.set(false))).subscribe({
			next: customer => {
				this.editing.set(false);
				this.load();
				if (this.creating()) this.view(customer);
				else this.selected.set(customer);
				this.creating.set(false);
			},
			error: error => this.formError.set(errorMessage(error)),
		});
	}

	confirmRemove(): void {
		const customer = this.removeTarget();
		if (!customer || this.saving()) return;
		this.saving.set(true);
		this.api.deleteCustomer(customer.id).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.saving.set(false))).subscribe({
				next: () => { this.removeTarget.set(null); this.load(); },
			error: error => this.formError.set(errorMessage(error)),
		});
	}

	askRemove(): void {
		this.removeTarget.set(this.selected());
		this.selected.set(null);
		this.formError.set('');
	}

	saveUserLink(): void {
		const customer = this.selected();
		if (!customer || this.saving()) return;
		this.saving.set(true);
		this.api.linkCustomerUser(customer.id, this.draft.username.trim() || null)
			.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.saving.set(false)))
			.subscribe({ next: value => this.selected.set(value), error: error => this.formError.set(errorMessage(error)) });
	}

	toggleAllergen(name: string, event: Event): void {
		this.dietarySaved.set(false);
		const checked = (event.target as HTMLInputElement).checked;
		this.selectedAllergens.update(values => checked ? [...new Set([...values, name])] : values.filter(item => item !== name));
	}

	setRestrictionDescription(name: string, value: string): void {
		this.dietarySaved.set(false);
		this.restrictionDescriptions.update(values => ({ ...values, [name]: value }));
	}

	allergenLabel(name: string): string { return this.allergens().find(item => item.name === name)?.name ?? name; }

	saveDietaryRestrictions(): void {
		const customer = this.selected();
		if (!customer || this.saving()) return;
		this.saving.set(true);
		this.dietarySaved.set(false);
		const dietaryRestrictions = this.selectedAllergens().map(allergenId => ({ allergenId, description: (this.restrictionDescriptions()[allergenId] ?? '').trim() }));
		this.api.updateCustomerDietaryRestrictions(customer.id, dietaryRestrictions)
			.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.saving.set(false)))
			.subscribe({ next: value => { this.selected.set(value); this.dietarySaved.set(true); }, error: error => this.formError.set(errorMessage(error)) });
	}

	startAddress(address?: CommercialCustomer['addresses'][number]): void {
		this.addressId.set(address?.id ?? null);
		this.addressDraft.set(address ? {
			street: address.street, postalCode: address.postalCode, city: address.city,
			extraDetails: address.extraDetails, isDefault: address.isDefault,
		} : this.emptyAddress());
	}

	saveAddress(): void {
		const customer = this.selected();
		if (!customer || this.saving()) return;
		this.saving.set(true);
		const addressId = this.addressId();
		const request = addressId
			? this.api.updateCustomerAddress(customer.id, addressId, this.addressDraft())
			: this.api.addCustomerAddress(customer.id, this.addressDraft());
		request.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.saving.set(false)))
			.subscribe({ next: value => { this.selected.set(value); this.startAddress(); }, error: error => this.formError.set(errorMessage(error)) });
	}

	deleteAddress(addressId: string): void {
		const customer = this.selected();
		if (!customer || this.saving()) return;
		this.saving.set(true);
		this.api.deleteCustomerAddress(customer.id, addressId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.saving.set(false)))
			.subscribe({ next: value => this.selected.set(value), error: error => this.formError.set(errorMessage(error)) });
	}

	setDefaultAddress(addressId: string): void {
		const customer = this.selected();
		if (!customer || this.saving()) return;
		this.saving.set(true);
		this.api.setDefaultCustomerAddress(customer.id, addressId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.saving.set(false)))
			.subscribe({ next: value => this.selected.set(value), error: error => this.formError.set(errorMessage(error)) });
	}

	paginate(page: number): void { this.page.set(page); this.load(); }

	private emptyCustomer(): CustomerDraft {
		return { firstName: '', lastName: '', phone: '', email: '', vatNumber: null, marketingConsent: false, username: '' };
	}
	private emptyAddress(): AddressDraft { return { street: '', postalCode: '', city: '', extraDetails: '', isDefault: false }; }
}
