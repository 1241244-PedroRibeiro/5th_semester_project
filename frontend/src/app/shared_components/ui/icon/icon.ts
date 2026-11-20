import { Component, input } from '@angular/core';

const paths: Record<string, string> = {
	pizza:
		'M3 20 9 3a2 2 0 0 1 2-1 19 19 0 0 1 11 11 2 2 0 0 1-1 2L3 21Zm1-4 13-5M9 10h.01M11 15h.01M15 12h.01',
	users:
		'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
	orders: 'M8 3H5v18h14V3h-3M9 2h6v4H9zM8 10h8M8 14h8M8 18h5',
	grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
	layers: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
	box: 'm12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5',
	search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
	filter: 'M4 6h16M7 12h10M10 18h4',
	plus: 'M12 5v14M5 12h14',
	close: 'm6 6 12 12M6 18 18 6',
	menu: 'M3 6h18M3 12h18M3 18h18',
	chevron: 'm9 5 7 7-7 7',
	check: 'm5 12 4 4L19 6',
	lock: 'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4M12 14v3',
	eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
	flame: 'M12 2c2 6-5 6-3 11 1-1 3-2 3-5 5 3 7 6 5 10s-9 5-12 0C2 13 7 8 12 2Z',
	logout: 'M9 21H3V3h6M9 12h13m-5-5 5 5-5 5',
	refresh: 'M20 7a9 9 0 1 0 1 8M20 2v6h-6',
	clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
	mail: 'M3 4h18v16H3zM3 5l9 8 9-8',
	alert: 'M12 3 2 21h20L12 3ZM12 9v5M12 17h.01',
	bag: 'M5 7h14l1 14H4L5 7ZM9 7V5a3 3 0 0 1 6 0v2M9 11a3 3 0 0 0 6 0',
	heart:
		'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
	pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
	arrow: 'M4 12h16m-6-6 6 6-6 6',
};
@Component({
	selector: 'app-icon',
	standalone: true,
	template:
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path()" /></svg>',
	styles:
		':host{display:inline-flex;width:1.15em;height:1.15em;flex-shrink:0;vertical-align:middle}svg{width:100%;height:100%}',
})
export class Icon {
	readonly name = input('pizza');
	path() {
		return paths[this.name()] ?? paths['grid'];
	}
}
