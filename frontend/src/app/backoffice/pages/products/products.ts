import { LocalCurrencyPipe } from '../../../shared_components/core/i18n/locale-pipes';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { BackofficeApi, errorMessage } from '../../core/api/backoffice-api';
import type { NamedResource, Product } from '../../../shared_components/core/api/models';
import type { ProductInput, Stock } from '../../core/api/models';
import { PageHeader } from '../../shared_components/page-header/page-header';
import { Panel } from '../../shared_components/panel/panel';
import { Tabs } from '../../shared_components/tabs/tabs';
import { DataTable, Column } from '../../shared_components/data-table/data-table';
import { Pagination } from '../../shared_components/pagination/pagination';
import { Badge } from '../../shared_components/badge/badge';
import { Feedback } from '../../shared_components/feedback/feedback';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { Icon } from '../../../shared_components/ui/icon/icon';
import { ProductAllergenEditor } from '../../shared_components/product-allergen-editor/product-allergen-editor';
import { Auth } from '../../../shared_components/core/auth/auth';

const emptyProduct = (): ProductInput => ({
	sku: '',
	name: '',
	description: '',
	categoryName: '',
	isSellable: true,
	isPizzaComponent: false,
	isStockControlled: false,
	componentTypeName: null,
	directSellingPrice: null,
});
@Component({
	selector: 'app-products',
	standalone: true,
	imports: [
		LocalCurrencyPipe,
		TranslatePipe,
		FormsModule,
		PageHeader,
		Panel,
		Tabs,
		DataTable,
		Pagination,
		Badge,
		Feedback,
		Modal,
		Icon,
		ProductAllergenEditor,
	],
	templateUrl: './products.html',
})
export class Products {
	private readonly api = inject(BackofficeApi);
	readonly auth = inject(Auth);
	private readonly destroy = inject(DestroyRef);
	readonly items = signal<Product[]>([]);
	readonly stock = signal<Stock[]>([]);
	readonly categories = signal<NamedResource[]>([]);
	readonly types = signal<NamedResource[]>([]);
	readonly loading = signal(true);
	readonly error = signal('');
	readonly stockError = signal('');
	readonly lookupError = signal('');
	readonly success = signal('');
	readonly successParams = signal<Record<string, string>>({});
	readonly tab = signal('all');
	readonly query = signal('');
	readonly category = signal('');
	readonly allergenFilter = signal('');
	readonly componentTypeFilter = signal('');
	readonly allergenOptions = computed(() => [...new Set(this.items().flatMap((p) => p.associatedAllergens))].sort());
	readonly page = signal(1);
	readonly pageSize = 8;
	readonly editing = signal(false);
	readonly selected = signal<Product | null>(null);
	readonly confirm = signal<Product | null>(null);
	readonly saving = signal(false);
	readonly allergensBusy = signal(false);
	readonly formError = signal('');
	readonly errorReason = signal('');
	draft = emptyProduct();
	/** Picture sent to the ImageController after the product is saved (required when creating). */
	readonly imageFile = signal<File | null>(null);
	readonly imagePreview = signal<string | null>(null);
	stockIncrease = 0;
	readonly columns = computed<Column[]>(() => [
		{ key: 'sku', label: 'SKU' },
		{ key: 'name', label: 'Product' },
		{ key: 'description', label: 'Description' },
		{ key: 'status', label: 'Status' },
		{ key: 'categoryName', label: 'Category' },
		{ key: 'price', label: 'Price' },
		{ key: 'stock', label: 'Stock' },
		...(this.auth.manager() ? [{ key: 'actions', label: 'Actions' }] : []),
	]);
	readonly tabs = computed(() => [
		{ id: 'all', label: 'All products', count: this.items().length },
		{ id: 'active', label: 'Active', count: this.items().filter((p) => p.active).length },
		{ id: 'disabled', label: 'Disabled', count: this.items().filter((p) => !p.active).length },
		...(!this.stockError()
			? [
					{
						id: 'out',
						label: 'Out of stock',
						count: this.items().filter((p) => p.isStockControlled && this.units(p.sku) === 0)
							.length,
					},
				]
			: []),
	]);
	readonly filtered = computed(() =>
		this.items().filter(
			(p) =>
				(this.tab() === 'all' ||
					(this.tab() === 'active' && p.active) ||
					(this.tab() === 'disabled' && !p.active) ||
					(this.tab() === 'out' && p.isStockControlled && this.units(p.sku) === 0)) &&
				(!this.category() || p.categoryName === this.category()) &&
				(!this.allergenFilter() || p.associatedAllergens.includes(this.allergenFilter())) &&
				(!this.componentTypeFilter() || p.componentTypeName === this.componentTypeFilter()) &&
				`${p.sku} ${p.name} ${p.description}`.toLowerCase().includes(this.query().toLowerCase()),
		),
	);
	readonly rows = computed(() =>
		this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
	);
	constructor() {
		this.load();
		this.loadLookups();
	}
	load() {
		this.loading.set(true);
		this.error.set('');
		this.stockError.set('');
		forkJoin({
			products: this.api.products(),
			stock: this.api.stock().pipe(
				catchError((e) => {
					this.stockError.set(errorMessage(e));
					return of([] as Stock[]);
				}),
			),
		})
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (data) => {
					this.items.set(data.products);
					this.stock.set(data.stock);
					this.page.set(
						Math.min(this.page(), Math.max(1, Math.ceil(this.filtered().length / this.pageSize))),
					);
				},
				error: (e) => this.error.set(errorMessage(e)),
			});
	}
	loadLookups() {
		this.lookupError.set('');
		forkJoin({
			categories: this.api.allResources('categories'),
			types: this.api.allResources('pizza-component-types'),
		})
			.pipe(takeUntilDestroyed(this.destroy))
			.subscribe({
				next: (data) => {
					this.categories.set(data.categories);
					this.types.set(data.types);
				},
				error: (e) => this.lookupError.set(errorMessage(e)),
			});
	}
	units(sku: string) {
		return this.stock().find((item) => item.productSku === sku)?.currentUnits;
	}
	setTab(tab: string) {
		this.tab.set(tab);
		this.page.set(1);
	}
	open(product?: Product) {
		this.allergensBusy.set(false);
		this.selected.set(product ?? null);
		this.draft = product ? { ...product } : emptyProduct();
		this.stockIncrease = 0;
		this.formError.set('');
		this.setImage(null);
		this.imagePreview.set(product ? this.api.imageUrl(product.sku) : null);
		this.editing.set(true);
		if (this.lookupError()) this.loadLookups();
	}
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
	allergensUpdated(product: Product) {
		this.selected.set(product);
		this.items.update((items) => items.map((item) => (item.sku === product.sku ? product : item)));
	}
	save() {
		if (this.saving() || this.allergensBusy()) return;
		if (!this.draft.isSellable && !this.draft.isPizzaComponent) {
			this.formError.set('A product must be sellable, a pizza component, or both.');
			return;
		}
		const image = this.imageFile();
		if (!this.selected() && !image) {
			this.formError.set('A picture is required when adding a product.');
			return;
		}
		const value: ProductInput = {
			sku: this.draft.sku.trim(),
			name: this.draft.name.trim(),
			description: this.draft.description.trim(),
			categoryName: this.draft.categoryName,
			isSellable: this.draft.isSellable,
			isPizzaComponent: this.draft.isPizzaComponent,
			isStockControlled: this.draft.isStockControlled,
			componentTypeName: this.draft.isPizzaComponent ? this.draft.componentTypeName : null,
			directSellingPrice: this.draft.isSellable ? this.draft.directSellingPrice : null,
		};
		this.saving.set(true);
		this.formError.set('');
		let detailsSaved = false;
		this.api
			.saveProduct(value, this.selected()?.sku)
			.pipe(
				tap((saved) => {
					detailsSaved = true;
					this.selected.set(saved);
				}),
				switchMap((saved) =>
					image ? this.api.uploadImage(saved.sku, image).pipe(map(() => saved)) : of(saved),
				),
				switchMap((saved) =>
					this.stockIncrease > 0 && saved.isStockControlled
						? this.api.increaseStock(saved.sku, this.stockIncrease)
						: of(null),
				),
				takeUntilDestroyed(this.destroy),
				finalize(() => this.saving.set(false)),
			)
			.subscribe({
				next: () => {
					this.editing.set(false);
					this.success.set('Product saved successfully.');
					this.load();
				},
				error: (e) => {
					this.errorReason.set(errorMessage(e));
					this.formError.set(
						detailsSaved
							? 'Product details saved, but the picture or stock update was not confirmed. {{reason}}'
							: errorMessage(e),
					);
					if (detailsSaved) {
						this.stockIncrease = 0;
						this.load();
					}
				},
			});
	}
	toggle() {
		const product = this.confirm();
		if (!product) return;
		this.saving.set(true);
		this.formError.set('');
		this.api
			.setProductActive(product)
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.saving.set(false)),
			)
			.subscribe({
				next: () => {
					this.confirm.set(null);
					this.successParams.set({ name: product.name });
					this.success.set(product.active ? '{{name}} disabled.' : '{{name}} activated.');
					this.load();
				},
				error: (e) => this.formError.set(errorMessage(e)),
			});
	}
	askToggle(product: Product) {
		this.formError.set('');
		this.confirm.set(product);
	}
}
