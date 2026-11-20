import { LocalDatePipe } from '../../../shared_components/core/i18n/locale-pipes';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Auth } from '../../../shared_components/core/auth/auth';
import { BackofficeApi, errorMessage } from '../../core/api/backoffice-api';
import type { Stock } from '../../core/api/models';
import { PageHeader } from '../../shared_components/page-header/page-header';
import { Panel } from '../../shared_components/panel/panel';
import { Tabs } from '../../shared_components/tabs/tabs';
import { Badge } from '../../shared_components/badge/badge';
import { Feedback } from '../../shared_components/feedback/feedback';
import { Icon } from '../../../shared_components/ui/icon/icon';
@Component({
	selector: 'app-orders',
	standalone: true,
	imports: [
		LocalDatePipe,
		TranslatePipe,
		RouterLink,
		PageHeader,
		Panel,
		Tabs,
		Badge,
		Feedback,
		Icon,
	],
	templateUrl: './orders.html',
	styleUrl: './orders.scss',
})
export class Orders {
	readonly auth = inject(Auth);
	private readonly api = inject(BackofficeApi);
	private readonly destroy = inject(DestroyRef);
	readonly today = new Date();
	readonly stock = signal<Stock[]>([]);
	readonly stockLoading = signal(false);
	readonly stockError = signal('');
	readonly metrics = [
		{ label: 'Orders today', icon: 'orders' },
		{ label: 'In progress', icon: 'flame' },
		{ label: 'Revenue today', icon: 'grid' },
		{ label: 'Average prep time', icon: 'clock' },
	];
	readonly tabs = [
		{ id: 'all', label: 'All orders' },
		{ id: 'new', label: 'New' },
		{ id: 'preparing', label: 'Preparing' },
		{ id: 'ready', label: 'Ready' },
		{ id: 'completed', label: 'Completed' },
	];
	readonly tab = signal('all');
	constructor() {
		if (this.auth.manager()) this.loadStock();
	}
	loadStock() {
		this.stockLoading.set(true);
		this.stockError.set('');
		this.api
			.stock()
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.stockLoading.set(false)),
			)
			.subscribe({
				next: (stock) => this.stock.set(stock.filter((item) => item.currentUnits === 0)),
				error: (e) => this.stockError.set(errorMessage(e)),
			});
	}
}
