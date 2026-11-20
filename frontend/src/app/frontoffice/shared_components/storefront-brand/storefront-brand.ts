import { Component } from '@angular/core';

@Component({
	selector: 'app-storefront-brand',
	standalone: true,
	template:
		'<span class="brand-mark" aria-hidden="true"></span><span class="wordmark">LaPrizza</span>',
	styles:
		':host{display:inline-flex;align-items:center;gap:.6em;color:var(--accent);white-space:nowrap;font-size:1.8rem}.brand-mark{width:1.3em;height:1.3em;background:var(--accent);border:2px solid var(--ink);border-radius:50%}.wordmark{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-weight:700;letter-spacing:-.06em}',
})
export class StorefrontBrand {}
