import { TitleStrategy } from '@angular/router';
import { TranslatedTitle } from './shared_components/core/i18n/translated-title';
import { inject, provideAppInitializer } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { Language } from './shared_components/core/i18n/language';
import {
	type ApplicationConfig,
	provideZonelessChangeDetection,
	provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './shared_components/core/auth/auth';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
	providers: [
		{ provide: TitleStrategy, useClass: TranslatedTitle },
		provideTranslateService({
			fallbackLang: 'en',
			loader: provideTranslateHttpLoader({
				prefix: '/i18n/',
				suffix: '.json',
				failOnError: true,
				useHttpBackend: true,
			}),
		}),
		provideAppInitializer(() => inject(Language).initialize()),
		provideBrowserGlobalErrorListeners(),
		provideZonelessChangeDetection(),
		provideRouter(routes),
		provideHttpClient(withInterceptors([authInterceptor])),
	],
};
