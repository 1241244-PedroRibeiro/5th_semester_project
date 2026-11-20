import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, of, switchMap } from 'rxjs';
import { BackofficeApi, errorMessage } from '../../core/api/backoffice-api';
import type { NamedResource, Product } from '../../../shared_components/core/api/models';
import type { Pizza, PizzaInput } from '../../core/api/models';
import { PageHeader } from '../../shared_components/page-header/page-header';
import { Panel } from '../../shared_components/panel/panel';
import { DataTable, Column } from '../../shared_components/data-table/data-table';
import { Pagination } from '../../shared_components/pagination/pagination';
import { Badge } from '../../shared_components/badge/badge';
import { Feedback } from '../../shared_components/feedback/feedback';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { Icon } from '../../../shared_components/ui/icon/icon';
@Component({
	selector: 'app-pizzas',
	standalone: true,
	imports: [
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
	templateUrl: './pizzas.html',
	styleUrl: './pizzas.scss',
})
export class Pizzas {
	private readonly api = inject(BackofficeApi);
	private readonly destroy = inject(DestroyRef);
	readonly items = signal<Pizza[]>([]);
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
	readonly selected = signal<string | null>(null);
	readonly detailLoading = signal(false);
	readonly saving = signal(false);
	readonly formError = signal('');
	draft: PizzaInput = this.empty();
	readonly sellable = computed(() => this.products().filter((p) => p.active && p.isSellable));
	readonly components = computed(() =>
		this.products().filter((p) => p.active && p.isPizzaComponent),
	);
	readonly columns: Column[] = [
		{ key: 'sku', label: 'SKU' },
		{ key: 'recipe', label: 'Pizza recipe' },
		{ key: 'size', label: 'Size' },
		{ key: 'components', label: 'Recipe components' },
		{ key: 'status', label: 'Availability' },
		{ key: 'actions', label: 'Actions' },
	];
	readonly variants = computed(() =>
		this.items().flatMap((pizza) =>
			pizza.ids.map((id) => ({
				...pizza,
				key: `${id.pizzaSku}:${id.pizzaSize}`,
				size: id.pizzaSize,
			})),
		),
	);
	readonly filtered = computed(() =>
		this.variants().filter(
			(p) =>
				(!this.size() || this.size() === p.size) &&
				`${p.pizzaSku} ${p.recipeName}`.toLowerCase().includes(this.query().toLowerCase()),
		),
	);
	readonly rows = computed(() =>
		this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
	);
	constructor() {
		this.load();
	}
	private empty(): PizzaInput {
		return {
			pizzaSku: '',
			recipeName: '',
			defaultRecipeLines: [{ componentSku: '', defaultQuantity: 1 }],
			availableSizes: [],
		};
	}
	load() {
		this.loading.set(true);
		this.error.set('');
		forkJoin({
			pizzas: this.api.pizzas(),
			products: this.api.products(),
			sizes: this.api.allResources('pizza-sizes'),
		})
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (data) => {
					this.items.set(data.pizzas);
					this.products.set(data.products);
					this.sizes.set(data.sizes);
					this.page.set(
						Math.min(this.page(), Math.max(1, Math.ceil(this.filtered().length / this.pageSize))),
					);
				},
				error: (e) => this.error.set(errorMessage(e)),
			});
	}
	productName(sku: string) {
		return this.products().find((p) => p.sku === sku)?.name ?? sku;
	}
	/** Picture sent to the ImageController after the pizza is saved (required when creating). */
	readonly imageFile = signal<File | null>(null);
	readonly imagePreview = signal<string | null>(null);
	imageSelected(event: Event) {
		const input = event.target as HTMLInputElement;
		this.setImage(input.files?.[0] ?? null);
	}
	private setImage(file: File | null) {
		const previous = this.imagePreview();
		if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
		this.imageFile.set(file);
		this.imagePreview.set(file ? URL.createObjectURL(file) : null);
	}
	open(sku?: string) {
		this.selected.set(sku ?? null);
		this.draft = this.empty();
		this.formError.set('');
		this.setImage(null);
		this.imagePreview.set(sku ? this.api.imageUrl(sku) : null);
		this.editing.set(true);
		if (!sku) return;
		this.detailLoading.set(true);
		this.api
			.pizza(sku)
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.detailLoading.set(false)),
			)
			.subscribe({
				next: (pizza) => {
					this.draft = {
						pizzaSku: pizza.pizzaSku,
						recipeName: pizza.recipeName,
						availableSizes: pizza.ids.map((id) => id.pizzaSize),
						defaultRecipeLines: pizza.defaultRecipeLines.map((line) => ({ ...line })),
					};
				},
				error: (e) => this.formError.set(errorMessage(e)),
			});
	}
	toggleSize(name: string, checked: boolean) {
		this.draft.availableSizes = checked
			? [...this.draft.availableSizes, name]
			: this.draft.availableSizes.filter((size) => size !== name);
	}
	addLine() {
		this.draft.defaultRecipeLines.push({ componentSku: '', defaultQuantity: 1 });
	}
	removeLine(index: number) {
		this.draft.defaultRecipeLines.splice(index, 1);
	}
	validDraft() {
		return (
			!!this.draft.pizzaSku &&
			!!this.draft.recipeName.trim() &&
			!!this.draft.availableSizes.length &&
			this.draft.defaultRecipeLines.every(
				(line) =>
					!!line.componentSku &&
					Number.isSafeInteger(line.defaultQuantity) &&
					line.defaultQuantity > 0,
			)
		);
	}
	save() {
		if (!this.draft.availableSizes.length) {
			this.formError.set('Choose at least one size.');
			return;
		}
		if (
			new Set(this.draft.defaultRecipeLines.map((line) => line.componentSku)).size !==
			this.draft.defaultRecipeLines.length
		) {
			this.formError.set('Each component can appear only once in the recipe.');
			return;
		}
		const image = this.imageFile();
		if (!this.selected() && !image) {
			this.formError.set('A picture is required when adding a pizza.');
			return;
		}
		const pizzaSku = this.draft.pizzaSku;
		this.saving.set(true);
		this.formError.set('');
		const request = this.selected()
			? this.api.updatePizza(this.draft)
			: this.api.createPizza(this.draft);
		request
			.pipe(
				switchMap((saved) => (image ? this.api.uploadImage(pizzaSku, image) : of(saved))),
				takeUntilDestroyed(this.destroy),
				finalize(() => this.saving.set(false)),
			)
			.subscribe({
				next: () => {
					this.editing.set(false);
					this.success.set('Pizza configuration saved for all selected sizes.');
					this.load();
				},
				error: (e) => this.formError.set(errorMessage(e)),
			});
	}
}
