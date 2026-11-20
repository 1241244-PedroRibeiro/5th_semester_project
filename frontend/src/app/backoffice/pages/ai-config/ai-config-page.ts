import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Modal } from '../../../shared_components/ui/modal/modal';
import {
	BackofficeApi,
	ConsumptionForecast,
	ForecastEntry,
	PlanningResult,
	SupplierScenario,
	errorMessage,
} from '../../core/api/backoffice-api';

type Tab = 'forecasts' | 'scenarios' | 'execute';

@Component({
	selector: 'app-ai-config-page',
	standalone: true,
	imports: [FormsModule, DecimalPipe, TranslatePipe, Modal],
	templateUrl: './ai-config-page.html',
	styleUrl: './ai-config-page.scss',
})
export class AiConfigPage {
	private readonly api = inject(BackofficeApi);
	private readonly translate = inject(TranslateService);
	readonly tab = signal<Tab>('forecasts');
	readonly forecasts = signal<ConsumptionForecast[]>([]);
	readonly scenarios = signal<SupplierScenario[]>([]);
	readonly products = signal<Array<{ sku: string; name: string; isSellable: boolean; isActive: boolean }>>([]);
	readonly pizzaSizes = signal<string[]>([]);
	readonly forecast = signal<ConsumptionForecast>(this.emptyForecast());
	readonly scenario = signal(this.emptyScenario());
	readonly editingForecast = signal<string | undefined>(undefined);
	readonly editingScenario = signal<string | undefined>(undefined);
	readonly selectedForecast = signal('');
	readonly selectedScenario = signal('');
	readonly referenceDate = signal('');
	readonly result = signal<PlanningResult | null>(null);
	readonly history = signal<PlanningResult[]>([]);
	readonly busy = signal(false);
	readonly errors = signal<string[]>([]);
	readonly notice = signal('');
	readonly importPreview = signal<SupplierScenario | null>(null);
	readonly importErrors = signal<string[]>([]);
	readonly newSupplierCode = signal('');
	readonly newOffer = signal({ supplierCode: '', productSku: '', priceEur: 0, stockUnitQuantity: 1, leadTimeDays: 0, dailySupplyLimit: null as number | null });
	readonly pendingDeletion = signal<{ kind: 'forecast' | 'scenario'; name: string } | null>(null);

	constructor() {
		this.refresh();
		this.api.products().subscribe({
			next: (products) => this.products.set(products.map((p: any) => ({
				sku: p.sku, name: p.name, isSellable: p.isSellable ?? p.sellable, isActive: p.isActive ?? p.active,
			}))),
			error: (error) => this.showError(error),
		});
		this.api.pizzaSizes().subscribe({
			next: (sizes) => this.pizzaSizes.set(sizes.map((size) => size.name)),
			error: (error) => this.showError(error),
		});
	}

	refresh(): void {
		this.api.forecasts().subscribe({
			next: (value) => this.forecasts.set(value.map((forecast) => this.normaliseForecast(forecast))),
			error: (error) => this.showError(error),
		});
		this.api.scenarios().subscribe({ next: (value) => this.scenarios.set(value), error: (error) => this.showError(error) });
	}

	newForecast(): void {
		this.editingForecast.set(undefined);
		this.forecast.set(this.emptyForecast());
	}

	editForecast(value: ConsumptionForecast): void {
		this.editingForecast.set(value.name);
		this.forecast.set({ ...value, entries: value.entries.map((entry) => ({ ...entry })) });
		this.tab.set('forecasts');
	}

	addEntry(): void {
		const value = this.forecast();
		this.forecast.set({ ...value, entries: [...value.entries, { date: value.startDate, productSku: '', pizzaSize: null, quantity: 0 }] });
	}

	removeEntry(index: number): void {
		const value = this.forecast();
		this.forecast.set({ ...value, entries: value.entries.filter((_, position) => position !== index) });
	}

	updateEntry(index: number, patch: Partial<ForecastEntry>): void {
		const value = this.forecast();
		const entries = value.entries.map((entry, position) => position === index
			? { ...entry, ...patch, ...(patch.date !== undefined ? { date: this.normaliseDate(patch.date) } : {}) }
			: entry);
		this.forecast.set({ ...value, entries });
	}

	saveForecast(): void {
		const errors = this.validateForecast(this.forecast());
		if (errors.length) { this.errors.set(errors); return; }
		this.run(() => this.api.saveForecast(this.forecast(), this.editingForecast()), this.translate.instant('Forecast saved.'));
	}

	deleteForecast(value: ConsumptionForecast): void {
		this.pendingDeletion.set({ kind: 'forecast', name: value.name });
	}

	newScenario(): void {
		this.editingScenario.set(undefined);
		this.scenario.set(this.emptyScenario());
		this.newSupplierCode.set('');
		this.newOffer.set({ supplierCode: '', productSku: '', priceEur: 0, stockUnitQuantity: 1, leadTimeDays: 0, dailySupplyLimit: null });
	}

	addSupplier(): void {
		const code = this.newSupplierCode().trim();
		if (!code || this.scenario().suppliers.some((supplier) => supplier.supplierCode === code)) {
			this.importErrors.set([this.translate.instant('Enter a unique supplier code.')]);
			return;
		}
		this.scenario.set({ ...this.scenario(), suppliers: [...this.scenario().suppliers, { supplierCode: code, name: null }] });
		this.newSupplierCode.set('');
	}

	removeSupplier(code: string): void {
		const value = this.scenario();
		this.scenario.set({ ...value, suppliers: value.suppliers.filter((supplier) => supplier.supplierCode !== code), offers: value.offers.filter((offer) => offer.supplierCode !== code) });
	}

	addOffer(): void {
		const offer = this.newOffer();
		if (!offer.supplierCode || !offer.productSku) {
			this.importErrors.set([this.translate.instant('Select a supplier and product for the offer.')]);
			return;
		}
		this.scenario.set({ ...this.scenario(), offers: [...this.scenario().offers, { ...offer }] });
		this.newOffer.set({ ...offer, productSku: '' });
	}

	removeOffer(index: number): void {
		const value = this.scenario();
		this.scenario.set({ ...value, offers: value.offers.filter((_, position) => position !== index) });
	}

	editScenario(value: SupplierScenario): void {
		this.editingScenario.set(value.name);
		this.scenario.set({ ...value, suppliers: value.suppliers.map((supplier) => ({ ...supplier })), offers: value.offers.map((offer) => ({ ...offer })) });
		this.tab.set('scenarios');
	}

	importScenario(event: Event): void {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const value = JSON.parse(String(reader.result));
				const scenario = this.normaliseImportedScenario(value);
				this.importErrors.set(this.validateScenario(scenario));
				this.importPreview.set(scenario);
			} catch {
				this.importErrors.set([this.translate.instant('The file does not contain valid JSON.')]);
				this.importPreview.set(null);
			}
		};
		reader.readAsText(file);
	}

	confirmImport(): void {
		const preview = this.importPreview();
		if (!preview || this.importErrors().length) return;
		this.scenario.set(preview);
		this.editingScenario.set(undefined);
		this.importPreview.set(null);
		this.notice.set(this.translate.instant('Import inspected. Review the data and save to confirm.'));
	}

	saveScenario(): void {
		const errors = this.validateScenario(this.scenario());
		if (errors.length) { this.importErrors.set(errors); return; }
		this.run(() => this.api.saveScenario(this.scenario(), this.editingScenario()), this.translate.instant('Scenario saved. Confirm it before executing.'));
	}

	confirmScenario(value: SupplierScenario): void {
		this.run(() => this.api.confirmScenario(value.name), this.translate.instant('Scenario confirmed and available for planning.'));
	}

	deleteScenario(value: SupplierScenario): void {
		this.pendingDeletion.set({ kind: 'scenario', name: value.name });
	}

	confirmDeletion(): void {
		const deletion = this.pendingDeletion();
		if (!deletion) return;
		this.pendingDeletion.set(null);
		this.run(
			() => deletion.kind === 'forecast'
				? this.api.deleteForecast(deletion.name)
				: this.api.deleteScenario(deletion.name),
			this.translate.instant(deletion.kind === 'forecast' ? 'Forecast deleted.' : 'Scenario deleted.'),
		);
	}

	execute(): void {
		if (this.busy() || !this.selectedForecast() || !this.selectedScenario()) return;
		this.busy.set(true);
		this.errors.set([]);
		this.api.executePlanning({
			forecastName: this.selectedForecast(),
			scenarioName: this.selectedScenario(),
			...(this.referenceDate() ? { referenceDate: this.referenceDate() } : {}),
		}).subscribe({
			next: (value) => this.result.set(value),
			error: (error) => { this.showError(error); this.busy.set(false); },
			complete: () => { this.busy.set(false); this.loadHistory(); },
		});
	}

	loadHistory(): void {
		this.api.planningHistory().subscribe({ next: (value) => this.history.set(value), error: (error) => this.showError(error) });
	}

	replay(value: PlanningResult): void {
		this.busy.set(true);
		this.api.replayExecution(value.executionId).subscribe({
			next: (result) => this.result.set(result),
			error: (error) => this.showError(error),
			complete: () => this.busy.set(false),
		});
	}

	exportProducts(): void {
		this.api.productExport().subscribe({
			next: (value) => {
				const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
				const anchor = document.createElement('a');
				anchor.href = url; anchor.download = 'laprizza-products-export.json'; anchor.click(); URL.revokeObjectURL(url);
			},
			error: (error) => this.showError(error),
		});
	}

	updateScenarioField(field: 'name' | 'isSimulated', value: string | boolean): void {
		this.scenario.set({ ...this.scenario(), [field]: value });
	}

	private run<T>(requestFactory: () => import('rxjs').Observable<T>, message: string): void {
		this.busy.set(true); this.errors.set([]);
		requestFactory().subscribe({ next: () => { this.notice.set(message); this.refresh(); }, error: (error) => this.showError(error), complete: () => this.busy.set(false) });
	}

	private showError(error: unknown): void {
		const detail = error instanceof HttpErrorResponse && (error.status === 400 || error.status === 422)
			? error.error?.error?.message ?? error.error?.message
			: undefined;
		const messages = Array.isArray(detail) ? detail : [detail];
		this.errors.set(messages.filter((message): message is string => typeof message === 'string').map((message) => this.translateBackendError(message)));
		if (!this.errors().length) this.errors.set([errorMessage(error)]);
		this.busy.set(false);
	}
	private translateBackendError(message: string): string {
		const translations: Array<[RegExp, string]> = [
			[/^Missing stockUnitsPerSale for SKU: (.+)$/, 'The product $1 is missing its stock-per-sale configuration. Configure it before planning.'],
			[/^Entry date '(.+)' is outside the forecast period$/, 'The date $1 is outside the forecast period.'],
			[/^Product '(.+)' is unknown, inactive or not sellable$/, 'The product $1 is unavailable, inactive or not sellable.'],
			[/^Pizza '(.+)' requires pizzaSize$/, 'Select a pizza size for $1.'],
			[/^Unknown pizza size '(.+)'$/, 'The pizza size $1 does not exist.'],
			[/^Invalid quantity for (.+)$/, 'Enter a whole number equal to or greater than zero for $1.'],
			[/^Duplicate forecast entry '(.+)'$/, 'This forecast line is duplicated: $1.'],
			[/^Each entry requires productSku$/, 'Select a product for every forecast line.'],
		];
		for (const [pattern, key] of translations) {
			const match = message.match(pattern);
			if (match) return this.translate.instant(key, match.slice(1).reduce((values, value, index) => ({ ...values, [index + 1]: value }), {}));
		}
		return message;
	}
	private validateForecast(value: ConsumptionForecast): string[] {
		const errors: string[] = [];
		if (!value.name.trim()) errors.push(this.translate.instant('Enter a forecast name.'));
		if (!value.startDate || !value.endDate) errors.push(this.translate.instant('Enter both forecast dates.'));
		if (value.startDate && value.endDate && value.startDate > value.endDate) errors.push(this.translate.instant('The forecast start date cannot be after its end date.'));
		const seen = new Set<string>();
		value.entries.forEach((entry) => {
			if (!entry.date || (value.startDate && entry.date < value.startDate) || (value.endDate && entry.date > value.endDate)) errors.push(this.translate.instant('Every line must have a date inside the forecast period.'));
			if (!entry.productSku) errors.push(this.translate.instant('Select a product for every forecast line.'));
			if (!Number.isInteger(entry.quantity) || entry.quantity < 0) errors.push(this.translate.instant('Quantities must be whole numbers equal to or greater than zero.'));
			const key = `${entry.date}|${entry.productSku}|${entry.pizzaSize ?? ''}`;
			if (seen.has(key)) errors.push(this.translate.instant('Remove duplicate forecast lines.'));
			seen.add(key);
		});
		return [...new Set(errors)];
	}
	private emptyForecast(): ConsumptionForecast { return { name: '', startDate: '', endDate: '', entries: [] }; }
	private normaliseForecast(value: ConsumptionForecast): ConsumptionForecast {
		const raw = value as ConsumptionForecast & Record<string, any>;
		return {
			name: raw.name,
			startDate: this.normaliseDate(raw.startDate ?? raw['start_date']),
			endDate: this.normaliseDate(raw.endDate ?? raw['end_date']),
			entries: (raw.entries ?? []).map((entry: ForecastEntry & Record<string, any>) => ({
				date: this.normaliseDate(entry.date ?? entry['entry_date']),
				productSku: String(entry.productSku ?? entry['product_sku'] ?? '').trim(),
				pizzaSize: entry.pizzaSize ?? entry['pizza_size'] ?? null,
				quantity: Number(entry.quantity),
			})),
			createdAt: raw.createdAt ?? raw['created_at'],
			updatedAt: raw.updatedAt ?? raw['updated_at'],
		};
	}
	private normaliseDate(value: unknown): string {
		if (value instanceof Date) return value.toISOString().slice(0, 10);
		const text = String(value ?? '').trim();
		const isoDate = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
		if (isoDate) return isoDate;
		const europeanDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
		return europeanDate ? `${europeanDate[3]}-${europeanDate[2]}-${europeanDate[1]}` : '';
	}
	hasProduct(sku: string): boolean {
		return this.products().some((product) => product.sku === sku);
	}
	private emptyScenario(): SupplierScenario { return { name: '', isSimulated: true, confirmedAt: null, suppliers: [], offers: [] }; }
	private normaliseImportedScenario(value: any): SupplierScenario {
		return { name: value.name ?? '', isSimulated: value.isSimulated ?? true, confirmedAt: null, suppliers: value.suppliers ?? [], offers: value.offers ?? value.products?.flatMap((p: any) => p.offers?.map((o: any) => ({ ...o, productSku: p.productSku })) ?? []) ?? [] };
	}
	private validateScenario(value: SupplierScenario): string[] {
		const errors: string[] = [];
		if (!value.name.trim()) errors.push(this.translate.instant('The scenario needs a name.'));
		const supplierCodes = new Set(value.suppliers.map((supplier) => supplier.supplierCode));
		if (supplierCodes.size !== value.suppliers.length) errors.push(this.translate.instant('Supplier codes must be unique.'));
		const products = new Set(this.products().map((product) => product.sku));
		const offers = new Set<string>();
		for (const offer of value.offers) {
			const key = `${offer.supplierCode}|${offer.productSku}`;
			if (!supplierCodes.has(offer.supplierCode) || offers.has(key)) errors.push(`${this.translate.instant('Invalid or duplicate offer')}: ${key}`);
			if (!products.has(offer.productSku)) errors.push(`${this.translate.instant('Unknown product')}: ${offer.productSku}`);
			if (offer.priceEur < 0 || !Number.isInteger(offer.stockUnitQuantity) || offer.stockUnitQuantity <= 0 || !Number.isInteger(offer.leadTimeDays) || offer.leadTimeDays < 0) errors.push(`${this.translate.instant('Invalid offer values')}: ${key}`);
			offers.add(key);
		}
		if (!value.offers.length) errors.push(this.translate.instant('The scenario needs at least one offer.'));
		return [...new Set(errors)];
	}
}
