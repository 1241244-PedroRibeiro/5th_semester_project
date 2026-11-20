import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../../shared_components/core/auth/auth';
import { Cart } from '../../core/cart';
import { CustomerProfile } from '../../core/customer-profile';
import { OrderLineItem } from '../../shared_components/order-line-item/order-line-item';
import { OrderTotals } from '../../shared_components/order-totals/order-totals';
import { StorefrontButton } from '../../shared_components/storefront-button/storefront-button';
import { Icon } from '../../../shared_components/ui/icon/icon';

@Component({
	selector: 'app-customer-order-page',
	standalone: true,
	imports: [TranslatePipe, RouterLink, OrderLineItem, OrderTotals, StorefrontButton, Icon],
	templateUrl: './order-page.html',
	styleUrl: './order-page.scss',
})
export class CustomerOrderPage {
	readonly cart = inject(Cart);
	readonly auth = inject(Auth);
	readonly profile = inject(CustomerProfile);
}
