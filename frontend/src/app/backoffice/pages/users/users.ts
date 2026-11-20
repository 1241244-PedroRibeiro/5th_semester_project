import { LocalDatePipe } from '../../../shared_components/core/i18n/locale-pipes';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subject, switchMap, catchError, EMPTY } from 'rxjs';
import { BackofficeApi, errorMessage } from '../../core/api/backoffice-api';
import { Auth } from '../../../shared_components/core/auth/auth';
import type { User } from '../../../shared_components/core/api/models';
import { PageHeader } from '../../shared_components/page-header/page-header';
import { Panel } from '../../shared_components/panel/panel';
import { Tabs } from '../../shared_components/tabs/tabs';
import { DataTable, Column } from '../../shared_components/data-table/data-table';
import { Pagination } from '../../shared_components/pagination/pagination';
import { Badge } from '../../shared_components/badge/badge';
import { Feedback } from '../../shared_components/feedback/feedback';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { Icon } from '../../../shared_components/ui/icon/icon';
@Component({
	selector: 'app-users',
	standalone: true,
	imports: [
		LocalDatePipe,
		TranslatePipe,
		FormsModule,
		PageHeader,
		Panel,
		Tabs,
		DataTable,
		Pagination,
		Badge,
		Feedback,
		Modal,
		Icon,
	],
	templateUrl: './users.html',
	styles:
		'.management-actions{flex-wrap:wrap;justify-content:flex-end;min-width:0;width:100%}.user-link{border:0;background:transparent;padding:0;color:inherit;text-align:left;cursor:pointer}.user-link:hover{text-decoration:underline}.user-link:focus-visible{outline:2px solid var(--teal);outline-offset:3px}',
})
export class Users {
	private readonly api = inject(BackofficeApi);
	private readonly destroy = inject(DestroyRef);
	readonly auth = inject(Auth);
	readonly items = signal<User[]>([]);
	readonly total = signal(0);
	readonly page = signal(1);
	readonly pageSize = 8;
	readonly role = signal('');
	readonly loading = signal(true);
	readonly error = signal('');
	readonly formError = signal('');
	readonly success = signal('');
	readonly successParams = signal<Record<string, string>>({});
	readonly saving = signal(false);
	readonly inviting = signal(false);
	readonly selected = signal<User | null>(null);
	readonly confirmingStatusChange = signal(false);
	roleDraft: string[] = [];
	readonly refresh = new Subject<void>();
	draft = { email: '', roleName: 'EMPLOYEE' };
	readonly tabs = [
		{ id: '', label: 'All users' },
		{ id: 'CUSTOMER', label: 'Customers' },
		{ id: 'ADMINISTRATOR', label: 'Administrators' },
		{ id: 'MANAGER', label: 'LaPrizza Managers' },
		{ id: 'EMPLOYEE', label: 'Restaurant Staff' },
	];
	private readonly allColumns: Column[] = [
		{ key: 'username', label: 'Username' },
		{ key: 'name', label: 'User' },
		{ key: 'email', label: 'Email' },
		{ key: 'status', label: 'Status' },
		{ key: 'roles', label: 'Role' },
		{ key: 'createdAt', label: 'Sign-up date' },
		{ key: 'actions', label: 'Actions' },
	];
	get columns(): Column[] {
		return this.auth.administrator()
			? this.allColumns
			: this.allColumns.filter((column) => column.key !== 'actions');
	}

	constructor() {
		this.refresh
			.pipe(
				switchMap(() => {
					this.loading.set(true);
					this.error.set('');
					return this.api.users(this.page(), this.pageSize, this.role()).pipe(
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
				this.items.set(result.items);
				this.total.set(result.total);
			});
		this.load();
	}
	load() {
		this.refresh.next();
	}
	filter(role: string) {
		this.role.set(role);
		this.page.set(1);
		this.load();
	}
	paginate(page: number) {
		this.page.set(page);
		this.load();
	}
	openInvite() {
		this.draft = { email: '', roleName: 'EMPLOYEE' };
		this.formError.set('');
		this.inviting.set(true);
	}
	invite() {
		if (this.saving()) return;
		this.saving.set(true);
		this.formError.set('');
		this.api
			.invite({
				...this.draft,
				email: this.draft.email.trim(),
			})
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.saving.set(false)),
			)
			.subscribe({
				next: () => {
					this.inviting.set(false);
					this.success.set(
						'Invitation saved and email sent. They can complete registration using the normal Register button.',
					);
					this.page.set(1);
					this.load();
				},
				error: (e) => this.formError.set(errorMessage(e)),
			});
	}
	manage(user: User) {
		this.formError.set('');
		this.success.set('');
		this.roleDraft = [...user.roles];
		this.confirmingStatusChange.set(false);
		this.selected.set(user);
	}
	toggleRole(role: string, checked: boolean) {
		this.roleDraft = checked
			? [...new Set([...this.roleDraft, role])]
			: this.roleDraft.filter((value) => value !== role);
	}
	rolesChanged() {
		const roles = this.selected()?.roles ?? [];
		return (
			roles.length !== this.roleDraft.length || roles.some((role) => !this.roleDraft.includes(role))
		);
	}
	saveRoles() {
		const user = this.selected();
		if (
			!user ||
			user.status === 'DEACTIVATED' ||
			this.saving() ||
			!this.roleDraft.length ||
			!this.rolesChanged()
		)
			return;
		this.saving.set(true);
		this.formError.set('');
		this.api
			.setUserRoles(user.username, this.roleDraft)
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.saving.set(false)),
			)
			.subscribe({
				next: (updated) => {
					this.auth.updateUser(updated);
					this.selected.set(null);
					this.successParams.set({ name: user.firstName });
					this.success.set("{{name}}'s roles were updated.");
					this.load();
				},
				error: (error) => this.formError.set(errorMessage(error)),
			});
	}
	changeAccountStatus() {
		const user = this.selected();
		if (
			!user ||
			this.saving() ||
			!this.confirmingStatusChange() ||
			user.username === this.auth.user()?.username
		)
			return;
		this.saving.set(true);
		this.formError.set('');
		const reactivating = user.status === 'DEACTIVATED';
		const request = reactivating
			? this.api.reactivateUser(user.username)
			: this.api.deactivateUser(user.username);
		request
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.saving.set(false)),
			)
			.subscribe({
				next: () => {
					this.selected.set(null);
					this.successParams.set({ name: user.firstName });
					this.success.set(
						reactivating
							? "{{name}}'s account was reactivated."
							: "{{name}}'s account was deactivated.",
					);
					this.load();
				},
				error: (e) => this.formError.set(errorMessage(e)),
			});
	}
}
