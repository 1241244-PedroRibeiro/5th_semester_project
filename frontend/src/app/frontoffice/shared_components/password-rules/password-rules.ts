import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, input } from '@angular/core';
export { validPassword } from '../../../shared_components/core/auth/password-policy';

@Component({
	imports: [TranslatePipe],
	selector: 'app-password-rules',
	standalone: true,
	template: `<ul [attr.aria-label]="'Password requirements' | translate">
		@for (rule of rules(); track rule.label) {
			<li [class.valid]="rule.valid">
				<span aria-hidden="true">{{ rule.valid ? '✓' : '○' }}</span
				>{{ rule.label | translate
				}}<span class="sr-only">{{
					rule.valid ? (': met' | translate) : (': not met' | translate)
				}}</span>
			</li>
		}
	</ul>`,
	styles:
		'ul{list-style:none;padding:0;margin:.7rem 0;font-size:.73rem;line-height:1.7;color:var(--muted)}li{display:flex;gap:.5rem;align-items:baseline}.valid{color:var(--ink)}',
})
export class PasswordRules {
	readonly value = input('');
	readonly rules = computed(() => [
		{ label: 'At least 8 characters', valid: this.value().length >= 8 },
		{
			label: 'An uppercase and a lowercase letter',
			valid: /[A-Z]/.test(this.value()) && /[a-z]/.test(this.value()),
		},
		{ label: 'At least one number', valid: /[0-9]/.test(this.value()) },
		{ label: 'At least one special character', valid: /[^A-Za-z0-9\s]/.test(this.value()) },
	]);
}
