import { TranslatePipe } from '@ngx-translate/core';
import {
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	OnInit,
	output,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Auth } from '../../../shared_components/core/auth/auth';
import { StorefrontApi } from '../../core/storefront-api';
import { errorMessage } from '../../../shared_components/core/api/api-errors';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { AllergenChips } from '../allergen-chips/allergen-chips';
import { StorefrontButton } from '../storefront-button/storefront-button';

@Component({
	selector: 'app-allergy-editor',
	standalone: true,
	imports: [TranslatePipe, Modal, AllergenChips, StorefrontButton],
	templateUrl: './allergy-editor.html',
})
export class AllergyEditor implements OnInit {
	readonly initial = input.required<string[]>();
	readonly saved = output<string[]>();
	readonly closed = output<void>();
	private readonly api = inject(StorefrontApi);
	private readonly auth = inject(Auth);
	private readonly destroy = inject(DestroyRef);
	readonly names = signal<string[]>([]);
	readonly selected = signal<string[]>([]);
	readonly loading = signal(true);
	readonly busy = signal(false);
	readonly error = signal('');
	readonly additions = computed(() =>
		this.selected().filter((name) => !this.initial().includes(name)),
	);
	ngOnInit() {
		this.selected.set([...this.initial()]);
		this.load();
	}
	load() {
		this.loading.set(true);
		this.error.set('');
		this.api
			.allergens()
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (names) =>
					this.names.set([...new Set([...this.initial(), ...names.map((a) => a.name)])]),
				error: (e) => this.error.set(errorMessage(e)),
			});
	}
	toggle(name: string) {
		if (!this.initial().includes(name))
			this.selected.update((names) =>
				names.includes(name) ? names.filter((n) => n !== name) : [...names, name],
			);
	}
	save() {
		const username = this.auth.user()?.username;
		if (!username || !this.additions().length) return;
		this.busy.set(true);
		this.error.set('');
		this.api
			.addAllergies(username, this.additions())
			.pipe(
				takeUntilDestroyed(this.destroy),
				finalize(() => this.busy.set(false)),
			)
			.subscribe({
				next: () => this.saved.emit(this.selected()),
				error: (e) => this.error.set(errorMessage(e)),
			});
	}
}
