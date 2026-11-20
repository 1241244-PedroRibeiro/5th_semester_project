import { booleanAttribute, Directive, input } from '@angular/core';

@Directive({
	selector: '[shopButton]',
	standalone: true,
	host: {
		class: 'shop-button',
		'[class.secondary]': 'tone() === "secondary"',
		'[class.small]': 'small()',
	},
})
export class StorefrontButton {
	readonly tone = input<'primary' | 'secondary'>('primary');
	readonly small = input(false, { transform: booleanAttribute });
}
