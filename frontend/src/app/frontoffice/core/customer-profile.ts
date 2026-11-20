import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Auth } from '../../shared_components/core/auth/auth';
import type { ContactProfile } from './storefront-models';
import { StorefrontApi } from './storefront-api';

/** Cache confirmed contact responses; the self-service GET replaces stale local values. */
@Injectable({ providedIn: 'root' })
export class CustomerProfile {
	private readonly auth = inject(Auth);
	private readonly api = inject(StorefrontApi);
	private readonly confirmed = signal<
		Record<string, Pick<ContactProfile, 'address' | 'phoneNumber'>>
	>({});
	readonly contact = computed(() => {
		const username = this.auth.user()?.username;
		if (!username) return null;
		const inMemory = this.confirmed()[username];
		if (inMemory) return inMemory;
		try {
			return JSON.parse(sessionStorage.getItem(`laprizza-contact:${username}`) ?? 'null') as Pick<
				ContactProfile,
				'address' | 'phoneNumber'
			> | null;
		} catch {
			return null;
		}
	});
	readonly profileIncomplete = computed(() =>
		this.auth.user()?.roles.includes('CUSTOMER') === true && !this.contact()?.phoneNumber,
	);
	refresh(): Observable<ContactProfile> {
		return this.api.profile().pipe(tap((profile) => this.remember(profile)));
	}
	remember(profile: ContactProfile) {
		if (profile.username !== this.auth.user()?.username) return;
		const contact = {
			...(profile.address ? { address: profile.address } : {}),
			...(profile.phoneNumber ? { phoneNumber: profile.phoneNumber } : {}),
		};
		this.confirmed.update((value) => ({ ...value, [profile.username]: contact }));
		try {
			sessionStorage.setItem(`laprizza-contact:${profile.username}`, JSON.stringify(contact));
		} catch {
			/* The server-confirmed data remains available in memory. */
		}
	}
}
