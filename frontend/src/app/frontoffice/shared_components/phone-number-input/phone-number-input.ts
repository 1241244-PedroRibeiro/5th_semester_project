import { Component, forwardRef, Input } from '@angular/core';
import {
	ControlValueAccessor,
	NG_VALIDATORS,
	NG_VALUE_ACCESSOR,
	ValidationErrors,
	Validator,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

const COUNTRY_DIAL_CODES: ReadonlyArray<readonly [string, string]> = [
	['AF', '93'],
	['AL', '355'],
	['DZ', '213'],
	['AD', '376'],
	['AO', '244'],
	['AR', '54'],
	['AM', '374'],
	['AU', '61'],
	['AT', '43'],
	['AZ', '994'],
	['AG', '1'],
	['BS', '1'],
	['BB', '1'],
	['BI', '257'],
	['CF', '236'],
	['TD', '235'],
	['KM', '269'],
	['CG', '242'],
	['CD', '243'],
	['CU', '53'],
	['DM', '1'],
	['ER', '291'],
	['GA', '241'],
	['GM', '220'],
	['GN', '224'],
	['GW', '245'],
	['GY', '592'],
	['HT', '509'],
	['GD', '1'],
	['KN', '1'],
	['LC', '1'],
	['VC', '1'],
	['TT', '1'],
	['LS', '266'],
	['LR', '231'],
	['LY', '218'],
	['MG', '261'],
	['MW', '265'],
	['ML', '223'],
	['MR', '222'],
	['MU', '230'],
	['NA', '264'],
	['NE', '227'],
	['KP', '850'],
	['LA', '856'],
	['KG', '996'],
	['MD', '373'],
	['PS', '970'],
	['SM', '378'],
	['SL', '232'],
	['SO', '252'],
	['SS', '211'],
	['SD', '249'],
	['SR', '597'],
	['SZ', '268'],
	['TJ', '992'],
	['TG', '228'],
	['TM', '993'],
	['UG', '256'],
	['YE', '967'],
	['SY', '963'],
	['VA', '39'],
	['SC', '248'],
	['ST', '239'],
	['SB', '677'],
	['WS', '685'],
	['TO', '676'],
	['TV', '688'],
	['VU', '678'],
	['PG', '675'],
	['FJ', '679'],
	['FM', '691'],
	['MH', '692'],
	['PW', '680'],
	['NR', '674'],
	['KI', '686'],
	['TL', '670'],
	['XK', '383'],
	['BH', '973'],
	['BD', '880'],
	['BY', '375'],
	['BE', '32'],
	['BZ', '501'],
	['BJ', '229'],
	['BT', '975'],
	['BO', '591'],
	['BA', '387'],
	['BW', '267'],
	['BR', '55'],
	['BN', '673'],
	['BG', '359'],
	['BF', '226'],
	['KH', '855'],
	['CM', '237'],
	['CA', '1'],
	['CV', '238'],
	['CL', '56'],
	['CN', '86'],
	['CO', '57'],
	['CR', '506'],
	['HR', '385'],
	['CY', '357'],
	['CZ', '420'],
	['DK', '45'],
	['DJ', '253'],
	['DO', '1'],
	['EC', '593'],
	['EG', '20'],
	['SV', '503'],
	['EE', '372'],
	['ET', '251'],
	['FI', '358'],
	['FR', '33'],
	['GE', '995'],
	['DE', '49'],
	['GH', '233'],
	['GR', '30'],
	['GT', '502'],
	['HN', '504'],
	['HK', '852'],
	['HU', '36'],
	['IS', '354'],
	['IN', '91'],
	['ID', '62'],
	['IR', '98'],
	['IQ', '964'],
	['IE', '353'],
	['IL', '972'],
	['IT', '39'],
	['CI', '225'],
	['JM', '1'],
	['JP', '81'],
	['JO', '962'],
	['KZ', '7'],
	['KE', '254'],
	['KW', '965'],
	['LV', '371'],
	['LB', '961'],
	['LT', '370'],
	['LU', '352'],
	['MO', '853'],
	['MY', '60'],
	['MV', '960'],
	['MT', '356'],
	['MX', '52'],
	['MC', '377'],
	['MN', '976'],
	['ME', '382'],
	['MA', '212'],
	['MZ', '258'],
	['MM', '95'],
	['NP', '977'],
	['NL', '31'],
	['NZ', '64'],
	['NI', '505'],
	['NG', '234'],
	['MK', '389'],
	['NO', '47'],
	['OM', '968'],
	['PK', '92'],
	['PA', '507'],
	['PY', '595'],
	['PE', '51'],
	['PH', '63'],
	['PL', '48'],
	['PT', '351'],
	['QA', '974'],
	['RO', '40'],
	['RU', '7'],
	['RW', '250'],
	['SA', '966'],
	['SN', '221'],
	['RS', '381'],
	['SG', '65'],
	['SK', '421'],
	['SI', '386'],
	['ZA', '27'],
	['KR', '82'],
	['ES', '34'],
	['LK', '94'],
	['SE', '46'],
	['CH', '41'],
	['TW', '886'],
	['TZ', '255'],
	['TH', '66'],
	['TN', '216'],
	['TR', '90'],
	['UA', '380'],
	['AE', '971'],
	['GB', '44'],
	['US', '1'],
	['UY', '598'],
	['UZ', '998'],
	['VE', '58'],
	['VN', '84'],
	['ZM', '260'],
	['ZW', '263'],
];
const COUNTRIES_WITH_NATIONAL_TRUNK_ZERO = new Set([
	'AT',
	'BE',
	'BR',
	'BG',
	'CN',
	'CY',
	'CZ',
	'DK',
	'EE',
	'FI',
	'FR',
	'DE',
	'GR',
	'HU',
	'ID',
	'IE',
	'IL',
	'JP',
	'LV',
	'LT',
	'LU',
	'MY',
	'MX',
	'NL',
	'NZ',
	'NO',
	'PK',
	'PL',
	'PT',
	'RO',
	'RU',
	'ZA',
	'ES',
	'SE',
	'CH',
	'TH',
	'TR',
	'UA',
	'GB',
]);

@Component({
	selector: 'app-phone-number-input',
	standalone: true,
	imports: [TranslatePipe],
	template: `
		<div class="phone-entry" [class.invalid]="invalid">
			<label class="country-field">
				<span>{{ 'Country' | translate }}</span>
				<select
					[value]="countryCode"
					(change)="selectCountry($event)"
					[disabled]="disabled"
					autocomplete="country"
				>
					@for (country of countries; track country.code) {
						<option [value]="country.code">
							{{ country.flag }} {{ country.name }} (+{{ country.dialCode }})
						</option>
					}
				</select>
			</label>
			<label class="number-field">
				<span>{{ 'Phone number' | translate }}</span>
				<div class="national-number">
					<span class="dial-code" aria-hidden="true">+{{ dialCode }}</span>
					<input
						type="tel"
						[value]="nationalNumber"
						(input)="setNationalNumber($event)"
						(blur)="onTouched()"
						[disabled]="disabled"
						autocomplete="tel-national"
						inputmode="tel"
						[attr.aria-invalid]="invalid"
						[attr.aria-describedby]="hintId"
						[placeholder]="'Phone number' | translate"
					/>
				</div>
				<small [id]="hintId">{{
					'Enter your number without the country calling code.' | translate
				}}</small>
			</label>
		</div>
	`,
	styles: [
		`
			:host {
				display: block;
			}
			.phone-entry {
				display: grid;
				gap: 0.85rem;
			}
			label {
				display: grid;
				gap: 0.4rem;
				color: var(--ink);
				font-size: 0.8rem;
				font-weight: 600;
			}
			select,
			input {
				box-sizing: border-box;
				width: 100%;
				min-height: 3rem;
				padding: 0.72rem 0.85rem;
				border: 1px solid var(--border);
				border-radius: 0.65rem;
				background: var(--surface);
				color: var(--ink);
				font: inherit;
				font-weight: 400;
			}
			select {
				text-overflow: ellipsis;
			}
			.national-number {
				display: grid;
				grid-template-columns: auto minmax(0, 1fr);
				align-items: center;
				border: 1px solid var(--border);
				border-radius: 0.65rem;
				background: var(--surface);
			}
			.national-number input {
				border: 0;
				background: transparent;
			}
			.dial-code {
				padding-left: 0.9rem;
				color: var(--muted);
				white-space: nowrap;
			}
			small {
				color: var(--muted);
				font-size: 0.72rem;
				font-weight: 400;
				line-height: 1.5;
			}
			.invalid select,
			.invalid .national-number {
				border-color: #942507;
			}
			:focus-visible {
				outline: 3px solid color-mix(in srgb, var(--accent) 45%, transparent);
				outline-offset: 2px;
			}
		`,
	],
	providers: [
		{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PhoneNumberInput), multi: true },
		{ provide: NG_VALIDATORS, useExisting: forwardRef(() => PhoneNumberInput), multi: true },
	],
})
export class PhoneNumberInput implements ControlValueAccessor, Validator {
	@Input() required = false;
	readonly countries = COUNTRY_DIAL_CODES.map(([code, dialCode]) => ({
		code,
		dialCode,
		flag: String.fromCodePoint(...[...code].map((letter) => letter.charCodeAt(0) + 127397)),
		name:
			new Intl.DisplayNames([globalThis.navigator?.language ?? 'en'], { type: 'region' }).of(
				code,
			) ?? code,
	})).sort((a, b) => a.name.localeCompare(b.name));
	countryCode = 'PT';
	nationalNumber = '';
	disabled = false;
	invalid = false;
	readonly hintId = `phone-hint-${Math.random().toString(36).slice(2)}`;
	private value = '';
	private onChange: (value: string) => void = () => {};
	onTouched: () => void = () => {};
	get dialCode() {
		return this.countries.find((country) => country.code === this.countryCode)?.dialCode ?? '351';
	}

	writeValue(value: string | null): void {
		this.value = value ?? '';
		this.nationalNumber = '';
		if (this.value.startsWith('+')) {
			const match = [...this.countries]
				.sort((a, b) => b.dialCode.length - a.dialCode.length)
				.find((country) => this.value.startsWith(`+${country.dialCode}`));
			if (match) {
				this.countryCode = match.code;
				this.nationalNumber = this.value.slice(match.dialCode.length + 1).replace(/\D/g, '');
			}
		}
		this.invalid = false;
	}
	registerOnChange(fn: (value: string) => void): void {
		this.onChange = fn;
	}
	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}
	setDisabledState(disabled: boolean): void {
		this.disabled = disabled;
	}
	validate(): ValidationErrors | null {
		const digits = this.nationalNumber.replace(/\D/g, '');
		const national = COUNTRIES_WITH_NATIONAL_TRUNK_ZERO.has(this.countryCode)
			? digits.replace(/^0/, '')
			: digits;
		const empty = national.length === 0;
		const valid = !empty && national.length + this.dialCode.length <= 15 && national.length >= 4;
		this.invalid = this.required ? !valid : !empty && !valid;
		return this.invalid ? { phoneNumber: true } : null;
	}
	selectCountry(event: Event): void {
		this.countryCode = (event.target as HTMLSelectElement).value;
		this.publish();
	}
	setNationalNumber(event: Event): void {
		this.nationalNumber = (event.target as HTMLInputElement).value.replace(/[^\d\s().-]/g, '');
		this.publish();
	}
	private publish(): void {
		const digits = this.nationalNumber.replace(/\D/g, '');
		const national = COUNTRIES_WITH_NATIONAL_TRUNK_ZERO.has(this.countryCode)
			? digits.replace(/^0/, '')
			: digits;
		this.value = national ? `+${this.dialCode}${national}` : '';
		this.onChange(this.value);
		this.validate();
	}
}
