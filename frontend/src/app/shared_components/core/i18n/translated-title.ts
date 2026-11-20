import { effect, inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class TranslatedTitle extends TitleStrategy {
	private readonly title = inject(Title);
	private readonly translate = inject(TranslateService);
	private readonly key = signal('LaPrizza');
	constructor() {
		super();
		effect(() => {
			this.translate.currentLang();
			this.title.setTitle(this.translate.instant(this.key()));
		});
	}
	override updateTitle(snapshot: RouterStateSnapshot): void {
		const key = this.buildTitle(snapshot) ?? 'LaPrizza';
		this.key.set(key);
		this.title.setTitle(this.translate.instant(key));
	}
}
