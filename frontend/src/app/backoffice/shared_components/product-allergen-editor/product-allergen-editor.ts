import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concatMap, finalize, from, tap } from 'rxjs';
import { BackofficeApi, errorMessage } from '../../core/api/backoffice-api';
import type { NamedResource, Product } from '../../../shared_components/core/api/models';

@Component({
	imports: [TranslatePipe],
	selector: 'app-product-allergen-editor',
	standalone: true,
	templateUrl: './product-allergen-editor.html',
	styles: `
		:host {
			display: block;
			border-top: 1px solid var(--border);
			padding-top: 1rem;
		}
		.options {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
			gap: 0.5rem;
			margin: 0.75rem 0;
		}
		.check-label {
			min-height: 2.75rem;
			padding: 0.5rem;
			border: 1px solid var(--border);
			border-radius: 0.5rem;
			overflow-wrap: anywhere;
		}
		p {
			font-size: 0.78rem;
		}
		.saved {
			display: flex;
			flex-wrap: wrap;
			gap: 0.4rem;
			margin: 0.5rem 0;
		}
		.saved span {
			background: var(--yellow);
			padding: 0.3rem 0.5rem;
			border-radius: 0.4rem;
			font-size: 0.75rem;
			overflow-wrap: anywhere;
		}
	`,
})
export class ProductAllergenEditor implements OnInit {
	readonly product = input.required<Product>();
	readonly updated = output<Product>();
	readonly busyChanged = output<boolean>();
	private readonly api = inject(BackofficeApi);
	private readonly destroy = inject(DestroyRef);
	readonly options = signal<NamedResource[]>([]);
	readonly loading = signal(true);
	readonly busy = signal(false);
	readonly error = signal('');
	readonly confirmedCount = signal(0);
	readonly errorDetail = signal('');
	readonly lookupError = signal('');
	readonly notice = signal('');
	readonly pending = signal<string[]>([]);
	ngOnInit() {
		this.load();
	}
	load() {
		this.loading.set(true);
		this.lookupError.set('');
		this.api
			.allResources('allergens')
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (values) => this.options.set(values),
				error: (e) => this.lookupError.set(errorMessage(e)),
			});
	}
	associated(name: string) {
		return this.product().associatedAllergens.includes(name);
	}
	select(name: string, checked: boolean) {
		this.pending.update((values) =>
			checked ? [...new Set([...values, name])] : values.filter((value) => value !== name),
		);
		this.notice.set('');
	}
	save() {
		const names = this.pending().filter((name) => !this.associated(name));
		if (!names.length || this.busy()) return;
		this.busy.set(true);
		this.busyChanged.emit(true);
		this.error.set('');
		this.notice.set('');
		let confirmed = 0;
		from(names)
			.pipe(
				concatMap((name) =>
					this.api.associateProductAllergen(this.product().sku, name).pipe(
						tap((saved) => {
							confirmed++;
							this.updated.emit(saved);
							this.pending.update((values) => values.filter((value) => value !== name));
						}),
					),
				),
				takeUntilDestroyed(this.destroy),
				finalize(() => {
					this.busy.set(false);
					this.busyChanged.emit(false);
				}),
			)
			.subscribe({
				complete: () =>
					this.notice.set(
						'Allergen associations saved. Other product edits still need Save changes.',
					),
				error: (e) => {
					this.confirmedCount.set(confirmed);
					this.errorDetail.set(errorMessage(e));
					this.error.set(
						'{{count}} association(s) saved. Remaining selections were not confirmed. {{reason}}',
					);
				},
			});
	}
}
