
import { TranslatePipe } from '@ngx-translate/core';
import {
	Component,
	DestroyRef,
	inject,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
	BackofficeApi,
	errorMessage,
} from '../../core/api/backoffice-api';

import { KitchenViewer } from '../../shared_components/kitchen-viewer/kitchen-viewer';
import { PageHeader } from '../../shared_components/page-header/page-header';
import { Panel } from '../../shared_components/panel/panel';
import { Feedback } from '../../shared_components/feedback/feedback';

import { KitchenViewerSyncService } from '../../core/services/kitchen-viewer-sync.service';

import type { KitchenConfiguration } from '../../core/api/models';
import type { KitchenLayout } from '../../shared_components/kitchen-viewer/kitchen-viewer';

@Component({
	selector: 'app-kitchen-page',
	standalone: true,

	imports: [
		TranslatePipe,
		PageHeader,
		Panel,
		KitchenViewer,
		Feedback,
	],

	template: `
        <app-page-header
            [title]="'Kitchen Visualization' | translate"
            [description]="'Your kitchen workspace.' | translate"
        />

        <app-panel [title]="'Kitchen' | translate">

            @if (loading()) {
    <app-feedback
        kind="loading"
        [title]="'Loading kitchen configuration' | translate"
    />
}

@if (error()) {
    <app-feedback
        kind="error"
        [title]="'Kitchen visualization error' | translate"
        [message]="error() | translate"
        [retryable]="true"
        (retry)="loadConfiguration()"
    />
}

@if (configuration()) {
    <div class="kitchen-viewer-wrapper">
        <app-kitchen-viewer
            [configuration]="configuration()!"
        />
    </div>
}

        </app-panel>
    `,

	styles: `
        .kitchen-viewer-wrapper {
            margin: 1rem;
            min-width: 0;
        }

        @media (max-width: 540px) {
            .kitchen-viewer-wrapper {
                margin: 0.75rem;
            }
        }
    `,
})

export class KitchenPage {
	private readonly api = inject(BackofficeApi);
	private readonly destroy = inject(DestroyRef);
	private readonly viewerSync = inject(KitchenViewerSyncService);

	readonly configuration = signal<KitchenLayout | null>(null);
	readonly loading = signal(false);
	readonly error = signal('');

	constructor() {
		this.loadConfiguration();

		this.viewerSync.listen()
			.pipe(takeUntilDestroyed(this.destroy))
			.subscribe(() => this.loadConfiguration());
	}

	loadConfiguration(): void {
		this.loading.set(true);
		this.error.set('');

		this.api.activeKitchenConfiguration()
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (response: KitchenConfiguration) => {
					this.configuration.set(
						response.jsonContent as KitchenLayout,
					);
				},
				error: (e) => {
					// Preserve the last valid configuration displayed in the viewer.
					this.error.set(errorMessage(e));
				},
			});
	}
}
