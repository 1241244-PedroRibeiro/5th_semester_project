import { TranslatePipe } from '@ngx-translate/core';
import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../../shared_components/core/auth/auth';
import { Brand } from '../brand/brand';
import { Icon } from '../../../shared_components/ui/icon/icon';
import { NavigationTooltip } from '../navigation-tooltip/navigation-tooltip';
import { StaffProfile } from '../staff-profile/staff-profile';
import { SidebarAction } from '../sidebar-action/sidebar-action';
@Component({
	selector: 'app-backoffice',
	standalone: true,
	imports: [
		TranslatePipe,
		RouterLink,
		RouterLinkActive,
		RouterOutlet,
		Brand,
		Icon,
		NavigationTooltip,
		StaffProfile,
		SidebarAction,
	],
	host: {
		'(document:keydown.escape)': 'dismissNavigation()',
	},
	templateUrl: './backoffice.html',
	styleUrl: './backoffice.scss',
})
export class Backoffice {
	readonly auth = inject(Auth);
	private readonly router = inject(Router);
	readonly menuOpen = signal(false);
	private readonly compactQuery = window.matchMedia('(max-width: 1100px)');
	readonly compact = signal(this.compactQuery.matches);
	readonly tooltip = signal<{ text: string; top: number; left: number } | null>(null);
	private readonly menuToggle = viewChild<ElementRef<HTMLButtonElement>>('menuToggle');
	private readonly navigation = viewChild<ElementRef<HTMLElement>>('navigation');
	private tooltipTarget: HTMLElement | null = null;
	private tooltipTimer?: ReturnType<typeof setTimeout>;
	private focusFrame?: number;
	constructor() {
		const resized = () => {
			this.compact.set(this.compactQuery.matches);
			this.menuOpen.set(false);
			this.hideTooltip(true);
		};
		window.addEventListener('resize', resized);
		inject(DestroyRef).onDestroy(() => {
			window.removeEventListener('resize', resized);
			clearTimeout(this.tooltipTimer);
			if (this.focusFrame !== undefined) cancelAnimationFrame(this.focusFrame);
		});
	}
	setMenu(open: boolean, restoreFocus = false) {
		this.hideTooltip(true);
		this.menuOpen.set(open);
		if (this.focusFrame !== undefined) cancelAnimationFrame(this.focusFrame);
		if (open) {
			this.focusFrame = requestAnimationFrame(() =>
				this.navigation()?.nativeElement.querySelector<HTMLButtonElement>('.close-menu')?.focus(),
			);
		} else if (restoreFocus) {
			this.menuToggle()?.nativeElement.focus();
		}
	}
	dismissNavigation() {
		if (this.menuOpen()) this.setMenu(false, true);
		this.hideTooltip(true);
	}
	showTooltip(event: Event, text: string) {
		if (!this.compact() || this.menuOpen()) return;
		this.keepTooltip();
		this.tooltipTarget = event.currentTarget as HTMLElement;
		const bounds = this.tooltipTarget.getBoundingClientRect();
		this.tooltip.set({
			text,
			top: Math.max(32, Math.min(window.innerHeight - 32, bounds.y + bounds.height / 2)),
			left: bounds.right + 12,
		});
	}
	keepTooltip() {
		clearTimeout(this.tooltipTimer);
	}
	hideTooltip(force = false) {
		this.keepTooltip();
		if (force) {
			this.tooltip.set(null);
			this.tooltipTarget = null;
		} else {
			this.tooltipTimer = setTimeout(() => {
				if (document.activeElement !== this.tooltipTarget) this.tooltip.set(null);
			}, 150);
		}
	}
	navigationFocusLeft(event: FocusEvent) {
		const target = event.relatedTarget as Node | null;
		if (
			target === this.menuToggle()?.nativeElement ||
			(target instanceof HTMLElement && target.classList.contains('scrim'))
		)
			return;
		if (this.menuOpen() && !this.navigation()?.nativeElement.contains(target)) {
			this.setMenu(false);
		}
	}
	readonly links = [
		{ path: 'ai-config', label: 'AI planning', icon: 'layers', manager: true },
		{path: 'kitchen-configurations',label: 'Kitchen Configurations',icon: 'box',manager: true},
		{ path: 'kitchen', label: 'Kitchen Visualization', icon: 'box', manager: false },
		{ path: 'orders', label: 'See orders', icon: 'orders', manager: false },
		{ path: 'users', label: 'Users', icon: 'users', manager: false },
		{ path: 'products', label: 'Manage products', icon: 'pizza', manager: false },
		{ path: 'stock', label: 'Stock Management', icon: 'box', manager: false },
		{ path: 'customers', label: 'Customer Management', icon: 'users', manager: true },
		{ path: 'product-categories', label: 'Product categories', icon: 'grid', manager: true },
		{ path: 'pizza-components', label: 'Pizza components', icon: 'layers', manager: true },
		{ path: 'component-configurations', label: 'Size configurations', icon: 'box', manager: true },
		{ path: 'pizzas', label: 'Pizza recipes', icon: 'pizza', manager: true },
		{ path: 'pizza-sizes', label: 'Pizza sizes', icon: 'grid', manager: false },
		{ path: 'allergens', label: 'Allergens', icon: 'layers', manager: true },
	];
	canSeeLink(link: { path: string; manager: boolean }): boolean {
		if (link.path === 'users') return this.auth.administrator() || this.auth.manager();
		return link.manager ? this.auth.manager() : this.auth.restaurant();
	}
	currentPage() {
		const path = this.router.url.split('?')[0];
		if (path === '/backoffice/kitchen') return 'Kitchen Visualization';
		if (path === '/backoffice/profile') return 'My profile';
		return (
			this.links.find((link) => this.router.url.split('?')[0] === '/backoffice/' + link.path)
				?.label ?? 'Workspace'
		);
	}
	async logout() {
		if (!(await this.auth.logout())) return;
		void this.router.navigate(['/backoffice/login']);
	}
	skipToContent(event: Event) {
		event.preventDefault();
		document.getElementById('page-content')?.focus();
	}
}
