import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, EMPTY, finalize, Subject, switchMap } from 'rxjs';
import { BackofficeApi, errorMessage } from '../../core/api/backoffice-api';
import type { NamedResource } from '../../../shared_components/core/api/models';
import { PageHeader } from '../page-header/page-header';
import { Panel } from '../panel/panel';
import { DataTable, Column } from '../data-table/data-table';
import { Pagination } from '../pagination/pagination';
import { Badge } from '../badge/badge';
import { Feedback } from '../feedback/feedback';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { Icon } from '../../../shared_components/ui/icon/icon';
import { Auth } from '../../../shared_components/core/auth/auth';
export interface ResourceConfig {
	path: string;
	title: string;
	singular: string;
	description: string;
	component?: boolean;
	descriptionField?: boolean;
	editable: boolean;
}
@Component({
	selector: 'app-resources',
	standalone: true,
	imports: [
		TranslatePipe,
		FormsModule,
		PageHeader,
		Panel,
		DataTable,
		Pagination,
		Badge,
		Feedback,
		Modal,
		Icon,
	],
	templateUrl: './resources.html',
	styleUrl: './resources.scss',
})
export class Resources {
	private readonly api = inject(BackofficeApi);
	readonly auth = inject(Auth);
	private readonly destroy = inject(DestroyRef);
	private readonly route = inject(ActivatedRoute);
	readonly config = signal<ResourceConfig>(this.route.snapshot.data['resource']);
	readonly items = signal<NamedResource[]>([]);
	readonly total = signal(0);
	readonly page = signal(1);
	readonly pageSize = 8;
	readonly loading = signal(true);
	readonly saving = signal(false);
	readonly error = signal('');
	readonly formError = signal('');
	readonly fieldErrors = signal<Record<string, string>>({});
	readonly success = signal('');
	readonly successParams = signal<Record<string, string>>({});
	readonly search = signal('');
	private readonly searchRequests = new Subject<string>();
	readonly editing = signal(false);
	readonly selected = signal<NamedResource | null>(null);
	readonly removing = signal<NamedResource | null>(null);
	draft: NamedResource = { name: '' };
	readonly refresh = new Subject<void>();
	columns(): Column[] {
		return [
			{ key: 'name', label: 'Name' },
			...(this.config().descriptionField ? [{ key: 'description', label: 'Description' }] : []),
			...(this.config().component
				? [
					{ key: 'assemblyOrder', label: 'Assembly order' },
					{ key: 'minCardinality', label: 'Minimum' },
					{ key: 'maxCardinality', label: 'Maximum' },
				]
				: this.config().path === 'pizza-sizes'
					? [{ key: 'status', label: 'Status' }]
					: []),
			...(this.auth.manager() ? [{ key: 'actions', label: 'Actions' }] : []),
		];
	}
	constructor() {
		this.refresh
			.pipe(
				switchMap(() => {
					this.loading.set(true);
					this.error.set('');
					return this.api.resources(this.config().path, this.page(), this.pageSize, this.search()).pipe(
						catchError((e) => {
							this.error.set(errorMessage(e));
							return EMPTY;
						}),
						finalize(() => this.loading.set(false)),
					);
				}),
				takeUntilDestroyed(this.destroy),
			)
			.subscribe((result) => {
				this.total.set(Array.isArray(result) ? result.length : result.total);
				this.items.set(
					Array.isArray(result)
						? result.slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize)
						: result.items,
				);
			});
		this.route.data.pipe(takeUntilDestroyed(this.destroy)).subscribe((data) => {
			this.config.set(data['resource']);
			this.page.set(1);
			this.search.set('');
			this.success.set('');
			this.load();
		});
		this.searchRequests.pipe(debounceTime(250), takeUntilDestroyed(this.destroy)).subscribe(() => this.load());
	}
	searchEnabled(): boolean {
		return ['categories', 'allergens', 'pizza-sizes', 'pizza-component-types'].includes(this.config().path);
	}
	searchChanged(value: string): void {
		this.search.set(value);
		this.page.set(1);
		this.searchRequests.next(value);
	}
	load() {
		this.refresh.next();
	}
	paginate(page: number) {
		this.page.set(page);
		this.load();
	}
	clearFieldError(field: string) {
		this.fieldErrors.update((errors) => {
			const updated = { ...errors };
			delete updated[field];
			return updated;
		});
	}
	open(item?: NamedResource) {
		this.selected.set(item ?? null);
		this.draft = item
			? { ...item }
			: this.config().component
				? { name: '', assemblyOrder: 1, minCardinality: 0, maxCardinality: null }
				: { name: '' };
		this.formError.set('');
		this.fieldErrors.set({});
		this.editing.set(true);
	}
	save() {
		if (this.saving()) return;

		const name = this.draft.name?.trim() ?? '';
		const errors: Record<string, string> = {};

		if (!name) {
			errors['name'] = 'Name is required. Enter a valid name before saving.';
		}

		if (this.config().descriptionField && this.selected() && !this.draft.description?.trim()) {
			errors['description'] = 'Description is required when updating this resource.';
		}

		if (this.config().component) {
			const assemblyOrder = this.draft.assemblyOrder;
			const minimum = this.draft.minCardinality;
			const maximum = this.draft.maxCardinality;

			if (!Number.isInteger(assemblyOrder) || assemblyOrder! < 1) {
				errors['assemblyOrder'] = 'Assembly order must be a whole number greater than zero.';
			}

			if (!Number.isInteger(minimum) || minimum! < 0) {
				errors['minCardinality'] = 'Minimum components must be a non-negative whole number.';
			}

			if (
				maximum !== null &&
				(!Number.isInteger(maximum) || maximum! < 0)
			) {
				errors['maxCardinality'] = 'Maximum components must be a non-negative whole number or empty.';
			}

			if (
				maximum !== null &&
				Number.isInteger(minimum) &&
				minimum! >= 0 &&
				Number.isInteger(maximum) &&
				maximum! < minimum!
			) {
				errors['maxCardinality'] = 'Maximum must be greater than or equal to minimum.';
			}
		}

		this.fieldErrors.set(errors);

		if (Object.keys(errors).length > 0) {
			this.formError.set('');
			return;
		}

		this.saving.set(true);
		this.formError.set('');

		this.api
			.saveResource(
				this.config().path,
				{ ...this.draft, name },
				this.selected()?.name,
			)
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.saving.set(false)),
			)
			.subscribe({
				next: () => {
					this.editing.set(false);
					this.fieldErrors.set({});
					this.successParams.set({ resource: this.config().singular });
					this.success.set('{{resource}} saved.');
					this.load();
				},
				error: (e) => this.formError.set(errorMessage(e)),
			});
	}
	askRemove(item: NamedResource) {
		this.formError.set('');
		this.removing.set(item);
	}

	remove() {
		const item = this.removing();

		// Prevent duplicate deletion requests or deletion without confirmation.
		if (this.saving() || !item) return;

		this.saving.set(true);
		this.formError.set('');

		this.api
			.deleteResource(this.config().path, item.name)
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.saving.set(false)),
			)
			.subscribe({
				next: () => {
					this.removing.set(null);
					this.successParams.set({ name: item.name });
					this.success.set('{{name}} removed.');

					if (this.items().length === 1 && this.page() > 1) {
						this.page.update((p) => p - 1);
					}

					this.load();
				},
				error: (e) => this.formError.set(errorMessage(e)),
			});
	}

}
