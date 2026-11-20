import { TranslatePipe } from '@ngx-translate/core';
import { Component, input, output } from '@angular/core';
import { Icon } from '../../../shared_components/ui/icon/icon';

type FeedbackKind = 'empty' | 'loading' | 'error' | 'success';

@Component({
	selector: 'app-feedback',
	standalone: true,
	imports: [TranslatePipe, Icon],
	template: `
		<div
			[class]="kind()"
			[attr.role]="kind() === 'error' ? 'alert' : 'status'"
			[attr.aria-live]="kind() === 'error' ? 'assertive' : 'polite'"
			[attr.aria-busy]="kind() === 'loading' ? 'true' : null"
		>
			<app-icon
				[name]="
					kind() === 'error'
						? 'alert'
						: kind() === 'loading'
							? 'refresh'
							: kind() === 'success'
								? 'check'
								: 'box'
				"
			/>

			<h3>{{ title() | translate }}</h3>

			@if (message()) {
				<p>{{ message() | translate }}</p>
			}

			@if (retryable() && kind() === 'error') {
				<button class="button" type="button" (click)="retry.emit()">
					{{ 'Try again' | translate }}
				</button>
			}
		</div>
	`,
	styles: `
		div {
			text-align: center;
			padding: 3rem 1.5rem;
		}

		app-icon {
			font-size: 1.8rem;
			color: var(--teal);
		}

		h3 {
			font-size: 1rem;
			font-weight: 550;
			margin: .75rem 0 .4rem;
		}

		p {
			color: var(--muted);
			font-size: .85rem;
			margin: .4rem auto 1rem;
			max-width: 32rem;
		}

		.error app-icon {
			color: var(--accent);
		}

		.success app-icon {
			color: var(--teal);
		}

		.loading app-icon {
			animation: spin 1.5s linear infinite;
		}

		@keyframes spin {
			to {
				transform: rotate(360deg);
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.loading app-icon {
				animation: none;
			}
		}
	`,
})
export class Feedback {
	readonly kind = input<FeedbackKind>('empty');
	readonly title = input('Nothing here yet');
	readonly message = input('');
	readonly retryable = input(false);
	readonly retry = output<void>();
}
