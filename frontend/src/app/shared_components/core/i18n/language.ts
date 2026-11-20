import { DOCUMENT, registerLocaleData } from '@angular/common';
import portuguese from '@angular/common/locales/pt-PT';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

registerLocaleData(portuguese);
export type LanguageCode = 'en' | 'pt-PT';

@Injectable({ providedIn: 'root' })
export class Language {
	readonly translate = inject(TranslateService);
	private readonly document = inject(DOCUMENT);
	readonly busy = signal(false);
	readonly error = signal(false);
	readonly locale = computed(() => (this.translate.currentLang() === 'pt-PT' ? 'pt-PT' : 'en'));

	constructor() {
		effect(() => {
			this.document.documentElement.lang = this.locale();
		});
	}

	async initialize(): Promise<void> {
		let saved: string | null = null;
		try {
			saved = localStorage.getItem('laprizza.lang');
		} catch {
			/* Storage may be disabled. */
		}
		const preferred =
			saved === 'en' || saved === 'pt-PT'
				? saved
				: this.document.defaultView?.navigator.languages.find((value) =>
						/^(en|pt)(-|$)/i.test(value),
					);
		await this.use(preferred?.toLowerCase().startsWith('pt') ? 'pt-PT' : 'en', false);
	}

	async use(locale: LanguageCode, persist = true): Promise<void> {
		if (this.busy()) return;
		this.busy.set(true);
		this.error.set(false);
		try {
			await firstValueFrom(this.translate.use(locale));
			console.log('Requested language:', locale);
console.log('Active language:', this.translate.getCurrentLang());
console.log(
    'Kitchen title:',
    this.translate.instant('Kitchen Configurations')
);
console.log(
    'Width:',
    this.translate.instant('Width:')
);
			this.document.documentElement.lang = locale;
			if (persist) {
				try {
					localStorage.setItem('laprizza.lang', locale);
				} catch {
					/* Keep in-memory selection. */
				}
			}
		} catch {
			this.error.set(true);
			if (!this.translate.getCurrentLang()) {
				try {
					await firstValueFrom(this.translate.use('en'));
				} catch {
					/* English source keys remain readable. */
				}
			}
		} finally {
			this.busy.set(false);
		}
	}
}
