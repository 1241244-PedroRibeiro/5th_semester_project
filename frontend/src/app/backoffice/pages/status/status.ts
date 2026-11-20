import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, type OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { HealthApi, type HealthResponse } from '../../core/api/health-api';

@Component({
	imports: [TranslatePipe],
	selector: 'app-status',
	standalone: true,
	templateUrl: './status.html',
})
export class Status implements OnInit {
	private readonly api = inject(HealthApi);
	private readonly destroyRef = inject(DestroyRef);

	readonly health = signal<HealthResponse | null>(null);
	readonly loading = signal(false);
	readonly error = signal('');

	ngOnInit(): void {
		this.checkHealth();
	}

	checkHealth(): void {
		this.loading.set(true);
		this.error.set('');
		this.health.set(null);

		this.api
			.getHealth()
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (response) => this.health.set(response),
				error: () => this.error.set('Cannot reach the API. Check the service logs.'),
			});
	}
}
