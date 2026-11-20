import { TranslatePipe } from '@ngx-translate/core';
import { Component, input, output } from '@angular/core';
export interface Tab {
	id: string;
	label: string;
	count?: number;
}
@Component({
	imports: [TranslatePipe],
	selector: 'app-tabs',
	standalone: true,
	template: `<nav [attr.aria-label]="'Filter results' | translate">
		@for (tab of tabs(); track tab.id) {
			<button
				type="button"
				[class.active]="active() === tab.id"
				[attr.aria-pressed]="active() === tab.id"
				(click)="changed.emit(tab.id)"
			>
				{{ tab.label | translate }}
				@if (tab.count !== undefined) {
					<span>{{ tab.count }}</span>
				}
			</button>
		}
	</nav>`,
	styles:
		'nav{display:flex;gap:1.5rem;overflow-x:auto;padding:0 1.5rem;border-bottom:1px solid var(--border)}button{flex-shrink:0;display:flex;gap:.35rem;padding:1rem 0;border:0;border-bottom:2px solid transparent;border-radius:0;color:var(--muted);background:none;font-size:.78rem}button.active{color:var(--accent);border-color:var(--accent)}',
})
export class Tabs {
	readonly tabs = input.required<Tab[]>();
	readonly active = input('all');
	readonly changed = output<string>();
}
