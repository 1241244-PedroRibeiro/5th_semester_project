import { TranslatePipe } from '@ngx-translate/core';
import { Component, input, output } from '@angular/core';

/** Render outside a scrolling sidebar so its label is not clipped by the icon rail. */
@Component({
	imports: [TranslatePipe],
	selector: 'app-navigation-tooltip',
	standalone: true,
	host: {
		role: 'tooltip',
		'[style.top.px]': 'top()',
		'[style.left.px]': 'left()',
		'(pointerenter)': 'entered.emit()',
		'(pointerleave)': 'leftTooltip.emit()',
	},
	template: `{{ text() | translate }}`,
	styles: `
		:host {
			position: fixed;
			z-index: 45;
			transform: translateY(-50%);
			max-width: min(15rem, calc(100vw - 6rem));
			padding: 0.65rem 0.85rem;
			border-radius: 0.5rem;
			background: var(--ink);
			color: var(--surface);
			box-shadow: 0 0.25rem 1rem #223b3c26;
			font-size: 0.78rem;
			line-height: 1.4;
			overflow-wrap: anywhere;
		}
	`,
})
export class NavigationTooltip {
	readonly text = input.required<string>();
	readonly top = input.required<number>();
	readonly left = input.required<number>();
	readonly entered = output<void>();
	readonly leftTooltip = output<void>();
}
