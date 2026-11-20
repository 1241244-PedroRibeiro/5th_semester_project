import { TranslatePipe } from '@ngx-translate/core';
import { Component, input, output } from '@angular/core';

@Component({
	imports: [TranslatePipe],
	selector: 'app-allergen-chips',
	standalone: true,
	templateUrl: './allergen-chips.html',
	styles:
		':host{display:block}.chips{display:flex;flex-wrap:wrap;gap:.65rem}.chip{border:1.5px solid var(--ink);border-radius:2rem;background:var(--teal-soft);color:var(--ink);padding:.3rem .7rem;font-size:.7rem;letter-spacing:.06em}.chip.selected{background:var(--accent)}button.chip{min-height:2.4rem}button.chip:disabled{opacity:1}p{font-size:.8rem;margin:0;color:var(--muted)}',
})
export class AllergenChips {
	readonly names = input.required<string[]>();
	readonly selectable = input(false);
	readonly selected = input<string[]>([]);
	readonly locked = input<string[]>([]);
	readonly toggled = output<string>();
}
