import { expect, test } from '@playwright/test';

for (const [roles, path, allowed] of [
	[['ADMINISTRATOR'], 'users', true],
	[['ADMINISTRATOR'], 'products', false],
	[['ADMINISTRATOR'], 'kitchen', false],
	[['MANAGER'], 'users', true],
	[['MANAGER'], 'products', true],
	[['EMPLOYEE'], 'users', false],
	[['EMPLOYEE'], 'products', false],
	[['EMPLOYEE'], 'kitchen', true],
	[['ADMINISTRATOR', 'MANAGER'], 'users', true],
	[['ADMINISTRATOR', 'MANAGER'], 'products', true],
] as const) {
	test(`${roles.join('+')} ${allowed ? 'can' : 'cannot'} access ${path}`, async ({ page }) => {
		await page.addInitScript((roles) => {
			const token = `e30.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`;
			sessionStorage.setItem(
				'forno-session',
				JSON.stringify({
					token,
					user: {
						username: 'role_test',
						firstName: 'Role',
						lastName: 'Test',
						email: 'role@example.test',
						roles,
						status: 'ACTIVE',
					},
				}),
			);
		}, roles);
		await page.route('**/api/**', (route) => {
			const path = new URL(route.request().url()).pathname;
			return route.fulfill({
				json:
					path === '/api/users'
						? { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }
						: [],
			});
		});
		await page.goto(`/backoffice/${path}`);
		await expect(page).toHaveURL(allowed ? `/backoffice/${path}` : '/unauthorized');
		if (allowed) {
			await expect(
				page
					.getByRole('navigation', { name: 'Workspace navigation' })
					.getByRole('link', { name: 'Users', exact: true }),
			).toHaveCount(roles.some((role) => role === 'ADMINISTRATOR' || role === 'MANAGER') ? 1 : 0);
		}
	});
}
