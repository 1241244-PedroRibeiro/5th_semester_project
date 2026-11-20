import { TranslatePipe } from '@ngx-translate/core';
import { booleanAttribute, Component, input } from '@angular/core';
import { Icon } from '../../../shared_components/ui/icon/icon';
@Component({
	selector: 'app-brand',
	standalone: true,
	host: { '[class.compact]': 'compact()' },
	imports: [TranslatePipe, Icon],
	template: `<span class="mark"><app-icon name="pizza" /></span
		><span class="brand-copy"
			><span class="name">{{ 'Forno.' | translate }}</span
			><span class="caption">{{ 'Management center' | translate }}</span></span
		>`,
	styles:
		':host{display:flex;align-items:center;gap:.65rem}:host(.compact){gap:0}:host(.compact) .brand-copy{display:none}.mark{display:grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:.8rem;background:var(--accent);color:white;font-size:1.4rem}.name{display:block;font-size:1.4rem;letter-spacing:-.05em;line-height:1.1}.caption{display:block;text-transform:uppercase;font-size:.55rem;letter-spacing:.1em;margin-top:.3rem;color:var(--teal)}',
})
export class Brand {
	readonly compact = input(false, { transform: booleanAttribute });
}
