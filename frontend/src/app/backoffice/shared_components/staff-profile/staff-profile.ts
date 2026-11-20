import { TranslatePipe } from '@ngx-translate/core';
import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import type { User } from '../../../shared_components/core/api/models';
import { Icon } from '../../../shared_components/ui/icon/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
	selector: 'app-staff-profile',
	standalone: true,
	imports: [TranslatePipe, Icon, RouterLink, RouterLinkActive],
	host: { '[class.compact]': 'compact()' },
	templateUrl: './staff-profile.html',
	styleUrl: './staff-profile.scss',
})
export class StaffProfile {
	readonly user = input<User | null>(null);
	readonly compact = input(false, { transform: booleanAttribute });
	readonly hintId = input<string | null>(null);
	readonly profileHintId = input<string | null>(null);
	readonly profileOpened = output<void>();
	readonly profileHintRequested = output<Event>();
	readonly profileHintDismissed = output<void>();
	readonly signedOut = output<void>();
	readonly hintRequested = output<Event>();
	readonly hintDismissed = output<void>();
	readonly initials = computed(
		() => `${this.user()?.firstName[0] ?? ''}${this.user()?.lastName[0] ?? ''}`,
	);
	readonly role = computed(() => this.user()?.roles.join(' · ') ?? '');
}
