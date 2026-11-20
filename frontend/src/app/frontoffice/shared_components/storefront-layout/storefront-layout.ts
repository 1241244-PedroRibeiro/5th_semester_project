import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../../shared_components/core/auth/auth';
import { Cart } from '../../core/cart';
import { StorefrontBrand } from '../storefront-brand/storefront-brand';
import { StorefrontFooter } from '../storefront-footer/storefront-footer';
import { Icon } from '../../../shared_components/ui/icon/icon';

@Component({
	selector: 'app-storefront-layout',
	standalone: true,
	host: { class: 'storefront' },
	imports: [
		TranslatePipe,
		RouterLink,
		RouterLinkActive,
		RouterOutlet,
		StorefrontBrand,
		StorefrontFooter,
		Icon,
	],
	templateUrl: './storefront-layout.html',
	styleUrl: './storefront-layout.scss',
})
export class StorefrontLayout {
	readonly auth = inject(Auth);
	readonly cart = inject(Cart);
	private readonly router = inject(Router);
	async logout() {
		if (!(await this.auth.logout())) return;
		void this.router.navigate(['/']);
	}
	skip(event: Event) {
		event.preventDefault();
		document.getElementById('customer-content')?.focus();
	}
}
