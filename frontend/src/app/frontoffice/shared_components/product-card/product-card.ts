import { LocalCurrencyPipe } from '../../../shared_components/core/i18n/locale-pipes';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, input, output } from '@angular/core';
import { CatalogueItem, itemPrice, productImage } from '../../core/storefront-models';
import { StorefrontButton } from '../storefront-button/storefront-button';
import { Icon } from '../../../shared_components/ui/icon/icon';

@Component({
	selector: 'app-product-card',
	standalone: true,
	imports: [LocalCurrencyPipe, TranslatePipe, StorefrontButton, Icon],
	templateUrl: './product-card.html',
	styleUrl: './product-card.scss',
})
export class ProductCard {
	readonly item = input.required<CatalogueItem>();
	readonly customize = output<CatalogueItem>();
	readonly added = output<CatalogueItem>();
	price() {
		return itemPrice(this.item());
	}
	image() {
		return productImage(this.item());
	}
}
