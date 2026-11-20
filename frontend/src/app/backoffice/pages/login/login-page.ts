import { Component } from '@angular/core';
import { AuthPage } from '../../shared_components/staff-auth-form/auth-page';

@Component({
	selector: 'app-backoffice-login-page',
	standalone: true,
	imports: [AuthPage],
	template: '<app-auth-page />',
})
export class StaffLoginPage {}
