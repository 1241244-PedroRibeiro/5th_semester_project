import { computed, inject, Injectable, signal } from '@angular/core';
import { Auth } from '../../shared_components/core/auth/auth';
import type { StaffContactResponse } from './api/models';

type Contacts = Pick<StaffContactResponse, 'address' | 'phoneNumber'>;

/** The current user GET omits contacts; retain only server-confirmed writes per user/session. */
@Injectable({ providedIn: 'root' })
export class StaffContacts {
	private readonly auth = inject(Auth);
	private readonly confirmed = signal<Record<string, Contacts>>({});
	readonly value = computed<Contacts>(() => {
		const username = this.auth.user()?.username;
		if (!username) return {};
		if (this.confirmed()[username]) return this.confirmed()[username];
		try {
			const stored = JSON.parse(sessionStorage.getItem(`forno-contact:${username}`) ?? '{}');
			return {
				...(typeof stored?.phoneNumber === 'string' ? { phoneNumber: stored.phoneNumber } : {}),
				...(stored?.address &&
				['street', 'city', 'postalCode'].every((key) => typeof stored.address[key] === 'string')
					? { address: stored.address }
					: {}),
			};
		} catch {
			return {};
		}
	});
	remember(result: StaffContactResponse) {
		if (result.username !== this.auth.user()?.username) return;
		const value = {
			...this.value(),
			...(result.address ? { address: result.address } : {}),
			...(result.phoneNumber ? { phoneNumber: result.phoneNumber } : {}),
		};
		this.confirmed.update((all) => ({ ...all, [result.username]: value }));
		try {
			sessionStorage.setItem(`forno-contact:${result.username}`, JSON.stringify(value));
		} catch {
			/* Confirmed values remain in memory if storage is unavailable. */
		}
	}
}
