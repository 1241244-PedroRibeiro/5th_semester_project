import { computed, Injectable, signal } from '@angular/core';
import type { CartLine } from './storefront-models';

@Injectable({ providedIn: 'root' })
export class Cart {
	private readonly state = signal<CartLine[]>(this.restore());
	readonly lines = this.state.asReadonly();
	readonly count = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));
	readonly currency = computed(() => this.lines()[0]?.currency ?? 'EUR');
	readonly subtotal = computed(
		() =>
			this.lines().reduce(
				(sum, line) => sum + Math.round(line.unitPrice * 100) * line.quantity,
				0,
			) / 100,
	);
	readonly notice = signal('');
	readonly noticeParams = signal<Record<string, string>>({});
	add(value: Omit<CartLine, 'id'>): boolean {
		if (this.lines().length && value.currency !== this.currency()) {
			this.notice.set('Items in different currencies cannot share an order.');
			return false;
		}
		const id = JSON.stringify([
			value.productSku,
			value.size ?? '',
			value.ingredients
				.map((i) => [i.sku, i.quantity, i.unitPrice])
				.sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
			value.unitPrice,
			value.currency,
		]);
		const existing = this.lines().find((line) => line.id === id);
		if (existing && existing.quantity + value.quantity > 99) {
			this.notice.set('Each order line supports up to 99 items.');
			return false;
		}
		this.update(
			existing
				? this.lines().map((line) =>
						line.id === id ? { ...line, quantity: line.quantity + value.quantity } : line,
					)
				: [...this.lines(), { ...value, id }],
		);
		this.noticeParams.set({ name: value.name });
		this.notice.set('{{name}} added to your order.');
		return true;
	}
	setQuantity(id: string, quantity: number) {
		if (Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 99)
			this.update(this.lines().map((line) => (line.id === id ? { ...line, quantity } : line)));
	}
	remove(id: string) {
		this.update(this.lines().filter((line) => line.id !== id));
	}
	clear() {
		this.update([]);
	}
	private update(lines: CartLine[]) {
		this.state.set(lines);
		try {
			localStorage.setItem('laprizza-cart-v1', JSON.stringify(lines));
		} catch {
			this.notice.set(
				'Your order is available for this visit, but browser storage is unavailable.',
			);
		}
	}
	private restore(): CartLine[] {
		try {
			const value: unknown = JSON.parse(localStorage.getItem('laprizza-cart-v1') ?? '[]');
			if (!Array.isArray(value)) return [];
			const lines = value.filter(
				(line): line is CartLine =>
					typeof line?.id === 'string' &&
					typeof line?.productSku === 'string' &&
					typeof line?.name === 'string' &&
					Number.isFinite(line?.unitPrice) &&
					line.unitPrice >= 0 &&
					typeof line?.currency === 'string' &&
					/^[A-Z]{3}$/.test(line.currency) &&
					Number.isInteger(line?.quantity) &&
					line.quantity > 0 &&
					line.quantity <= 99 &&
					Array.isArray(line?.allergens) &&
					line.allergens.every((a: unknown) => typeof a === 'string') &&
					Array.isArray(line?.ingredients) &&
					line.ingredients.every(
						(i: { sku?: unknown; name?: unknown; quantity?: unknown; unitPrice?: unknown }) =>
							typeof i?.sku === 'string' &&
							typeof i?.name === 'string' &&
							Number.isSafeInteger(i?.quantity) &&
							Number(i.quantity) > 0 &&
							Number.isFinite(i?.unitPrice) &&
							Number(i.unitPrice) >= 0,
					),
			);
			return lines.filter((line) => line.currency === lines[0]?.currency);
		} catch {
			return [];
		}
	}
}
