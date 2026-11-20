import { TranslatePipe } from '@ngx-translate/core';
import { Component, input, output } from '@angular/core';
import { StorefrontButton } from '../storefront-button/storefront-button';
import { Icon } from '../../../shared_components/ui/icon/icon';

@Component({
	selector: 'app-menu-feedback',
	standalone: true,
	imports: [TranslatePipe, StorefrontButton, Icon],
	templateUrl: './menu-feedback.html',
	styleUrl: './menu-feedback.scss',
})
export class MenuFeedback {
	readonly state = input<'loading' | 'error' | 'empty'>('loading');
	readonly message = input('');
	readonly retry = output<void>();
}
