import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { TranslatePipe } from '@ngx-translate/core';
import {
	afterNextRender,
	Component,
	ElementRef,
	input,
	OnDestroy,
	output,
	viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';
@Component({
	selector: 'app-modal',
	standalone: true,
	imports: [LanguageSwitcher, TranslatePipe, Icon],
	templateUrl: './modal.html',
	styleUrl: './modal.scss',
})
export class Modal implements OnDestroy {
	readonly title = input.required<string>();
	readonly description = input('');
	readonly busy = input(false);
	readonly closed = output<void>();
	private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
	private readonly previous = document.activeElement as HTMLElement | null;
	private readonly overflow = document.body.style.overflow;
	constructor() {
		afterNextRender(() => {
			const dialog = this.dialog().nativeElement;
			dialog.setAttribute('aria-label', this.title());
			dialog.showModal();
			document.body.style.overflow = 'hidden';
		});
	}
	cancel(event: Event) {
		event.preventDefault();
		if (!this.busy()) this.closed.emit();
	}
	ngOnDestroy() {
		this.dialog().nativeElement.close();
		document.body.style.overflow = this.overflow;
		this.previous?.focus();
	}
}
