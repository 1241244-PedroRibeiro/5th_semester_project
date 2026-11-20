import { TranslatePipe } from '@ngx-translate/core';
import { Component } from '@angular/core';

@Component({
	imports: [TranslatePipe],
	selector: 'app-storefront-footer',
	standalone: true,
	template: `<footer [attr.aria-label]="'LaPrizza footer' | translate">
		<span class="sr-only">{{ 'LaPrizza · Made with amore' | translate }}</span>
	</footer>`,
	styles:
		':host{display:block;margin-top:auto}footer{height:6rem;background:conic-gradient(var(--accent) 25%,var(--yellow) 0 50%,var(--accent) 0 75%,var(--yellow) 0);background-size:3rem 3rem;border-top:1px solid var(--ink)}@media(max-width:600px){footer{height:4.5rem;background-size:2.25rem 2.25rem}}',
})
export class StorefrontFooter {}
