import { LocalCurrencyPipe } from '../../../shared_components/core/i18n/locale-pipes';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, input, output } from '@angular/core';
import { CartLine, productImage } from '../../core/storefront-models';
import { QuantityControl } from '../quantity-control/quantity-control';
import { Icon } from '../../../shared_components/ui/icon/icon';

@Component({
	selector: 'app-order-line-item',
	standalone: true,
	imports: [LocalCurrencyPipe, TranslatePipe, QuantityControl, Icon],
	templateUrl: './order-line-item.html',
	styleUrl: './order-line-item.scss',
})
export class OrderLineItem {
	readonly line = input.required<CartLine>();
	readonly quantityChanged = output<number>();
	readonly removed = output<void>();
	image() {
		return productImage(this.line());
	}
}
