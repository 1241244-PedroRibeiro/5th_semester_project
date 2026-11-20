import { TranslatePipe } from '@ngx-translate/core';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared_components/ui/icon/icon';
import { StorefrontButton } from '../storefront-button/storefront-button';

@Component({
	selector: 'app-order-hero',
	standalone: true,
	imports: [TranslatePipe, RouterLink, Icon, StorefrontButton],
	templateUrl: './order-hero.html',
	styleUrl: './order-hero.scss',
})
export class OrderHero {}
