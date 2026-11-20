import { TranslatePipe } from '@ngx-translate/core';
import { AfterViewInit, Component, ElementRef, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/auth';
import { Icon } from '../../ui/icon/icon';

@Component({
	selector: 'app-unauthorized-page',
	standalone: true,
	imports: [TranslatePipe, RouterLink, Icon],
	templateUrl: './unauthorized-page.html',
	styleUrl: './unauthorized-page.scss',
})
export class UnauthorizedPage implements AfterViewInit {
	readonly auth = inject(Auth);
	private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');

	ngAfterViewInit(): void {
		this.heading().nativeElement.focus();
	}
}
