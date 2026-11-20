import { TranslatePipe } from '@ngx-translate/core';
import { booleanAttribute, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon } from '../../../shared_components/ui/icon/icon';

@Component({
	selector: 'app-sidebar-action',
	standalone: true,
	imports: [TranslatePipe, RouterLink, RouterLinkActive, Icon],
	host: { '[class.compact]': 'compact()' },
	template: `<a
		[routerLink]="path()"
		routerLinkActive="active"
		ariaCurrentWhenActive="page"
		[attr.aria-label]="label() | translate"
		[attr.aria-describedby]="hintId()"
		(pointerenter)="hintRequested.emit($event)"
		(pointerleave)="hintDismissed.emit()"
		(focus)="hintRequested.emit($event)"
		(blur)="hintDismissed.emit()"
		(click)="activated.emit()"
	>
		<app-icon [name]="icon()" /><span [class.sr-only]="compact()">{{
			label() | translate
		}}</span></a
	>`,
	styles: `
		:host {
			display: block;
			margin-bottom: 0.75rem;
		}
		a {
			display: flex;
			align-items: center;
			gap: 0.65rem;
			min-height: 2.75rem;
			padding: 0.65rem;
			border-radius: 0.5rem;
			text-decoration: none;
			color: var(--ink);
			font-size: 0.78rem;
		}
		a:hover {
			background: #ffffff30;
		}
		a.active {
			background: var(--accent);
			color: white;
		}
		:host(.compact) a {
			justify-content: center;
		}
		app-icon {
			font-size: 1.3rem;
		}
	`,
})
export class SidebarAction {
	readonly path = input.required<string>();
	readonly label = input.required<string>();
	readonly icon = input('box');
	readonly compact = input(false, { transform: booleanAttribute });
	readonly hintId = input<string | null>(null);
	readonly hintRequested = output<Event>();
	readonly hintDismissed = output<void>();
	readonly activated = output<void>();
}
