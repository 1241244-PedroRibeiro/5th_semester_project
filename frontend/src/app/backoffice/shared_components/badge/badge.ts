import { Component, input } from '@angular/core';

@Component({
	selector: 'app-badge',
	standalone: true,
	template: '<span [class]="tone()"><ng-content /></span>',
	styles:
		'span{display:inline-flex;align-items:center;gap:.3rem;white-space:nowrap;font-size:.7rem;padding:.3rem .65rem;border-radius:2rem;background:var(--neutral);color:var(--muted)}.teal{background:var(--teal-soft);color:var(--teal)}.orange{background:var(--accent-soft);color:var(--accent)}.yellow{background:var(--yellow);color:var(--teal)}',
})
export class Badge {
	readonly tone = input('neutral');
}
