import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('English and Portuguese catalogs have matching, populated keys', () => {
	const en = JSON.parse(readFileSync('public/i18n/en.json', 'utf8'));
	const pt = JSON.parse(readFileSync('public/i18n/pt-PT.json', 'utf8'));
	expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
	for (const value of Object.values(pt))
		expect(typeof value === 'string' && value.length > 0).toBeTruthy();
});

for (const path of ['/login', '/backoffice/login']) {
	test(`${path} switches language without navigation or losing credentials`, async ({ page }) => {
		let documents = 0;
		page.on('request', (request) => {
			if (request.isNavigationRequest()) documents++;
		});
		await page.goto(path);
		await page
			.getByLabel(path.startsWith('/backoffice') ? 'Email address' : 'Email', { exact: true })
			.fill('person@example.test');
		await page.getByLabel('Password', { exact: true }).fill('Secret123!');
		await page.getByRole('button', { name: 'Português', exact: true }).click();
		await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
		await expect(page.getByRole('button', { name: 'Português', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		await expect(
			page.getByLabel(path.startsWith('/backoffice') ? 'Endereço de email' : 'Email', {
				exact: true,
			}),
		).toHaveValue('person@example.test');
		await expect(page.getByLabel('Palavra-passe', { exact: true })).toHaveValue('Secret123!');
		await expect(page.getByText('Esqueceu-se da palavra-passe?', { exact: true })).toBeVisible();
		await expect(page).toHaveTitle(/Iniciar sessão/);
		expect(documents).toBe(1);
		await page.getByRole('button', { name: 'English', exact: true }).click();
		await expect(page.getByLabel('Password', { exact: true })).toHaveValue('Secret123!');
		expect(documents).toBe(1);
	});
}

test('saved preference survives reload and navigation; business data stays unchanged', async ({
	page,
}) => {
	await page.route('**/api/catalogue', (route) =>
		route.fulfill({
			json: [
				{
					productSku: 'DRINK',
					name: 'Orange Juice',
					description: 'Fresh orange juice.',
					categoryName: 'Drinks',
					allergens: [],
					directPrice: { amount: 2.5, currency: 'EUR' },
					isPredefinedPizza: false,
					isAvailable: true,
				},
			],
		}),
	);
	await page.goto('/');
	await page.getByRole('button', { name: 'Português', exact: true }).click();
	await expect.poll(() => page.evaluate(() => localStorage.getItem('laprizza.lang'))).toBe('pt-PT');
	await page.getByRole('link', { name: 'Ver a ementa', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Orange Juice', exact: true })).toBeVisible();
	await expect(page.getByText('Fresh orange juice.', { exact: true })).toBeVisible();
	await expect(page.locator('app-product-card')).toContainText('2,50');
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
	await expect(page).toHaveTitle('A nossa ementa · LaPrizza');
	await page.getByRole('button', { name: 'English', exact: true }).click();
	await expect(page.locator('app-product-card')).toContainText('2.50');
});

test('Portuguese browser preference is used when no language is saved', async ({ browser }) => {
	const context = await browser.newContext({ locale: 'pt-PT' });
	const page = await context.newPage();
	await page.goto('/login');
	await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
	await expect(page.getByLabel('Palavra-passe', { exact: true })).toBeVisible();
	await context.close();
});

test('language load failure retains the current language and allows retry', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Email', { exact: true }).fill('retain@example.test');
	await page.route('**/i18n/pt-PT.json', (route) =>
		route.fulfill({ status: 503, body: 'Unavailable' }),
	);
	await page.getByRole('button', { name: 'Português', exact: true }).click();
	await expect(page.getByRole('status')).toContainText('Language could not be loaded');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.getByLabel('Email', { exact: true })).toHaveValue('retain@example.test');
	await page.unroute('**/i18n/pt-PT.json');
	await page.getByRole('button', { name: 'Português', exact: true }).click();
	await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
});

for (const width of [375, 1280]) {
	test(`Portuguese pages and language controls fit ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await page.goto('/register');
		await page.getByRole('button', { name: 'Português', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Português', exact: true })).toBeInViewport();
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
			.toBeTruthy();
		await page.screenshot({
			path: `test-results/portuguese-register-${width}.png`,
			fullPage: true,
		});
	});
}

test('backoffice dialogs retain unsaved values when switching language', async ({ page }) => {
	const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
	await page.addInitScript((token) => {
		sessionStorage.setItem(
			'forno-session',
			JSON.stringify({
				token,
				user: {
					username: 'manager',
					firstName: 'Test',
					lastName: 'Manager',
					email: 'test@example.test',
					status: 'ACTIVE',
					roles: ['MANAGER'],
				},
			}),
		);
	}, token);
	await page.route('**/api/**', (route) => route.fulfill({ json: [] }));
	await page.goto('/backoffice/products');
	await page.getByRole('button', { name: 'Add product', exact: true }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel('Product name', { exact: true }).fill('Unsaved original name');
	await dialog.getByLabel('SKU', { exact: true }).fill('DRAFT-SKU');
	await dialog.getByRole('button', { name: 'Português', exact: true }).click();
	await expect(
		dialog.getByRole('heading', { name: 'Adicionar produto', exact: true }),
	).toBeVisible();
	await expect(dialog.getByLabel('Nome do produto', { exact: true })).toHaveValue(
		'Unsaved original name',
	);
	await expect(dialog.getByLabel('SKU', { exact: true })).toHaveValue('DRAFT-SKU');
	await expect(
		dialog.getByRole('button', { name: 'Guardar alterações', exact: true }),
	).toBeVisible();
	await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Gestão de produtos', exact: true }),
	).toBeVisible();
	await page.goto('/backoffice/orders');
	const date = page.locator('app-orders app-page-header .button');
	const portugueseDate = await date.innerText();
	await page.getByRole('button', { name: 'English', exact: true }).click();
	await expect(date).not.toHaveText(portugueseDate);
});

test('saved choice takes priority over the browser language', async ({ browser }) => {
	const context = await browser.newContext({ locale: 'pt-PT' });
	await context.addInitScript(() => localStorage.setItem('laprizza.lang', 'en'));
	const page = await context.newPage();
	await page.goto('/login');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
	await context.close();
});

test('switching remains usable when browser storage is unavailable', async ({ page }) => {
	await page.addInitScript(() =>
		Object.defineProperty(window, 'localStorage', {
			get() {
				throw new Error('Storage disabled');
			},
		}),
	);
	await page.goto('/login');
	await page.getByRole('button', { name: 'Português', exact: true }).click();
	await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
	await expect(page.getByLabel('Palavra-passe', { exact: true })).toBeVisible();
});

test('database status and role values stay verbatim in both languages', async ({ page }) => {
	await page.addInitScript(() => {
		const token = `e30.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`;
		sessionStorage.setItem(
			'forno-session',
			JSON.stringify({
				token,
				user: {
					username: 'manager',
					firstName: 'Active',
					lastName: 'Customer',
					email: 'manager@example.test',
					status: 'ACTIVE',
					roles: ['MANAGER'],
				},
			}),
		);
	});
	const states = ['ACTIVE', 'DEACTIVATED', 'PENDING_REGISTRATION'];
	const apiMethods: string[] = [];
	await page.route('**/api/**', (route) => {
		apiMethods.push(route.request().method());
		return route.fulfill({
			json: {
				items: states.map((status, index) => ({
					username: `user_${index}`,
					firstName: 'Active',
					lastName: 'Customer',
					email: `user${index}@example.test`,
					status,
					roles: ['MANAGER', 'CUSTOMER'],
					createdAt: '2026-11-01T12:00:00Z',
				})),
				total: 3,
				page: 1,
				pageSize: 8,
				totalPages: 1,
			},
		});
	});
	await page.goto('/backoffice/users');
	for (const language of ['English', 'Português']) {
		await page.getByRole('button', { name: language, exact: true }).click();
		for (const [index, status] of states.entries()) {
			const row = page.getByRole('row').filter({ hasText: `user_${index}` });
			await expect(row.getByText(status, { exact: true })).toBeVisible();
			await expect(row.getByText('MANAGER', { exact: true })).toBeVisible();
			await expect(row.getByText('CUSTOMER', { exact: true })).toBeVisible();
			await expect(row.getByText('Active Customer', { exact: true })).toBeVisible();
		}
	}
	await expect(
		page.getByRole('heading', { name: 'Gestão de utilizadores', exact: true }),
	).toBeVisible();
	expect(apiMethods.every((method) => method === 'GET')).toBeTruthy();
});
