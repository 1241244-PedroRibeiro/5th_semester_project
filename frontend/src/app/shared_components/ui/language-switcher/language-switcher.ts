import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Language } from '../../core/i18n/language';

@Component({
	selector: 'app-language-switcher',
	standalone: true,
	imports: [TranslatePipe],
	template: `
		<nav [attr.aria-label]="'Language' | translate" [attr.aria-busy]="language.busy()">
			@if (language.error()) {
				<span role="status">{{
					'Language could not be loaded. Please try again.' | translate
				}}</span>
			}
			<button
				type="button"
				lang="pt-PT"
				aria-label="Português"
				[attr.aria-pressed]="language.locale() === 'pt-PT'"
				[disabled]="language.busy()"
				(click)="language.use('pt-PT')"
			>
				pt
			</button>
			<span aria-hidden="true">|</span>
			<button
				type="button"
				lang="en"
				aria-label="English"
				[attr.aria-pressed]="language.locale() === 'en'"
				[disabled]="language.busy()"
				(click)="language.use('en')"
			>
				en
			</button>
		</nav>
	`,
	styles: `
		:host {
			display: block;
			position: sticky;
			top: 0;
			z-index: 90;
			height: var(--language-bar-height);
		}
		nav {
			min-height: var(--language-bar-height);
			display: flex;
			align-items: center;
			justify-content: flex-end;
			gap: 0.25rem;
			padding: 0 clamp(0.75rem, 3vw, 2rem);
			background: #fffdf8;
			color: #223b3c;
			border-bottom: 1px solid #e8e5dc;
			font-size: 0.8rem;
		}
		button {
			border: 0;
			background: transparent;
			min-width: 2.75rem;
			min-height: 2.65rem;
			padding: 0.4rem;
			color: inherit;
			font-weight: 500;
			text-transform: lowercase;
		}
		button[aria-pressed='true'] {
			color: #c43808;
			font-weight: 800;
			text-decoration: underline;
			text-underline-offset: 0.3rem;
		}
		button:focus-visible {
			outline: 2px solid #416b6c;
			outline-offset: -3px;
		}
		span[role='status'] {
			margin-right: auto;
			max-width: 65%;
			font-size: 0.7rem;
		}
	`,
})
export class LanguageSwitcher {
	readonly language = inject(Language);
}
