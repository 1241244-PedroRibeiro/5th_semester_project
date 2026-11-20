import { TranslatePipe } from '@ngx-translate/core';
import { Component, input } from '@angular/core';
@Component({
	imports: [TranslatePipe],
	selector: 'app-panel',
	standalone: true,
	template: `<header>
			<div class="heading">
				<h2>{{ title() | translate }}</h2>
				@if (count() !== null) {
					<span class="count">{{ count() }} {{ unit() | translate }}</span>
				}
			</div>
			<div class="actions"><ng-content select="[panel-actions]" /></div>
		</header>
		<ng-content />`,
	styles:
		':host{display:block;min-width:0;background:var(--surface);border:1px solid var(--border);border-radius:1rem;overflow:hidden}header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem;padding:1.4rem 1.5rem 1rem}.heading{display:flex;align-items:center;gap:.65rem}h2{font-size:1rem;font-weight:550;margin:0}.count{background:var(--neutral);color:var(--muted);border-radius:2rem;padding:.25rem .55rem;font-size:.7rem}.actions{display:flex;gap:.5rem}@media(max-width:540px){header{padding:1rem}}',
})
export class Panel {
	readonly title = input.required<string>();
	readonly count = input<number | null>(null);
	readonly unit = input('items');
}
