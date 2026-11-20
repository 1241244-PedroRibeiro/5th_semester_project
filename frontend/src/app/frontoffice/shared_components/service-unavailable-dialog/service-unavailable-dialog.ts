import { TranslatePipe } from '@ngx-translate/core';
import { Component, input, output } from '@angular/core';
import { Modal } from '../../../shared_components/ui/modal/modal';
import { StorefrontButton } from '../storefront-button/storefront-button';

@Component({
	selector: 'app-service-unavailable-dialog',
	standalone: true,
	imports: [TranslatePipe, Modal, StorefrontButton],
	template: `<app-modal [title]="title() | translate" (closed)="closed.emit()"
		><p class="shop-muted">{{ message() | translate }}</p>
		<button modal-actions shopButton (click)="closed.emit()">
			{{ 'Close' | translate }}
		</button></app-modal
	>`,
})
export class ServiceUnavailableDialog {
	readonly title = input.required<string>();
	readonly message = input.required<string>();
	readonly closed = output<void>();
}
