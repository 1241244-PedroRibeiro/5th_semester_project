import { Component } from '@angular/core';
import { CustomerAuthPage } from '../../shared_components/customer-auth-form/customer-auth-page';

@Component({
	selector: 'app-frontoffice-login-page',
	standalone: true,
	imports: [CustomerAuthPage],
	template: '<app-customer-auth-page />',
})
export class CustomerLoginPage {}
