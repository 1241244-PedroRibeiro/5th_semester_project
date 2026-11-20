import { expect, test, type Page } from '@playwright/test';

const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;

async function seedSession(page: Page, roles: string[], persistent = false) {
	await page.addInitScript(
		({ token, roles, persistent }) => {
			const storage = persistent ? localStorage : sessionStorage;
			storage.setItem(
				'forno-session',
				JSON.stringify({
					token,
					user: {
						username: 'test_user',
						firstName: 'Test',
						lastName: 'User',
						email: 'test@example.test',
						roles,
						status: 'ACTIVE',
					},
				}),
			);
		},
		{ token, roles, persistent },
	);
}

for (const office of ['customer', 'staff'] as const) {
	test(`${office} API 403 uses the shared error page without ending the session`, async ({
		page,
	}) => {
		const staff = office === 'staff';
		await seedSession(page, [staff ? 'MANAGER' : 'CUSTOMER'], !staff);
		let denied = 0;
		await page.route('**/api/**', (route) => {
			const path = new URL(route.request().url()).pathname;
			if (path === (staff ? '/api/products' : '/api/user/me/contact-details')) {
				denied++;
				return route.fulfill({
					status: 403,
					json: { error: { message: 'Private authorization details' } },
				});
			}
			return route.fulfill({
				json: path.endsWith('/allergens')
					? []
					: { items: [], total: 0, page: 1, pageSize: 100, totalPages: 0 },
			});
		});
		await page.goto(staff ? '/backoffice/products' : '/account');
		await expect(page).toHaveURL('/unauthorized');
		await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeFocused();
		await expect(page).toHaveTitle('Access denied · LaPrizza');
		await expect(page.getByText('Private authorization details')).toHaveCount(0);
		const stored = await page.evaluate(
			(persistent) => (persistent ? localStorage : sessionStorage).getItem('forno-session'),
			!staff,
		);
		expect(JSON.parse(stored!).token).toBe(token);
		expect(denied).toBe(1);
		await expect(
			page.getByRole('link', { name: 'Sign in with another account', exact: true }),
		).toHaveAttribute('href', staff ? '/backoffice/login' : '/login');
	});
}

test('an anonymous login 403 also opens the default error page', async ({ page }) => {
	await page.route('**/api/auth/login', (route) =>
		route.fulfill({ status: 403, json: { error: { message: 'Account deactivated' } } }),
	);
	await page.goto('/login');
	await page.getByLabel('Email', { exact: true }).fill('inactive@example.test');
	await page.getByLabel('Password', { exact: true }).fill('Password123!');
	await page.getByRole('button', { name: 'Login', exact: true }).click();
	await expect(page).toHaveURL('/unauthorized');
	await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
		'href',
		'/login',
	);
});

test('a public API 403 does not require a stored token to show the error page', async ({
	page,
}) => {
	await page.route('**/api/health', (route) =>
		route.fulfill({ status: 403, json: { error: { message: 'Forbidden' } } }),
	);
	await page.goto('/status');
	await expect(page).toHaveURL('/unauthorized');
	await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
});

for (const width of [320, 1440]) {
	test(`the error page is public, reloadable, and fits ${width}px screens`, async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		const apiRequests: string[] = [];
		page.on('request', (request) => {
			if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
		});
		await page.goto('/unauthorized');
		await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeFocused();
		await page.reload();
		await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeFocused();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true,
		);
		expect(apiRequests).toEqual([]);
		await page.screenshot({ path: testInfo.outputPath('access-denied.png'), fullPage: true });
		await page.getByRole('link', { name: 'Go to home', exact: true }).click();
		await expect(page).toHaveURL('/');
	});
}

test('the previous backoffice access URL uses the same default page', async ({ page }) => {
	await page.goto('/backoffice/access');
	await expect(page).toHaveURL('/unauthorized');
	await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
});
