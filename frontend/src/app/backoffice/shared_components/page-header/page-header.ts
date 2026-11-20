import { TranslatePipe } from '@ngx-translate/core';
import { Component, input } from '@angular/core';
@Component({
	imports: [TranslatePipe],
	selector: 'app-page-header',
	standalone: true,
	template: `<div>
			<p class="eyebrow">{{ eyebrow() | translate }}</p>
			<h1>{{ title() | translate }}</h1>
			<p class="muted">{{ description() | translate }}</p>
		</div>
		<div class="actions"><ng-content /></div>`,
	styles:
		':host{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1.65rem}h1{font-size:clamp(1.55rem,2.3vw,2rem);font-weight:450;letter-spacing:-.025em;margin:0 0 .4rem}p{margin:0;font-size:.85rem}.eyebrow:empty{display:none}.actions{display:flex;gap:.5rem}@media(max-width:540px){:host{align-items:flex-start;flex-direction:column}}',
})
export class PageHeader {
	readonly title = input.required<string>();
	readonly description = input('');
	readonly eyebrow = input('');
}
