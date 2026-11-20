
import {
    Component,
    DestroyRef,
    computed,
    inject,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    TranslatePipe,
    TranslateService
} from '@ngx-translate/core';

import {
    LocalDatePipe
} from '../../../shared_components/core/i18n/locale-pipes';

import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { KitchenViewerSyncService } from
    '../../core/services/kitchen-viewer-sync.service';

import {
    BackofficeApi,
    errorMessage
} from '../../core/api/backoffice-api';

import type {
    KitchenConfiguration
} from '../../core/api/models';

import { PageHeader } from '../../shared_components/page-header/page-header';
import { Panel } from '../../shared_components/panel/panel';
import { Badge } from '../../shared_components/badge/badge';
import { Feedback } from '../../shared_components/feedback/feedback';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { Icon } from '../../../shared_components/ui/icon/icon';
import { KitchenConfigValidator } from
    '../../core/validation/kitchen-config-validator';

import { KitchenViewer } from
    '../../shared_components/kitchen-viewer/kitchen-viewer';

import type { KitchenLayout } from
    '../../shared_components/kitchen-viewer/kitchen-viewer';

@Component({
    selector: 'app-kitchen-configurations',
    standalone: true,
    imports: [
        LocalDatePipe,
        FormsModule,
        TranslatePipe,
        PageHeader,
        Panel,
        Badge,
        Feedback,
        Modal,
        Icon,
        KitchenViewer
    ],
    templateUrl: './kitchen-configurations.html',
    styleUrl: './kitchen-configurations.scss'
})
export class KitchenConfigurations {

    private readonly api = inject(BackofficeApi);
    private readonly destroy = inject(DestroyRef);
    private readonly kitchenValidator = inject(KitchenConfigValidator);
    private readonly viewerSync = inject(KitchenViewerSyncService);
    private readonly translate = inject(TranslateService);

    readonly items = signal<KitchenConfiguration[]>([]);

    readonly viewerConfiguration = signal<KitchenLayout | null>(null);
    readonly viewerLoading = signal(false);
    readonly viewerError = signal('');

    readonly loading = signal(false);
    readonly saving = signal(false);

    readonly error = signal('');
    readonly success = signal('');
    readonly formError = signal('');

    readonly editing = signal(false);
    readonly removing = signal<KitchenConfiguration | null>(null);
    readonly pendingImport = signal<HTMLInputElement | null>(null);
    readonly pendingActivation = signal<KitchenConfiguration | null>(null);
    readonly selected = signal<KitchenConfiguration | null>(null);
    readonly query = signal('');

    draftName = '';
    draftJson = '';

    readonly activeConfiguration = computed(
        () => this.items().find(item => item.isActive) ?? null
    );

    readonly filtered = computed(() =>
        this.items().filter(item =>
            item.name.toLowerCase().includes(
                this.query().toLowerCase()
            )
        )
    );

    constructor() {
        this.load();
        this.loadViewerConfiguration();

        this.viewerSync.listen()
            .pipe(takeUntilDestroyed(this.destroy))
            .subscribe(() => {
                this.loadViewerConfiguration();
            });
    }

    // ========================================
    // KITCHEN CONFIGURATIONS
    // ========================================

    load() {
        this.loading.set(true);
        this.error.set('');

        this.api.kitchenConfigurations()
            .pipe(
                takeUntilDestroyed(this.destroy),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: data => {
                    this.items.set(data);
                },
                error: e => {
                    this.error.set(errorMessage(e));
                }
            });
    }

    // ========================================
    // 3D KITCHEN VIEWER
    // ========================================

    loadViewerConfiguration(): void {
        this.viewerLoading.set(true);
        this.viewerError.set('');

        this.api.activeKitchenConfiguration()
            .pipe(
                takeUntilDestroyed(this.destroy),
                finalize(() => this.viewerLoading.set(false))
            )
            .subscribe({
                next: (response: KitchenConfiguration) => {
                    this.viewerConfiguration.set(
                        response.jsonContent as KitchenLayout
                    );
                },
                error: e => {
                    // Preserve the last valid configuration displayed in the viewer.
                    this.viewerError.set(errorMessage(e));
                }
            });
    }

    // ========================================
    // CREATE / EDIT CONFIGURATION
    // ========================================

    openCreate() {
        this.selected.set(null);
        this.draftName = '';
        this.draftJson = '';
        this.formError.set('');
        this.editing.set(true);
    }

    openEdit(item: KitchenConfiguration) {
        this.selected.set(item);
        this.draftName = item.name;
        this.draftJson = JSON.stringify(
            item.jsonContent,
            null,
            2
        );
        this.formError.set('');
        this.editing.set(true);
    }

    async save() {
        this.formError.set('');

        const name = this.draftName.trim();

        if (!name) {
            this.formError.set(
                this.translate.instant('Configuration name is required.')
            );
            return;
        }

        if (name.length > 100) {
            this.formError.set(
                this.translate.instant('Configuration name is too long.')
            );
            return;
        }

        let json: unknown;

        try {
            json = JSON.parse(this.draftJson);
        } catch {
            this.formError.set(
                this.translate.instant('Invalid JSON syntax.')
            );
            return;
        }

        // Validate using the official JSON Schema.
        try {
            const validation = await this.kitchenValidator.validate(json);

            if (!validation.valid) {
                this.formError.set(
                    this.translate.instant('Invalid kitchen configuration:') +
                    '\n' +
                    validation.errors.join('\n')
                );
                return;
            }
        } catch {
            this.formError.set(
                this.translate.instant(
                    'Unable to load the kitchen JSON Schema. Please try again.'
                )
            );
            return;
        }

        // Confirm that referenced 3D models exist.
        const assetValidation =
            await this.kitchenValidator.validateAssetReferences(json);

        if (!assetValidation.valid) {
            this.formError.set(
                this.translate.instant(
                    'Kitchen assets are missing or unreachable:'
                ) +
                '\n' +
                assetValidation.errors.join('\n')
            );
            return;
        }

        const selected = this.selected();

        this.saving.set(true);

        const request = selected
            ? this.api.updateKitchenConfiguration(
                selected.id,
                {
                    name,
                    jsonContent: json as Record<string, any>
                }
            )
            : this.api.createKitchenConfiguration({
                name,
                jsonContent: json as Record<string, any>
            });

        request.pipe(
            takeUntilDestroyed(this.destroy),
            finalize(() => this.saving.set(false))
        ).subscribe({
            next: () => {
                this.editing.set(false);

                this.success.set(
                    this.translate.instant(
                        'Kitchen configuration saved successfully.'
                    )
                );

                // Refresh the configurations list.
                this.load();

                // If the updated configuration is active,
                // reload the 3D viewer automatically.
                if (selected?.isActive) {
                    this.loadViewerConfiguration();

                    // Notify other open viewers/tabs.
                    this.viewerSync.requestReload(name);
                }
            },
            error: e => {
                this.formError.set(errorMessage(e));
            }
        });
    }

    // ========================================
    // IMPORT JSON
    // ========================================

    async importJson(event: Event, bypassSizeConfirmation = false) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        this.formError.set('');
        this.success.set('');

        if (
            !file.name.toLowerCase().endsWith('.json') &&
            file.type !== 'application/json'
        ) {
            this.formError.set(
                this.translate.instant('Please select a JSON file.')
            );

            input.value = '';
            return;
        }

        // Maximum import size: 1 MB.
        const MAX_FILE_SIZE = 1024 * 1024;

        if (file.size > MAX_FILE_SIZE && !bypassSizeConfirmation) {
            this.pendingImport.set(input);
            return;
        }

        const reader = new FileReader();

        reader.onload = async () => {
            const content = String(reader.result ?? '');

            try {
                const json: unknown = JSON.parse(content);

                const validation =
                    await this.kitchenValidator.validate(json);

                // Keep imported content available for correction.
                this.draftJson = JSON.stringify(json, null, 2);

                if (!validation.valid) {
                    this.formError.set(
                        this.translate.instant(
                            'The imported configuration is invalid:'
                        ) +
                        '\n' +
                        validation.errors.join('\n')
                    );

                    input.value = '';
                    return;
                }

                const assetValidation =
                    await this.kitchenValidator.validateAssetReferences(json);

                if (!assetValidation.valid) {
                    this.formError.set(
                        this.translate.instant(
                            'The imported configuration references missing or unreachable assets:'
                        ) +
                        '\n' +
                        assetValidation.errors.join('\n')
                    );

                    input.value = '';
                    return;
                }

                this.formError.set('');

                this.success.set(
                    this.translate.instant(
                        'JSON imported and validated successfully. Review it before saving.'
                    )
                );

            } catch {
                this.formError.set(
                    this.translate.instant(
                        'The imported file contains invalid JSON or the schema could not be loaded.'
                    )
                );
            }

            input.value = '';
        };

        reader.onerror = () => {
            this.formError.set(
                this.translate.instant('Unable to read the selected file.')
            );

            input.value = '';
        };

        reader.readAsText(file);
    }

    // ========================================
    // ACTIVATE CONFIGURATION
    // ========================================

    async activate(item: KitchenConfiguration) {
        if (item.isActive || this.saving()) {
            return;
        }

        // Validate that all referenced 3D models exist.
        const assetValidation =
            await this.kitchenValidator.validateAssetReferences(
                item.jsonContent
            );

        if (!assetValidation.valid) {
            this.error.set(
                this.translate.instant(
                    'Cannot activate {{name}} because its 3D assets are missing or unreachable:',
                    { name: item.name }
                ) +
                '\n' +
                assetValidation.errors.join('\n')
            );

            return;
        }

        this.pendingActivation.set(item);
    }

    confirmActivation() {
        const item = this.pendingActivation();
        if (!item || item.isActive || this.saving()) return;
        this.pendingActivation.set(null);
        this.saving.set(true);
        this.error.set('');

        this.api.activateKitchenConfiguration(item.id)
            .pipe(
                takeUntilDestroyed(this.destroy),
                finalize(() => this.saving.set(false))
            )
            .subscribe({
                next: () => {
                    this.success.set(
                        this.translate.instant(
                            '{{name}} is now the active kitchen configuration.',
                            { name: item.name }
                        )
                    );

                    // Update the integrated viewer and any open standalone viewers.
                    this.viewerSync.requestReload(item.name);

                    this.load();
                    this.loadViewerConfiguration();
                },
                error: e => {
                    this.error.set(errorMessage(e));
                }
            });
    }

    continueImport() {
        const input = this.pendingImport();
        if (!input) return;
        this.pendingImport.set(null);
        void this.importJson({ target: input } as unknown as Event, true);
    }

    // ========================================
    // DELETE CONFIGURATION
    // ========================================

    askRemove(item: KitchenConfiguration) {
        if (item.isActive) {
            this.error.set(
                this.translate.instant(
                    'The active configuration cannot be deleted. Activate a valid replacement first.'
                )
            );

            return;
        }

        this.removing.set(item);
    }

    remove() {
        const item = this.removing();

        if (!item || item.isActive) return;

        this.saving.set(true);

        this.api.deleteKitchenConfiguration(item.id)
            .pipe(
                takeUntilDestroyed(this.destroy),
                finalize(() => this.saving.set(false))
            )
            .subscribe({
                next: () => {
                    this.removing.set(null);

                    this.success.set(
                        this.translate.instant(
                            'Configuration deleted successfully.'
                        )
                    );

                    this.load();
                },
                error: e => {
                    this.error.set(errorMessage(e));
                }
            });
    }

    // ========================================
    // JSON PREVIEW / DOWNLOAD
    // ========================================

    jsonPreview(item: KitchenConfiguration): string {
        return JSON.stringify(item.jsonContent, null, 2);
    }

    downloadJson(item: KitchenConfiguration) {
        const content = JSON.stringify(
            item.jsonContent,
            null,
            2
        );

        const blob = new Blob(
            [content],
            { type: 'application/json' }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');

        link.href = url;
        link.download = `${item.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;

        link.click();

        URL.revokeObjectURL(url);
    }
}
