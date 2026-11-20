import { LocalCurrencyPipe } from '../../../shared_components/core/i18n/locale-pipes';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, input, output } from '@angular/core';
import { StorefrontButton } from '../storefront-button/storefront-button';
import { Icon } from '../../../shared_components/ui/icon/icon';

@Component({
	selector: 'app-order-totals',
	standalone: true,
	imports: [LocalCurrencyPipe, TranslatePipe, StorefrontButton, Icon],
	templateUrl: './order-totals.html',
	styleUrl: './order-totals.scss',
})
export class OrderTotals {
	readonly subtotal = input.required<number>();
	readonly currency = input('EUR');
	readonly delivery = input<number | null>(null);
	readonly tax = input<number | null>(null);
	readonly checkoutEnabled = input(false);
	readonly checkout = output<void>();
	readonly total = computed(() => this.subtotal() + (this.delivery() ?? 0) + (this.tax() ?? 0));
}
