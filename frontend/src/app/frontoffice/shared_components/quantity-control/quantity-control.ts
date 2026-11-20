import { TranslatePipe } from '@ngx-translate/core';
import { Component, input, output } from '@angular/core';

@Component({
	imports: [TranslatePipe],
	selector: 'app-quantity-control',
	standalone: true,
	template: `<div class="quantity" role="group" [attr.aria-label]="label()">
		<button
			type="button"
			[disabled]="disabled() || value() <= min()"
			[attr.aria-label]="('Decrease ' | translate) + label() | translate"
			(click)="changed.emit(value() - 1)"
		>
			−</button
		><output [attr.aria-label]="label()">{{ value() }}</output
		><button
			type="button"
			[disabled]="disabled() || value() >= max()"
			[attr.aria-label]="('Increase ' | translate) + label() | translate"
			(click)="changed.emit(value() + 1)"
		>
			+
		</button>
	</div>`,
	styles:
		'.quantity{display:inline-flex;align-items:center;gap:.6rem}button{display:grid;place-items:center;width:2rem;height:2rem;border:1.5px solid var(--ink);border-radius:50%;background:var(--surface);font-size:1.15rem;line-height:1}button:disabled{background:var(--teal-soft)}output{font-weight:650;min-width:1.2rem;text-align:center}',
})
export class QuantityControl {
	readonly value = input(1);
	readonly min = input(1);
	readonly max = input(99);
	readonly disabled = input(false);
	readonly label = input('quantity');
	readonly changed = output<number>();
}
