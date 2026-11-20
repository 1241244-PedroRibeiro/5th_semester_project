import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../core/auth/auth';
import type { Session } from '../../core/api/models';
import { CustomerProfile } from '../../../frontoffice/core/customer-profile';
import { takeExternalAuthReturnUrl } from '../../../frontoffice/core/auth/external-auth-return-url';
import { catchError, of, take } from 'rxjs';

@Component({
	selector: 'app-auth-callback',
	standalone: true,
	template: `<div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; color: #333;">A autenticar...</div>`
})
export class AuthCallbackPage implements OnInit {
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private http = inject(HttpClient);
	private auth = inject(Auth);
	private customerProfile = inject(CustomerProfile);

	ngOnInit(): void {
		const exchangeCode = this.route.snapshot.queryParamMap.get('exchange_code');
		const error = this.route.snapshot.queryParamMap.get('error');

		if (error) {
			alert(`Erro na autenticação externa: ${error}`);
			this.router.navigate(['/login']);
			return;
		}

		if (exchangeCode) {
			this.http.post<Session>('/api/auth/external/exchange', { code: exchangeCode })
				.subscribe({
					next: (res) => {
						this.auth.acceptExternalSession(res);
						this.routeAfterExternalLogin(res);
					},
					error: () => {
						alert('Falha ao trocar o código de autenticação.');
						this.router.navigate(['/login']);
					}
				});
		} else {
			this.router.navigate(['/login']);
		}
	}

	private routeAfterExternalLogin(session: Session): void {
		const returnUrl = takeExternalAuthReturnUrl();
		if (session.user.roles.includes('CUSTOMER')) {
			this.customerProfile.refresh().pipe(
				take(1),
				catchError(() => of(null)),
			).subscribe((profile) => {
				if (!profile?.phoneNumber) {
					void this.router.navigate(['/complete-profile'], { queryParams: { returnUrl } });
					return;
				}
				void this.router.navigateByUrl(returnUrl);
			});
			return;
		}

		const isStaff = session.user.roles.some((role) =>
			['ADMINISTRATOR', 'MANAGER', 'EMPLOYEE'].includes(role),
		);
		void this.router.navigateByUrl(isStaff ? '/backoffice' : returnUrl);
	}
}
