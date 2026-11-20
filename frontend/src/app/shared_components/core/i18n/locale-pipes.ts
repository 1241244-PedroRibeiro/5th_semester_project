import { CurrencyPipe, DatePipe } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { Language } from './language';

@Pipe({ name: 'localCurrency', standalone: true, pure: false })
export class LocalCurrencyPipe implements PipeTransform {
	private readonly language = inject(Language);
	private readonly pipe = new CurrencyPipe('en');
	transform(value: number | string | null | undefined, currency = 'EUR'): string | null {
		return this.pipe.transform(value, currency, 'symbol', undefined, this.language.locale());
	}
}

@Pipe({ name: 'localDate', standalone: true, pure: false })
export class LocalDatePipe implements PipeTransform {
	private readonly language = inject(Language);
	private readonly pipe = new DatePipe('en');
	transform(
		value: Date | number | string | null | undefined,
		format = 'mediumDate',
	): string | null {
		return this.pipe.transform(value, format, undefined, this.language.locale());
	}
}
