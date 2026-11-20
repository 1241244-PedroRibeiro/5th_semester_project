import { LocalCurrencyPipe } from '../../../shared_components/core/i18n/locale-pipes';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { BackofficeApi, errorMessage } from '../../core/api/backoffice-api';
import type {
	ComponentConfiguration,
	NamedResource,
	Product,
} from '../../../shared_components/core/api/models';
import type { ConfigurationInput } from '../../core/api/models';
import { PageHeader } from '../../shared_components/page-header/page-header';
import { Panel } from '../../shared_components/panel/panel';
import { DataTable, Column } from '../../shared_components/data-table/data-table';
import { Pagination } from '../../shared_components/pagination/pagination';
import { Badge } from '../../shared_components/badge/badge';
import { Feedback } from '../../shared_components/feedback/feedback';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { Icon } from '../../../shared_components/ui/icon/icon';
@Component({
	selector: 'app-configurations',
	standalone: true,
	imports: [
		LocalCurrencyPipe,
		TranslatePipe,
		FormsModule,
		PageHeader,
		Panel,
		DataTable,
		Pagination,
		Badge,
		Feedback,
		Modal,
		Icon,
	],
	templateUrl: './configurations.html',
})
export class Configurations {
	private readonly api = inject(BackofficeApi);
	private readonly destroy = inject(DestroyRef);
	readonly items = signal<ComponentConfiguration[]>([]);
	readonly products = signal<Product[]>([]);
	readonly sizes = signal<NamedResource[]>([]);
	readonly loading = signal(true);
	readonly error = signal('');
	readonly success = signal('');
	readonly query = signal('');
	readonly size = signal('');
	readonly page = signal(1);
	readonly pageSize = 8;
	readonly editing = signal(false);
	readonly selected = signal<ComponentConfiguration | null>(null);
	readonly removing = signal<ComponentConfiguration | null>(null);
	readonly saving = signal(false);
	readonly formError = signal('');
	draft: ConfigurationInput = { componentSku: '', pizzaSize: '', price: 0 };
	readonly components = computed(() =>
		this.products().filter((p) => p.active && p.isPizzaComponent),
	);
	readonly columns: Column[] = [
		{ key: 'sku', label: 'SKU' },
		{ key: 'product', label: 'Component' },
		{ key: 'size', label: 'Pizza size' },
		{ key: 'price', label: 'Price' },
		{ key: 'stock', label: 'Stock units consumed' },
		{ key: 'actions', label: 'Actions' },
	];
	readonly filtered = computed(() =>
		this.items().filter(
			(item) =>
				(!this.size() || item.pizzaSize === this.size()) &&
				`${item.componentSku} ${item.productName}`
					.toLowerCase()
					.includes(this.query().toLowerCase()),
		),
	);
	readonly rows = computed(() =>
		this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
	);
	constructor() {
		this.load();
	}
	load() {
		this.loading.set(true);
		this.error.set('');
		forkJoin({
			configurations: this.api.configurations(),
			products: this.api.products(),
			sizes: this.api.allResources('pizza-sizes'),
		})
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (data) => {
					this.items.set(data.configurations);
					this.products.set(data.products);
					this.sizes.set(data.sizes);
					this.page.set(
						Math.min(this.page(), Math.max(1, Math.ceil(this.filtered().length / this.pageSize))),
					);
				},
				error: (e) => this.error.set(errorMessage(e)),
			});
	}
	stockControlled() {
		return (
			this.selected()?.stockControlled ??
			this.products().find((p) => p.sku === this.draft.componentSku)?.isStockControlled ??
			false
		);
	}
	open(item?: ComponentConfiguration) {
		if (this.saving()) return;

		this.selected.set(item ?? null);
		this.draft = item
			? {
				componentSku: item.componentSku,
				pizzaSize: item.pizzaSize,
				price: item.price,
				stockUnitsConsumed: item.stockUnitsConsumed ?? undefined,
			}
			: { componentSku: '', pizzaSize: '', price: 0 };

		this.formError.set('');
		this.success.set('');
		this.editing.set(true);
	}
	save() {
		if (this.saving()) return;

		if (!this.draft.componentSku) {
			this.formError.set('Pizza component is required. Select an ingredient.');
			return;
		}

		if (!this.components().some((p) => p.sku === this.draft.componentSku)) {
			this.formError.set('Select a valid active pizza component.');
			return;
		}

		if (!this.draft.pizzaSize) {
			this.formError.set('Pizza size is required. Select a size.');
			return;
		}

		if (!this.sizes().some((s) => s.name === this.draft.pizzaSize && s.active !== false)) {
			this.formError.set('Select a valid active pizza size.');
			return;
		}

		if (!Number.isFinite(this.draft.price) || this.draft.price < 0) {
			this.formError.set('Price must be a valid number greater than or equal to zero.');
			return;
		}

		if (
			this.stockControlled() &&
			(
				this.draft.stockUnitsConsumed === undefined ||
				!Number.isInteger(this.draft.stockUnitsConsumed) ||
				this.draft.stockUnitsConsumed < 0
			)
		) {
			this.formError.set('Stock units consumed must be a non-negative whole number.');
			return;
		}

		this.saving.set(true);
		this.formError.set('');
		this.success.set('');

		const value: ConfigurationInput = {
			...this.draft,
			stockUnitsConsumed: this.stockControlled()
				? this.draft.stockUnitsConsumed
				: undefined,
		};

		this.api
			.saveConfiguration(value, this.selected()?.id)
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.saving.set(false)),
			)
			.subscribe({
				next: () => {
					this.editing.set(false);
					this.success.set('Component size configuration saved.');
					this.load();
				},
				error: (e) => this.formError.set(errorMessage(e)),
			});
	}
	askRemove(item: ComponentConfiguration) {
		if (this.saving()) return;

		this.formError.set('');
		this.success.set('');
		this.removing.set(item);
	}

	remove() {
		if (this.saving()) return;

		const item = this.removing();
		if (!item) return;

		this.saving.set(true);
		this.formError.set('');

		this.api
			.deleteConfiguration(item.id)
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.saving.set(false)),
			)
			.subscribe({
				next: () => {
					this.removing.set(null);
					this.success.set('Configuration removed.');

					if (this.items().length === 1 && this.page() > 1) {
						this.page.update((p) => p - 1);
					}

					this.load();
				},
				error: (e) => this.formError.set(errorMessage(e)),
			});
	}
}
