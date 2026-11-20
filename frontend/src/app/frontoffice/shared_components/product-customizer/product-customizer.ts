import { LocalCurrencyPipe } from '../../../shared_components/core/i18n/locale-pipes';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	OnInit,
	output,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, finalize } from 'rxjs';
import { StorefrontApi } from '../../core/storefront-api';
import { errorMessage } from '../../../shared_components/core/api/api-errors';
import type {
	ComponentConfiguration,
	NamedResource,
	Product,
} from '../../../shared_components/core/api/models';
import { CartLine, CatalogueItem, productImage } from '../../core/storefront-models';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { StorefrontButton } from '../storefront-button/storefront-button';
import { QuantityControl } from '../quantity-control/quantity-control';
import { AllergenChips } from '../allergen-chips/allergen-chips';

@Component({
	selector: 'app-product-customizer',
	standalone: true,
	imports: [
		LocalCurrencyPipe,
		TranslatePipe,
		Modal,
		StorefrontButton,
		QuantityControl,
		AllergenChips,
	],
	templateUrl: './product-customizer.html',
	styleUrl: './product-customizer.scss',
})
export class ProductCustomizer implements OnInit {
	readonly translate = inject(TranslateService);
	readonly item = input.required<CatalogueItem>();
	readonly closed = output<void>();
	readonly added = output<Omit<CartLine, 'id'>>();
	private readonly api = inject(StorefrontApi);
	private readonly destroy = inject(DestroyRef);
	readonly size = signal('');
	readonly quantity = signal(1);
	readonly amounts = signal<Record<string, number>>({});
	readonly products = signal<Product[]>([]);
	readonly configurations = signal<ComponentConfiguration[]>([]);
	readonly types = signal<NamedResource[]>([]);
	readonly loading = signal(false);
	readonly error = signal('');
	readonly variant = computed(() =>
		this.item().sizeVariants?.find((v) => v.pizzaSize === this.size()),
	);
	readonly options = computed(() =>
		this.products()
			.filter((p) => p.active && p.isPizzaComponent)
			.flatMap((p) => {
				const configuration = this.configurations().find(
					(c) => c.componentSku === p.sku && c.pizzaSize === this.size(),
				);
				return configuration ? [{ ...p, price: configuration.price }] : [];
			}),
	);
	readonly groups = computed(() =>
		this.types()
			.slice()
			.sort((a, b) => (a.assemblyOrder ?? 0) - (b.assemblyOrder ?? 0))
			.map((type) => ({
				...type,
				options: this.options().filter((p) => p.componentTypeName === type.name),
			})),
	);
	readonly price = computed(() => {
		if (!this.item().isPredefinedPizza) return this.item().directPrice ?? null;
		const variant = this.variant();
		if (!variant?.isAvailable || this.loading() || this.error()) return null;
		const original = new Map(
			(this.item().defaultRecipeLines ?? []).map((line) => [
				line.componentSku,
				line.defaultQuantity,
			]),
		);
		let delta = 0;
		for (const sku of new Set([...original.keys(), ...Object.keys(this.amounts())])) {
			const amount = this.amounts()[sku] ?? 0;
			const change = amount - (original.get(sku) ?? 0);
			if (change) {
				const option = this.options().find((p) => p.sku === sku);
				if (!option) return null;
				delta += Math.round(option.price * 100) * change;
			}
		}
		return {
			currency: variant.computedPrice.currency,
			amount: Math.max(0, Math.round(variant.computedPrice.amount * 100) + delta) / 100,
		};
	});
	readonly validation = computed(() => {
		this.translate.currentLang();
		if (!this.item().isPredefinedPizza) return '';
		for (const [sku, amount] of Object.entries(this.amounts())) {
			if (amount > 0 && !this.options().some((p) => p.sku === sku))
				return 'Some selected ingredients are unavailable for this size. Choose another size or adjust the recipe.';
		}
		for (const group of this.groups()) {
			const count = group.options.filter((p) => (this.amounts()[p.sku] ?? 0) > 0).length;
			if (count < (group.minCardinality ?? 0))
				return this.translate.instant('Choose at least {{count}} {{group}} ingredient(s).', {
					count: group.minCardinality,
					group: group.name.toLowerCase(),
				});
			if (group.maxCardinality != null && count > group.maxCardinality)
				return this.translate.instant('Choose no more than {{count}} {{group}} ingredient(s).', {
					count: group.maxCardinality,
					group: group.name.toLowerCase(),
				});
		}
		return '';
	});
	readonly allergens = computed(() => [
		...new Set([
			...this.item().allergens,
			...this.options()
				.filter((p) => (this.amounts()[p.sku] ?? 0) > 0)
				.flatMap((p) => p.associatedAllergens),
		]),
	]);
	ngOnInit() {
		this.size.set(this.item().sizeVariants?.find((v) => v.isAvailable)?.pizzaSize ?? '');
		this.amounts.set(
			Object.fromEntries(
				(this.item().defaultRecipeLines ?? []).map((line) => [
					line.componentSku,
					line.defaultQuantity,
				]),
			),
		);
		if (this.item().isPredefinedPizza) this.load();
	}
	load() {
		this.loading.set(true);
		this.error.set('');
		forkJoin({
			products: this.api.products(),
			configurations: this.api.configurations(),
			types: this.api.componentTypes(),
		})
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (result) => {
					this.products.set(result.products);
					this.configurations.set(result.configurations);
					this.types.set(result.types);
				},
				error: (e) => this.error.set(errorMessage(e)),
			});
	}
	image() {
		return productImage(this.item());
	}
	setAmount(sku: string, value: number) {
		this.amounts.update((amounts) => ({ ...amounts, [sku]: value }));
	}
	setSize(size: string) {
		this.size.set(size);
		this.amounts.set(
			Object.fromEntries(
				(this.item().defaultRecipeLines ?? []).map((line) => [
					line.componentSku,
					line.defaultQuantity,
				]),
			),
		);
	}
	add() {
		const price = this.price();
		if (!price || this.validation() || !this.item().isAvailable) return;
		this.added.emit({
			productSku: this.item().productSku,
			name: this.item().name,
			size: this.size() || undefined,
			quantity: this.quantity(),
			unitPrice: price.amount,
			currency: price.currency,
			allergens: this.allergens(),
			ingredients: this.options()
				.filter((p) => (this.amounts()[p.sku] ?? 0) > 0)
				.map((p) => ({
					sku: p.sku,
					name: p.name,
					quantity: this.amounts()[p.sku],
					unitPrice: p.price,
				})),
		});
	}
}
