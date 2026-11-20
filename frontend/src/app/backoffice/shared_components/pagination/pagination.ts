import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, input, output } from '@angular/core';
import { Icon } from '../../../shared_components/ui/icon/icon';
@Component({
	selector: 'app-pagination',
	standalone: true,
	imports: [TranslatePipe, Icon],
	template: `<p>
			{{
				total()
					? ('Showing ' | translate) + start() + '–' + end() + (' of ' | translate) + total()
					: ('No' | translate)
			}}
			{{ label() | translate }}
		</p>
		<nav [attr.aria-label]="'Pagination' | translate">
			<button
				class="icon-button"
				[attr.aria-label]="'Previous page' | translate"
				[disabled]="page() <= 1"
				(click)="changed.emit(page() - 1)"
			>
				<app-icon name="chevron" class="previous" /></button
			><span>{{ 'Page' | translate }} {{ page() }} {{ 'of' | translate }} {{ pages() }}</span
			><button
				class="icon-button"
				[attr.aria-label]="'Next page' | translate"
				[disabled]="page() >= pages()"
				(click)="changed.emit(page() + 1)"
			>
				<app-icon name="chevron" />
			</button>
		</nav>`,
	styles:
		':host{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.75rem;border-top:1px solid var(--border);padding:1rem 1.4rem;font-size:.72rem;color:var(--muted)}p{margin:0}nav{display:flex;align-items:center;gap:.6rem}.previous{transform:rotate(180deg)}',
})
export class Pagination {
	readonly page = input(1);
	readonly pageSize = input(8);
	readonly total = input(0);
	readonly label = input('items');
	readonly changed = output<number>();
	readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
	readonly start = computed(() => (this.page() - 1) * this.pageSize() + 1);
	readonly end = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
}
