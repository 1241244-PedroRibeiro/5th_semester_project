import { TranslatePipe } from '@ngx-translate/core';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { StorefrontButton } from '../storefront-button/storefront-button';
import { PasswordRules } from '../password-rules/password-rules';

@Component({
	selector: 'app-credential-editor',
	standalone: true,
	imports: [TranslatePipe, FormsModule, Modal, StorefrontButton, PasswordRules],
	templateUrl: './credential-editor.html',
})
export class CredentialEditor {
	readonly kind = input<'password' | 'email'>('password');
	readonly closed = output<void>();
	currentPassword = '';
	password = '';
	email = '';
}
