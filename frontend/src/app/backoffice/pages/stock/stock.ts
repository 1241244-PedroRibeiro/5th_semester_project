import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { BackofficeApi, errorMessage } from '../../core/api/backoffice-api';
import type { Stock as StockItem } from '../../core/api/models';
import { PageHeader } from '../../shared_components/page-header/page-header';
import { Panel } from '../../shared_components/panel/panel';
import { Feedback } from '../../shared_components/feedback/feedback';
import { Auth } from '../../../shared_components/core/auth/auth';

@Component({
	selector: 'app-stock',
	standalone: true,
	imports: [FormsModule, TranslatePipe, PageHeader, Panel, Feedback],
	templateUrl: './stock.html',
})
export class Stock {
	private readonly api = inject(BackofficeApi);
	readonly auth = inject(Auth);
	private readonly destroy = inject(DestroyRef);
	readonly items = signal<StockItem[]>([]);
	readonly loading = signal(true);
	readonly error = signal('');
	readonly success = signal('');
	readonly saving = signal<string | null>(null);
	readonly query = signal('');
	readonly lowStockOnly = signal(false);
	readonly activeFilter = signal('');
	readonly amount = signal(1);

	constructor() {
		this.load();
	}

	load(): void {
		this.loading.set(true);
		this.error.set('');
		this.api.stock(this.activeFilter() === '' ? {} : { active: this.activeFilter() === 'true' }).pipe(takeUntilDestroyed(this.destroy)).subscribe({
			next: (items) => this.items.set(items),
			error: (error) => {
				this.error.set(errorMessage(error));
				this.loading.set(false);
			},
			complete: () => this.loading.set(false),
		});
	}

	filtered(): StockItem[] {
		const query = this.query().trim().toLowerCase();
		return this.items().filter((item) =>
			(!query || item.productSku.toLowerCase().includes(query) || item.productName.toLowerCase().includes(query)) &&
			(!this.lowStockOnly() || item.currentUnits <= 0),
		);
	}

	adjust(item: StockItem, type: 'INCREASE' | 'DECREASE'): void {
		const amount = this.amount();
		if (!Number.isSafeInteger(amount) || amount < 1 || this.saving()) return;
		this.saving.set(item.productSku);
		this.error.set('');
		this.api.adjustStock(item.productSku, type, amount).pipe(takeUntilDestroyed(this.destroy)).subscribe({
			next: () => {
				this.success.set('Stock updated successfully.');
				this.load();
			},
			error: (error) => this.error.set(errorMessage(error)),
			complete: () => this.saving.set(null),
		});
	}
}
