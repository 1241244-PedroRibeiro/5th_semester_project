import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, switchMap, tap, throwError } from 'rxjs';
import type { Session } from '../api/models';

@Injectable({ providedIn: 'root' })
export class Auth {
	private readonly http = inject(HttpClient);
	private readonly tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	private channel: BroadcastChannel | null = null;
	private sessionSync: Promise<void> = Promise.resolve();
	readonly session = signal<Session | null>(this.restore());
	readonly user = computed(() => this.session()?.user ?? null);
	readonly administrator = computed(() => this.user()?.roles.includes('ADMINISTRATOR') ?? false);
	readonly restaurant = computed(
		() => this.user()?.roles.some((role) => ['MANAGER', 'EMPLOYEE'].includes(role)) ?? false,
	);
	readonly manager = computed(() => this.user()?.roles.includes('MANAGER') ?? false);
	readonly staff = computed(
		() =>
			this.user()?.status === 'ACTIVE' &&
			this.user()?.roles.some((role) => ['ADMINISTRATOR', 'MANAGER', 'EMPLOYEE'].includes(role)),
	);
	constructor() {
		if (typeof window === 'undefined') return;
		window.addEventListener('storage', this.onStorage);
		if (typeof BroadcastChannel !== 'undefined') {
			try {
				this.channel = new BroadcastChannel('auth');
				this.channel.onmessage = ({ data }) => this.onAuthMessage(data);
				// A non-persistent session lives in sessionStorage. Ask an already-open tab to
				// share it so a newly opened tab joins the same browser session.
				this.channel.postMessage({ type: 'request-session', source: this.tabId });
				this.sessionSync = new Promise((resolve) => window.setTimeout(resolve, 100));
			} catch {
				this.channel = null;
			}
		}
	}
	async waitForSharedSession(): Promise<void> {
		await this.sessionSync;
	}
	login(value: { email: string; password: string }, remember: boolean) {
		return this.http
			.post<Session>('/api/auth/login', value)
			.pipe(tap((session) => this.save(session, remember)));
	}
	acceptExternalSession(session: Session) {
		this.save(session, true);
	}
	register(value: { firstName: string; lastName: string; email: string; password: string }) {
		return this.http
			.post<Session>('/api/auth/register', value)
			.pipe(tap((session) => this.save(session, false)));
	}
	refresh() {
		const refreshToken = this.session()?.refreshToken;
		if (!refreshToken) return throwError(() => new Error('Refresh token unavailable.'));
		return this.http
			.post<{ token: string; refreshToken: string }>('/api/auth/refresh', { refreshToken })
			.pipe(tap((tokens) => {
				const session = this.session();
				if (session) this.save({ ...session, ...tokens }, localStorage.getItem('forno-session') !== null);
			}));
	}
	requestPasswordRecovery(email: string) {
		return this.http.post<{ message: string }>('/api/password-recovery', { email });
	}
	resetPassword(recovery_code: string, new_password: string) {
		return this.http.post<{ message: string }>('/api/password-recovery/new_pass', {
			recovery_code,
			new_password,
		});
	}
	readonly loggingOut = signal(false);
	readonly logoutError = signal('');
	async logout(): Promise<boolean> {
		if (this.loggingOut()) return false;
		const token = this.session()?.token;
		if (!token) return true;
		this.loggingOut.set(true);
		this.logoutError.set('');
		try {
			await firstValueFrom(this.http.post<void>('/api/auth/logout', {}));
			if (this.session()?.token === token) this.clearSession();
			return true;
		} catch (error) {
			// A rejected credential is already unusable; network/server errors do not prove revocation.
			if ((error as { status?: number }).status === 401) {
				if (this.session()?.token === token) this.clearSession();
				return true;
			}
			this.logoutError.set('Sign out could not be completed. Please try again.');
			return false;
		} finally {
			this.loggingOut.set(false);
		}
	}
	clearSession() {
		const wasAuthenticated = this.session() !== null;
		this.session.set(null);
		localStorage.removeItem('forno-session');
		sessionStorage.removeItem('forno-session');
		if (wasAuthenticated) this.channel?.postMessage({ type: 'logout', source: this.tabId });
	}
	/** Keep updated public identity and the current storage lifetime; never persist passwords. */
	updateUser(user: Session['user']) {
		const session = this.session();
		if (!session || session.user.username !== user.username) return;
		const updated = { ...session, user };
		this.session.set(updated);
		try {
			const storage =
				localStorage.getItem('forno-session') !== null ? localStorage : sessionStorage;
			storage.setItem('forno-session', JSON.stringify(updated));
			this.channel?.postMessage({
				type: 'session',
				source: this.tabId,
				session: updated,
				persistent: storage === localStorage,
			});
		} catch {
			/* The updated identity remains available in memory. */
		}
	}
	private save(session: Session, remember: boolean) {
		this.session.set(null);
		localStorage.removeItem('forno-session');
		sessionStorage.removeItem('forno-session');
		this.session.set(session);
		const persistent = remember || !this.channel;
		(persistent ? localStorage : sessionStorage).setItem('forno-session', JSON.stringify(session));
		this.channel?.postMessage({ type: 'session', source: this.tabId, session, persistent });
	}
	private onStorage = (event: StorageEvent) => {
		// BroadcastChannel carries both temporary sessions and logout state. Using the
		// storage removal event as well would race a new non-remembered login in another tab.
		if (this.channel) return;
		if (event.key !== 'forno-session') return;
		if (!event.newValue) {
			this.session.set(null);
			sessionStorage.removeItem('forno-session');
			return;
		}
		try {
			const session = JSON.parse(event.newValue) as Session;
			if (this.isValidSession(session)) {
				this.session.set(session);
				sessionStorage.removeItem('forno-session');
			}
		} catch {
			this.session.set(null);
		}
	};
	private onAuthMessage(message: any) {
		if (!message || message.source === this.tabId) return;
		if (message.type === 'request-session') {
			const session = this.session();
			if (session)
				this.channel?.postMessage({
					type: 'session', source: this.tabId, session,
					persistent: localStorage.getItem('forno-session') !== null,
				});
		} else if (message.type === 'logout') {
			this.session.set(null);
			localStorage.removeItem('forno-session');
			sessionStorage.removeItem('forno-session');
		} else if (message.type === 'session' && this.isValidSession(message.session)) {
			const session = message.session as Session;
			this.session.set(session);
			if (message.persistent) {
				localStorage.setItem('forno-session', JSON.stringify(session));
				sessionStorage.removeItem('forno-session');
			} else {
				localStorage.removeItem('forno-session');
				sessionStorage.setItem('forno-session', JSON.stringify(session));
			}
		}
	}
	private isValidSession(session: Session | null | undefined): session is Session {
		try {
			if (!session?.token || !Array.isArray(session.user?.roles)) return false;
			const payload = JSON.parse(atob(session.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
			return payload.exp * 1000 > Date.now();
		} catch {
			return false;
		}
	}
	private restore(): Session | null {
		try {
			const session = JSON.parse(
				sessionStorage.getItem('forno-session') ?? localStorage.getItem('forno-session') ?? 'null',
			) as Session | null;
			return this.isValidSession(session) ? session : null;
		} catch {
			return null;
		}
	}
}
const AUTH_RETRY = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
	const auth = inject(Auth);
	const router = inject(Router);
	const token = auth.session()?.token;
	const protectedApi = request.url.startsWith('/api/') && ![
		'/api/auth/login',
		'/api/auth/register',
		'/api/auth/refresh',
		'/api/password-recovery',
		'/api/password-recovery/new_pass',
	].includes(request.url);
	const authenticatedRequest = token && protectedApi
		? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
		: request;

	return next(authenticatedRequest).pipe(
		catchError((error) => {
			if (error.status === 403 && request.url.startsWith('/api/') && router.url.split('?')[0] !== '/unauthorized')
				void router.navigate(['/unauthorized'], { replaceUrl: true });
			if (error.status === 401 && protectedApi && token && !request.context.get(AUTH_RETRY)) {
				return auth.refresh().pipe(
					switchMap((tokens) => next(request.clone({
						context: request.context.set(AUTH_RETRY, true),
						setHeaders: { Authorization: `Bearer ${tokens.token}` },
					}))),
					catchError((refreshError) => {
						const returnUrl = router.url;
						if (auth.session()?.token === token) auth.clearSession();
						void router.navigate(
							[returnUrl.startsWith('/backoffice') ? '/backoffice/login' : '/login'],
							{ queryParams: { returnUrl } },
						);
						return throwError(() => refreshError);
					}),
				);
			}
			if (error.status === 401 && protectedApi && token) {
				const returnUrl = router.url;
				if (auth.session()?.token === token) auth.clearSession();
				void router.navigate(
					[returnUrl.startsWith('/backoffice') ? '/backoffice/login' : '/login'],
					{ queryParams: { returnUrl } },
				);
			}
			return throwError(() => error);
		}),
	);
};
