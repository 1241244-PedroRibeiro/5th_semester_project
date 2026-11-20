import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, firstValueFrom } from 'rxjs';
import { StorefrontApi } from '../../core/storefront-api';
import { Cart } from '../../core/cart';
import { Auth } from '../../../shared_components/core/auth/auth';
import { CustomerProfile } from '../../core/customer-profile';
import { Router } from '@angular/router';
import { errorMessage } from '../../../shared_components/core/api/api-errors';
import { CartLine, CatalogueItem, itemPrice } from '../../core/storefront-models';
import { ProductCard } from '../../shared_components/product-card/product-card';
import { ProductCustomizer } from '../../shared_components/product-customizer/product-customizer';
import { MenuFeedback } from '../../shared_components/menu-feedback/menu-feedback';
import { Icon } from '../../../shared_components/ui/icon/icon';
import { LocalCurrencyPipe } from '../../../shared_components/core/i18n/locale-pipes';

type MenuSortOrder = 'relevance' | 'price-asc' | 'price-desc';

@Component({
	selector: 'app-menu-page',
	standalone: true,
	imports: [
		TranslatePipe,
		FormsModule,
		ProductCard,
		ProductCustomizer,
		MenuFeedback,
		Icon,
		LocalCurrencyPipe,
	],
	templateUrl: './menu-page.html',
	styleUrl: './menu-page.scss',
})
export class MenuPage {
	private readonly api = inject(StorefrontApi);
	private readonly auth = inject(Auth);
	private readonly profile = inject(CustomerProfile);
	private readonly router = inject(Router);
	private readonly destroy = inject(DestroyRef);
	readonly cart = inject(Cart);
	readonly items = signal<CatalogueItem[]>([]);
	readonly loading = signal(true);
	readonly error = signal('');
	readonly selectedCategories = signal<string[]>([]);
	readonly sortOrder = signal<MenuSortOrder>('relevance');
	readonly query = signal('');
	readonly availableOnly = signal(false);
	readonly excludedAllergens = signal<string[]>([]);
	readonly filtersExpanded = signal(true);
	readonly priceFrom = signal(0);
	readonly priceTo = signal(0);
	readonly selected = signal<CatalogueItem | null>(null);
	private phoneVerifiedUsername: string | null = null;
	readonly categories = computed(() => [...new Set(this.items().map((item) => item.categoryName))]);
	readonly allergenOptions = computed(() =>
		[...new Set(this.items().flatMap((item) => item.allergens))].sort(),
	);
	readonly priceBounds = computed(() => {
		const prices = this.items().flatMap((item) => {
			const price = itemPrice(item);
			return price ? [price.amount] : [];
		});
		return prices.length
			? { min: Math.min(...prices), max: Math.max(...prices) }
			: { min: 0, max: 0 };
	});
	readonly priceCurrency = computed(
		() =>
			this.items()
				.map(itemPrice)
				.find((price) => price !== null)?.currency ?? 'EUR',
	);
	readonly activeFilterCount = computed(
		() =>
			Number(this.selectedCategories().length > 0) +
			this.excludedAllergens().length +
			Number(this.availableOnly()) +
			Number(this.priceFilterActive()),
	);
	readonly priceFilterActive = computed(
		() => this.priceFrom() > this.priceBounds().min || this.priceTo() < this.priceBounds().max,
	);
	readonly filtered = computed(() => {
		const matches = this.items().filter(
			(item) =>
				(this.selectedCategories().length === 0 ||
					this.selectedCategories().includes(item.categoryName)) &&
				(!this.availableOnly() || item.isAvailable) &&
				!item.allergens.some((allergen) => this.excludedAllergens().includes(allergen)) &&
				(!this.priceFilterActive() ||
					(itemPrice(item)?.amount !== undefined &&
						itemPrice(item)!.amount >= this.priceFrom() &&
						itemPrice(item)!.amount <= this.priceTo())) &&
				`${item.name} ${item.description}`
					.toLowerCase()
					.includes(this.query().trim().toLowerCase()),
		);
		if (this.sortOrder() === 'relevance') return matches;
		return matches.sort((left, right) => {
			const leftPrice = itemPrice(left)?.amount;
			const rightPrice = itemPrice(right)?.amount;
			if (leftPrice === undefined) return rightPrice === undefined ? 0 : 1;
			if (rightPrice === undefined) return -1;
			return this.sortOrder() === 'price-asc' ? leftPrice - rightPrice : rightPrice - leftPrice;
		});
	});
	constructor() {
		this.load();
	}
	toggleFilters() {
		this.filtersExpanded.update((expanded) => !expanded);
	}
	toggleCategory(category: string, event: Event) {
		const selected = (event.target as HTMLInputElement).checked;
		this.selectedCategories.update((categories) =>
			selected
				? [...new Set([...categories, category])]
				: categories.filter((value) => value !== category),
		);
	}
	toggleAllergen(allergen: string, event: Event) {
		const selected = (event.target as HTMLInputElement).checked;
		this.excludedAllergens.update((allergens) =>
			selected
				? [...new Set([...allergens, allergen])]
				: allergens.filter((value) => value !== allergen),
		);
	}
	setPriceFrom(value: number | string) {
		this.priceFrom.set(Math.min(Number(value), this.priceTo()));
	}
	setPriceTo(value: number | string) {
		this.priceTo.set(Math.max(Number(value), this.priceFrom()));
	}
	load() {
		this.loading.set(true);
		this.error.set('');
		this.api
			.catalogue()
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (items) => {
					this.items.set(items);
					this.priceFrom.set(this.priceBounds().min);
					this.priceTo.set(this.priceBounds().max);
				},
				error: (e) => this.error.set(errorMessage(e)),
			});
	}
	async addItem(item: CatalogueItem) {
		if (!(await this.canOrder())) return;
		if (item.isPredefinedPizza) {
			this.selected.set(item);
			return;
		}
		if (item.isAvailable && item.directPrice)
			this.addLine({
				productSku: item.productSku,
				name: item.name,
				quantity: 1,
				unitPrice: item.directPrice.amount,
				currency: item.directPrice.currency,
				allergens: item.allergens,
				ingredients: [],
			});
	}
	async addLine(line: Omit<CartLine, 'id'>) {
		if (!(await this.canOrder())) return;
		if (this.cart.add(line)) this.selected.set(null);
	}
	private async canOrder(): Promise<boolean> {
		await this.auth.waitForSharedSession();
		const user = this.auth.user();
		if (!user?.roles.includes('CUSTOMER')) return true;
		if (this.phoneVerifiedUsername === user.username) return true;
		try {
			const profile = await firstValueFrom(this.profile.refresh());
			if (profile.phoneNumber) {
				this.phoneVerifiedUsername = user.username;
				return true;
			}
			void this.router.navigate(['/complete-profile'], { queryParams: { returnUrl: '/menu' } });
		} catch (e) {
			this.error.set(errorMessage(e));
		}
		return false;
	}
}
