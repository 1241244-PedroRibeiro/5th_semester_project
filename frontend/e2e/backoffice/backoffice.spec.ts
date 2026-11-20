import { expect, test, type Page } from '@playwright/test';

const manager = {
	username: 'alex_l',
	firstName: 'Alex',
	lastName: 'Morgan',
	email: 'alex@laprizza.test',
	roles: ['MANAGER'],
	status: 'ACTIVE',
	createdAt: '2026-10-22T10:00:00Z',
};
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
const pageOf = (items: unknown[], page = 1, pageSize = 8) => ({
	items,
	total: items.length,
	page,
	pageSize,
	totalPages: 1,
});
const product = {
	sku: 'WATER',
	name: 'Water',
	description: 'Still mineral water.',
	categoryName: 'Drinks',
	isSellable: true,
	isPizzaComponent: false,
	isStockControlled: true,
	componentTypeName: null,
	directSellingPrice: 2.5,
	active: true,
	associatedAllergens: [],
};
const cheese = {
	...product,
	sku: 'CHEESE',
	name: 'Mozzarella',
	description: 'Fresh mozzarella.',
	categoryName: 'Ingredients',
	isSellable: false,
	isPizzaComponent: true,
	componentTypeName: 'Cheese',
	directSellingPrice: null,
};
const pizzaProduct = {
	...product,
	sku: 'PIZZA',
	name: 'Margherita',
	categoryName: 'Pizzas',
	isStockControlled: false,
};
const recipe = {
	pizzaSku: 'PIZZA',
	recipeName: 'Margherita',
	ids: [
		{ pizzaSku: 'PIZZA', pizzaSize: 'Small' },
		{ pizzaSku: 'PIZZA', pizzaSize: 'Large' },
	],
	defaultRecipeLines: [{ componentSku: 'CHEESE', defaultQuantity: 1 }],
	supportedSizes: ['Small', 'Large'],
};

async function mockApi(page: Page, roles = ['MANAGER']) {
	let currentProduct = { ...product };
	let currentRecipe = structuredClone(recipe);
	let accountPassword = 'StrongPassword1!';
	let contact = { ...manager, roles } as typeof manager & {
		address?: Record<string, string>;
		phoneNumber?: string;
	};
	const requests: { method: string; path: string; body: any; authorization: string | undefined }[] =
		[];
	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname;
		const method = request.method();
		requests.push({
			method,
			path,
			body: request.postDataJSON(),
			authorization: request.headers()['authorization'],
		});
		let body: unknown;
		if (path === '/api/auth/logout') return route.fulfill({ status: 204 });
		else if (path === '/api/auth/login' || path === '/api/auth/register')
			body = { token, user: { ...manager, roles } };
		else if (path === '/api/products' && method === 'GET')
			body = [currentProduct, cheese, pizzaProduct];
		else if (path === '/api/products/WATER' && method === 'PUT')
			body = currentProduct = { ...currentProduct, ...request.postDataJSON() };
		else if (path === '/api/products/WATER/allergens' && method === 'POST')
			body = currentProduct = {
				...currentProduct,
				associatedAllergens: [
					...new Set([...currentProduct.associatedAllergens, request.postDataJSON().allergenName]),
				],
			};
		else if (path === '/api/user/me/address' && method === 'PUT')
			body = contact = { ...contact, address: request.postDataJSON() };
		else if (path === '/api/user/me/phone-number' && method === 'PUT')
			body = contact = { ...contact, phoneNumber: request.postDataJSON().phoneNumber };
		else if (path === '/api/user/me/name' && method === 'PUT')
			body = contact = { ...contact, ...request.postDataJSON() };
		else if (['/api/user/me/email', '/api/user/me/password'].includes(path) && method === 'PUT') {
			const value = request.postDataJSON();
			if (value.currentPassword !== accountPassword)
				return route.fulfill({
					status: 403,
					json: { error: { message: 'Current password is incorrect.' } },
				});
			if (path.endsWith('/email')) contact = { ...contact, email: value.email };
			else accountPassword = value.newPassword;
			body = contact;
		} else if (path === '/api/products/WATER/block')
			body = currentProduct = { ...currentProduct, active: false };
		else if (path === '/api/stock')
			body = [
				{
					productSku: 'WATER',
					productName: 'Water',
					currentUnits: 48,
					updatedAt: manager.createdAt,
				},
			];
		else if (path === '/api/categories')
			body = pageOf([{ name: 'Drinks' }, { name: 'Ingredients' }, { name: 'Pizzas' }]);
		else if (path === '/api/pizza-component-types')
			body = pageOf([{ name: 'Cheese', assemblyOrder: 1, minCardinality: 0, maxCardinality: 3 }]);
		else if (path === '/api/pizza-sizes')
			body = [
				{ name: 'Small', active: true },
				{ name: 'Large', active: true },
			];
		else if (path === '/api/allergens') body = [{ name: 'Milk' }];
		else if (path === '/api/component-size-configurations')
			body = [
				{
					id: 'config',
					componentSku: 'CHEESE',
					productName: 'Mozzarella',
					pizzaSize: 'Small',
					sizeName: 'Small',
					price: 1.2,
					stockUnitsConsumed: 1,
					stockControlled: true,
				},
			];
		else if (path === '/api/users' || path.startsWith('/api/users/filter/role/'))
			body = pageOf([{ ...manager, roles }]);
		else if (path === '/api/auth/invite')
			body = { ...manager, ...request.postDataJSON(), status: 'PENDING_REGISTRATION' };
		else if (path === '/api/predefined-pizzas/PIZZA' && method === 'PUT') {
			const update = request.postDataJSON();
			currentRecipe = {
				...currentRecipe,
				...update,
				ids: update.availableSizes.map((pizzaSize: string) => ({ pizzaSku: 'PIZZA', pizzaSize })),
				supportedSizes: update.availableSizes,
			};
			body = currentRecipe;
		} else if (path === '/api/predefined-pizzas/PIZZA') body = currentRecipe;
		else if (path === '/api/predefined-pizzas')
			body = currentRecipe.ids.map((id) => ({
				...currentRecipe,
				ids: [id],
				supportedSizes: [id.pizzaSize],
			}));
		else if (path === '/api/health')
			body = { status: 'ok', service: 'LaPrizza', timestamp: manager.createdAt };
		else
			return route.fulfill({
				status: 404,
				json: { error: { message: `Unmocked request: ${method} ${path}` } },
			});
		return route.fulfill({ json: body });
	});
	return requests;
}

async function signIn(page: Page, roles = ['MANAGER']) {
	const requests = await mockApi(page, roles);
	await page.goto('/backoffice/login');
	await page.getByLabel('Email address').fill(manager.email);
	await page.getByLabel('Password', { exact: true }).fill('StrongPassword1!');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await expect(
		page.getByRole('heading', {
			name: roles.includes('MANAGER')
				? 'Product Management'
				: roles.includes('ADMINISTRATOR')
					? 'User Management'
					: 'Orders',
			exact: true,
		}),
	).toBeVisible();
	return requests;
}

test('login, product edit, disable and dialog focus restoration', async ({ page }) => {
	const requests = await signIn(page);
	await page.getByRole('button', { name: 'Update Water', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Update product' });
	await expect(dialog).toBeVisible();
	await dialog.getByLabel('Description').fill('Updated mineral water.');
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.getByText('Updated mineral water.', { exact: true })).toBeVisible();
	expect(
		requests.find((r) => r.method === 'PUT' && r.path === '/api/products/WATER')?.authorization,
	).toBe(`Bearer ${token}`);
	await page.getByRole('button', { name: 'Disable Water', exact: true }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
	await expect(page.getByRole('button', { name: 'Activate Water', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Update Water', exact: true }).click();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'Update Water', exact: true })).toBeFocused();
});

test('partial product saves report stock failures without repeating replenishment', async ({
	page,
}) => {
	await signIn(page);
	let stockRequests = 0;
	await page.route('**/api/stock/WATER/adjustments', (route) => {
		stockRequests++;
		return route.fulfill({
			status: 500,
			json: { error: { message: 'Stock service unavailable' } },
		});
	});
	await page.getByRole('button', { name: 'Update Water', exact: true }).click();
	await page.getByLabel('Description').fill('Saved product details.');
	await page.getByLabel('Increase stock quantity').fill('12');
	await page.getByRole('button', { name: 'Save changes', exact: true }).click();
	await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
		'Product details saved. Stock was not confirmed',
	);
	await expect(page.getByLabel('Increase stock quantity')).toHaveValue('0');
	await page.getByRole('button', { name: 'Save changes', exact: true }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.getByText('Saved product details.', { exact: true })).toBeVisible();
	expect(stockRequests).toBe(1);
});

test('recipe size filters and persisted configuration edits', async ({ page }) => {
	const requests = await signIn(page);
	await page.getByRole('link', { name: 'Pizza recipes', exact: true }).click();
	await expect(page.locator('tbody tr')).toHaveCount(2);
	await page.getByLabel('Filter pizza size').selectOption('Small');
	await expect(page.locator('tbody tr')).toHaveCount(1);
	await page.getByRole('button', { name: 'Configure Margherita, Small' }).click();
	await expect(page.getByText('The default recipe is shared', { exact: false })).toBeVisible();
	await page.getByLabel('Recipe name').fill('House Margherita');
	await page.getByLabel('Quantity for ingredient 1').fill('3');
	await page.getByRole('checkbox', { name: 'Large', exact: true }).uncheck();
	await page.getByRole('button', { name: 'Save configuration', exact: true }).last().click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.getByText('House Margherita', { exact: true })).toBeVisible();
	const update = requests.find(
		(r) => r.path === '/api/predefined-pizzas/PIZZA' && r.method === 'PUT',
	);
	expect(update?.body).toEqual({
		recipeName: 'House Margherita',
		defaultRecipeLines: [{ componentSku: 'CHEESE', defaultQuantity: 3 }],
		availableSizes: ['Small'],
	});
	await page.reload();
	await expect(page.getByText('House Margherita', { exact: true })).toBeVisible();
});

test('user role filters, staff invitation and server errors', async ({ page }) => {
	const requests = await signIn(page, ['ADMINISTRATOR']);
	await page.getByRole('link', { name: 'Users', exact: true }).click();
	await page.getByRole('button', { name: 'LaPrizza Managers', exact: true }).click();
	await expect(page.locator('tbody tr')).toHaveCount(1);
	expect(requests.some((r) => r.path === '/api/users/filter/role/MANAGER')).toBeTruthy();
	await page.getByRole('button', { name: 'Invite team member', exact: true }).click();
	await page.getByLabel('Work email').fill('jamie@laprizza.test');
	await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
	expect(requests.find((r) => r.path === '/api/auth/invite')?.body.roleName).toBe('EMPLOYEE');
	await page.route('**/api/users**', (route) =>
		route.fulfill({ status: 500, json: { error: { message: 'Service temporarily unavailable' } } }),
	);
	await page.reload();
	await expect(page.getByRole('alert')).toContainText('Service temporarily unavailable');
});

test('resource navigation reuses the page with the correct endpoint and fields', async ({
	page,
}) => {
	await signIn(page);
	await page.getByRole('link', { name: 'Product categories', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Product Categories', exact: true }).first(),
	).toBeVisible();
	await expect(page.getByText('Drinks', { exact: true })).toBeVisible();
	await page.getByRole('link', { name: 'Pizza components', exact: true }).click();
	await expect(page.getByRole('columnheader', { name: 'Assembly order' })).toBeVisible();
	await page.getByRole('button', { name: 'Update Cheese', exact: true }).click();
	await expect(page.getByLabel('Minimum components')).toHaveValue('0');
	await page.getByRole('button', { name: 'Cancel', exact: true }).click();
	await page.getByRole('link', { name: 'Pizza sizes', exact: true }).click();
	await expect(page.getByText('Small', { exact: true })).toBeVisible();
});

test('product categories use the consolidated category CRUD contract and preserve the old URL', async ({
	page,
}) => {
	await signIn(page);
	let categories = [{ name: 'Drinks', description: 'Refreshing drinks' }];
	const writes: { method: string; path: string; body: unknown }[] = [];
	await page.route('**/api/categories**', async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		if (request.method() === 'GET') {
			expect(url.pathname).toBe('/api/categories');
			expect(url.searchParams.get('page')).toBe('1');
			expect(url.searchParams.get('pageSize')).toBe('8');
			return route.fulfill({ json: pageOf(categories) });
		}
		const body = request.postDataJSON();
		writes.push({ method: request.method(), path: url.pathname, body });
		expect(request.headers()['authorization']).toBe(`Bearer ${token}`);
		if (request.method() === 'POST') {
			categories.push({ name: body.categoryName, description: body.description ?? '' });
			return route.fulfill({ status: 201, json: { name: body.categoryName } });
		}
		const name = decodeURIComponent(url.pathname.slice('/api/categories/'.length));
		if (request.method() === 'PUT') {
			categories = categories.map((category) => (category.name === name ? body : category));
			return route.fulfill({ json: body });
		}
		if (name === 'Drinks')
			return route.fulfill({
				status: 409,
				json: {
					error: { message: 'Category is referenced by existing products and cannot be deleted' },
				},
			});
		categories = categories.filter((category) => category.name !== name);
		return route.fulfill({ json: { message: 'Category removed successfully' } });
	});
	await page.goto('/backoffice/product-types');
	await expect(page).toHaveURL('/backoffice/product-categories');
	await expect(page.locator('h1')).toHaveText('Product Categories');
	await expect(page.getByText('Refreshing drinks', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Add product category', exact: true }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel('Name', { exact: true }).fill('  Beverages  ');
	await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeEnabled();
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).not.toBeVisible();
	await page.getByRole('button', { name: 'Update Beverages', exact: true }).click();
	await expect(dialog.getByLabel('Description', { exact: true })).toHaveValue('');
	await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled();
	await dialog.getByLabel('Name', { exact: true }).fill('Cold beverages');
	await dialog.getByLabel('Description', { exact: true }).fill('Updated drinks');
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.getByText('Updated drinks', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Remove Cold beverages', exact: true }).click();
	await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.getByText('Cold beverages', { exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: 'Remove Drinks', exact: true }).click();
	await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
	await expect(dialog.getByRole('alert')).toContainText(
		'Category is referenced by existing products',
	);
	expect(writes).toEqual([
		{
			method: 'POST',
			path: '/api/categories',
			body: { categoryName: 'Beverages' },
		},
		{
			method: 'PUT',
			path: '/api/categories/Beverages',
			body: { name: 'Cold beverages', description: 'Updated drinks' },
		},
		{ method: 'DELETE', path: '/api/categories/Cold%20beverages', body: null },
		{ method: 'DELETE', path: '/api/categories/Drinks', body: null },
	]);
});

test('employees are kept out of manager pages and authenticated 401s clear the session', async ({
	page,
}) => {
	await signIn(page, ['EMPLOYEE']);
	await page.goto('/backoffice');
	await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toHaveCount(0);
	await page.goto('/backoffice/products');
	await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
	await page.route('**/api/health', (route) =>
		route.fulfill({ status: 401, json: { error: { message: 'Expired session' } } }),
	);
	await page.goto('/status');
	await expect(page).toHaveURL(/\/login/);
	expect(await page.evaluate(() => sessionStorage.getItem('forno-session'))).toBeNull();
});

test('unauthenticated deep links return to login and customer accounts cannot enter', async ({
	page,
}) => {
	await mockApi(page, ['CUSTOMER']);
	await page.goto('/backoffice/pizzas');
	await expect(page).toHaveURL(/\/login\?returnUrl=/);
	await page.getByLabel('Email address').fill(manager.email);
	await page.getByLabel('Password', { exact: true }).fill('StrongPassword1!');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await expect(page.getByRole('status')).toContainText('does not have backoffice access');
	expect(await page.evaluate(() => sessionStorage.getItem('forno-session'))).toBeNull();
});

test('registration validates the backend password policy and completes invited staff access', async ({
	page,
}, testInfo) => {
	await mockApi(page);
	await page.goto('/backoffice/register');
	await page.getByLabel('First name').fill('Alex');
	await page.getByLabel('Last name').fill('Morgan');
	await page.getByLabel('Work email').fill(manager.email);
	await page.getByLabel('Password', { exact: true }).fill('weakpassword');
	await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeDisabled();
	await page.getByLabel('Password', { exact: true }).fill('StrongPassword1!');
	await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeEnabled();
	await page.screenshot({ path: testInfo.outputPath('registration.png'), fullPage: true });
	await page.getByRole('button', { name: 'Create account', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Product Management' })).toBeVisible();
});

test('size configuration edits send price and ingredient consumption to the correct endpoint', async ({
	page,
}) => {
	const requests = await signIn(page);
	await page.route('**/api/component-size-configurations/config', (route) =>
		route.fulfill({ json: { id: 'config', ...route.request().postDataJSON() } }),
	);
	await page.getByRole('link', { name: 'Size configurations', exact: true }).click();
	await page.getByRole('button', { name: 'Update Mozzarella, Small', exact: true }).click();
	await page.getByLabel('Price · EUR', { exact: true }).fill('2.25');
	await page.getByLabel('Stock units consumed', { exact: true }).fill('2');
	const sent = page.waitForRequest(
		(request) =>
			request.method() === 'PUT' && request.url().endsWith('/component-size-configurations/config'),
	);
	await page.getByRole('button', { name: 'Save changes', exact: true }).click();
	expect((await sent).postDataJSON()).toEqual({ price: 2.25, stockUnitsConsumed: 2 });
	await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('compact sidebar shows hover and focus labels, supports expansion and resets on desktop', async ({
	page,
}) => {
	await page.setViewportSize({ width: 768, height: 1000 });
	await signIn(page);
	const sidebar = page.locator('#workspace-navigation');
	const products = sidebar.getByRole('link', { name: 'Manage products', exact: true });
	await expect(sidebar).toHaveCSS('width', '72px');
	await expect(products).toBeVisible();
	await expect(products).toHaveAttribute('aria-current', 'page');
	await expect(products.locator('.nav-text')).toBeHidden();
	await products.hover();
	const tooltip = page.getByRole('tooltip');
	await expect(tooltip).toHaveText('Manage products');
	await tooltip.hover();
	await page.waitForTimeout(200);
	await expect(tooltip).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(tooltip).toHaveCount(0);
	await products.focus();
	await expect(tooltip).toHaveText('Manage products');
	await expect(products).toHaveAttribute('aria-describedby', 'workspace-tooltip');
	await page.keyboard.press('Escape');
	await expect(tooltip).toHaveCount(0);
	await expect(products).toBeFocused();
	await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
	await expect(products.locator('.nav-text')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Close navigation', exact: true })).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeFocused();
	await expect(products.locator('.nav-text')).toBeHidden();
	await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
	await page
		.getByRole('button', { name: 'Close navigation overlay', exact: true })
		.click({ position: { x: 750, y: 400 } });
	await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeFocused();
	await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
	await page.setViewportSize({ width: 1440, height: 1000 });
	await expect(sidebar).toHaveCSS('width', '232px');
	await expect(products.locator('.nav-text')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeHidden();
	await expect(page.getByRole('button', { name: 'Close navigation overlay' })).toHaveCount(0);
	await products.hover();
	await expect(tooltip).toHaveCount(0);
});

test.describe('touch navigation', () => {
	test.use({ hasTouch: true });
	test('phone rail navigates directly, expands labels and scrolls on short screens', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await signIn(page, ['MANAGER', 'ADMINISTRATOR']);
		const sidebar = page.locator('#workspace-navigation');
		await expect(sidebar).toHaveCSS('width', '64px');
		await sidebar.getByRole('link', { name: 'Users', exact: true }).tap();
		await expect(page).toHaveURL('/backoffice/users');
		await page.getByRole('button', { name: 'Open navigation', exact: true }).tap();
		await expect(sidebar.locator('.nav-text').first()).toBeVisible();
		await sidebar.getByRole('link', { name: 'Manage products', exact: true }).tap();
		await expect(page).toHaveURL('/backoffice/products');
		await expect(sidebar).toHaveCSS('width', '64px');
		await page.setViewportSize({ width: 844, height: 390 });
		const signOut = sidebar.getByRole('button', { name: 'Sign out', exact: true });
		await signOut.scrollIntoViewIfNeeded();
		await expect(signOut).toBeInViewport();
		await signOut.tap();
		await expect(page).toHaveURL('/backoffice/login');
	});
});

test('compact employee navigation retains only allowed links', async ({ page }) => {
	await page.setViewportSize({ width: 1024, height: 768 });
	await signIn(page, ['EMPLOYEE']);
	const navigation = page.getByRole('navigation', { name: 'Workspace navigation' });
	await expect(navigation.getByRole('link')).toHaveCount(1);
	await expect(navigation.getByRole('link', { name: 'See orders', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
	await expect(navigation.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
});

for (const role of ['MANAGER', 'EMPLOYEE']) {
	test(`${role} can open kitchen and edit their own contact profile`, async ({ page }) => {
		const requests = await signIn(page, [role]);
		await page.getByRole('link', { name: 'Kitchen Visualization', exact: true }).click();
		await expect(page).toHaveURL('/backoffice/kitchen');
		await expect(
			page.getByRole('heading', { name: 'Kitchen Visualization', exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole('region', { name: 'Kitchen visualization placeholder' }),
		).toBeVisible();
		await expect(
			page.getByRole('region', { name: 'Kitchen visualization placeholder' }),
		).toBeEmpty();
		await page.getByRole('link', { name: 'Edit your profile', exact: true }).click();
		await expect(page).toHaveURL('/backoffice/profile');
		await expect(page.getByRole('heading', { name: 'My profile', exact: true })).toBeVisible();
		await expect(page.getByText(manager.email, { exact: true })).toBeVisible();
		await page.getByLabel('Phone number', { exact: true }).fill('+351912345678');
		await page.getByRole('button', { name: 'Save phone number', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('Phone number saved.');
		await page.getByLabel('Street address', { exact: true }).fill(' Rua das Flores 10 ');
		await page.getByLabel('City', { exact: true }).fill('Porto');
		await page.getByLabel('Postal code', { exact: true }).fill('4000-001');
		await page.getByLabel('Additional details', { exact: true }).fill('Floor 2');
		await page.getByRole('button', { name: 'Save address', exact: true }).click();
		await expect(page.getByText('Address saved.', { exact: true })).toBeVisible();
		expect(requests.find((r) => r.path === '/api/user/me/phone-number')).toMatchObject({
			method: 'PUT',
			body: { phoneNumber: '+351912345678' },
			authorization: `Bearer ${token}`,
		});
		expect(requests.find((r) => r.path === '/api/user/me/address')).toMatchObject({
			method: 'PUT',
			body: {
				street: 'Rua das Flores 10',
				city: 'Porto',
				postalCode: '4000-001',
				extraDetails: 'Floor 2',
			},
		});
		await page.reload();
		await expect(page.getByLabel('Phone number', { exact: true })).toHaveValue('+351912345678');
		await expect(page.getByLabel('Street address', { exact: true })).toHaveValue(
			'Rua das Flores 10',
		);
		expect(requests.some((r) => r.path === `/api/user/${manager.username}`)).toBeFalsy();
	});
}

test('profile save failures remain editable and never report success', async ({ page }) => {
	await signIn(page);
	await page.goto('/backoffice/profile');
	await page.route('**/api/user/me/phone-number', (route) =>
		route.fulfill({
			status: 503,
			json: { error: { message: 'Contact service unavailable' } },
		}),
	);
	await page.getByLabel('Phone number', { exact: true }).fill('invalid');
	await expect(page.getByRole('button', { name: 'Save phone number', exact: true })).toBeDisabled();
	await page.getByLabel('Phone number', { exact: true }).fill('+351912345678');
	await page.getByRole('button', { name: 'Save phone number', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Contact service unavailable');
	await expect(page.getByRole('status')).toHaveCount(0);
	await page.reload();
	await expect(page.getByLabel('Phone number', { exact: true })).toHaveValue('');
});

test('profile contact writes cannot overlap', async ({ page }) => {
	const requests = await signIn(page);
	await page.goto('/backoffice/profile');
	let release!: () => void;
	const pending = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/api/user/me/phone-number', async (route) => {
		await pending;
		return route.fallback();
	});
	await page.getByLabel('Street address', { exact: true }).fill('Rua Nova 5');
	await page.getByLabel('City', { exact: true }).fill('Porto');
	await page.getByLabel('Postal code', { exact: true }).fill('4000-001');
	await page.getByLabel('Phone number', { exact: true }).fill('+351912345678');
	await page.getByRole('button', { name: 'Save phone number', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Save address', exact: true })).toBeDisabled();
	await expect(page.getByLabel('Street address', { exact: true })).toBeDisabled();
	release();
	await expect(page.getByText('Phone number saved.', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Save address', exact: true }).click();
	await expect(page.getByText('Address saved.', { exact: true })).toBeVisible();
	expect(requests.filter((r) => r.method === 'PUT').map((r) => r.path)).toEqual([
		'/api/user/me/phone-number',
		'/api/user/me/address',
	]);
});

test('product allergens load all pages and retain confirmed associations after a partial failure', async ({
	page,
}) => {
	const requests = await signIn(page);
	const pages: string[] = [];
	await page.route('**/api/allergens?*', (route) => {
		const number = new URL(route.request().url()).searchParams.get('page')!;
		pages.push(number);
		return route.fulfill({
			json: {
				items: [{ name: number === '1' ? 'Milk' : 'Gluten' }],
				page: Number(number),
				pageSize: 100,
				totalPages: 2,
				total: 2,
			},
		});
	});
	let fail = true;
	await page.route('**/api/products/WATER/allergens', (route) => {
		if (route.request().postDataJSON().allergenName === 'Gluten' && fail) {
			fail = false;
			return route.fulfill({ status: 503, json: { error: { message: 'Please retry' } } });
		}
		return route.fallback();
	});
	await page.getByRole('button', { name: 'Update Water', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Update product', exact: true });
	await dialog.getByLabel('Description').fill('Unsaved description draft');
	await dialog.getByRole('checkbox', { name: 'Milk', exact: true }).check();
	await dialog.getByRole('checkbox', { name: 'Gluten', exact: true }).check();
	await dialog.getByRole('button', { name: 'Add selected allergens', exact: true }).click();
	await expect(dialog.getByRole('alert')).toContainText('1 association(s) saved.');
	await expect(dialog.getByRole('checkbox', { name: 'Milk (saved)', exact: true })).toBeDisabled();
	await expect(dialog.getByRole('checkbox', { name: 'Gluten', exact: true })).toBeChecked();
	await dialog.getByRole('button', { name: 'Add selected allergens', exact: true }).click();
	await expect(dialog.getByRole('status')).toContainText('Allergen associations saved.');
	await expect(
		dialog.getByRole('checkbox', { name: 'Gluten (saved)', exact: true }),
	).toBeDisabled();
	await expect(dialog.getByLabel('Description')).toHaveValue('Unsaved description draft');
	await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
	await page.getByRole('button', { name: 'Update Water', exact: true }).click();
	await expect(dialog.getByRole('checkbox', { name: 'Milk (saved)', exact: true })).toBeChecked();
	expect(pages).toContain('2');
	expect(
		requests.filter((r) => r.path === '/api/products/WATER/allergens').map((r) => r.body),
	).toEqual([{ allergenName: 'Milk' }, { allergenName: 'Gluten' }]);
	expect(requests.some((r) => r.method === 'PUT' || r.path.includes('/adjustments'))).toBeFalsy();
});

test('product allergen lookup errors can retry without blocking product details', async ({
	page,
}) => {
	await signIn(page);
	let offline = true;
	await page.route('**/api/allergens?*', (route) =>
		offline
			? route.fulfill({ status: 503, json: { error: { message: 'Allergen list unavailable' } } })
			: route.fulfill({ json: [{ name: 'Milk' }] }),
	);
	await page.getByRole('button', { name: 'Update Water', exact: true }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByRole('alert')).toContainText('Allergen list unavailable');
	await expect(dialog.getByRole('button', { name: 'Save changes', exact: true })).toBeEnabled();
	offline = false;
	await dialog.getByRole('button', { name: 'Retry allergens', exact: true }).click();
	await expect(dialog.getByRole('checkbox', { name: 'Milk', exact: true })).toBeVisible();
});

for (const width of [390, 1024]) {
	test(`account name, email reauthentication and password changes work at ${width}px`, async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		const requests = await signIn(page);
		await page.goto('/backoffice/profile');
		await page.getByRole('button', { name: 'Change name', exact: true }).click();
		let dialog = page.getByRole('dialog', { name: 'Change name', exact: true });
		await dialog.getByLabel('First name', { exact: true }).fill('Taylor');
		await dialog.getByLabel('Last name', { exact: true }).fill('Silva');
		await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
		await expect(dialog).toHaveCount(0);
		await expect(page.getByRole('heading', { name: 'Taylor Silva', exact: true })).toBeVisible();
		await page.reload();
		await expect(page.getByRole('heading', { name: 'Taylor Silva', exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Change email', exact: true }).click();
		dialog = page.getByRole('dialog', { name: 'Change email', exact: true });
		await dialog.getByLabel('New email', { exact: true }).fill('taylor@example.test');
		await dialog.getByLabel('Current password', { exact: true }).fill('wrong');
		await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
		await expect(page).toHaveURL('/unauthorized');
		await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
		expect(
			JSON.parse((await page.evaluate(() => sessionStorage.getItem('forno-session')))!).token,
		).toBe(token);
		await page.goto('/backoffice/profile');
		await page.getByRole('button', { name: 'Change email', exact: true }).click();
		dialog = page.getByRole('dialog', { name: 'Change email', exact: true });
		await dialog.getByLabel('New email', { exact: true }).fill('taylor@example.test');
		await dialog.getByLabel('Current password', { exact: true }).fill('StrongPassword1!');
		await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
		await expect(dialog).toHaveCount(0);
		await expect(page.getByText('taylor@example.test', { exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Change password', exact: true }).click();
		dialog = page.getByRole('dialog', { name: 'Change password', exact: true });
		await dialog.getByLabel('Current password', { exact: true }).fill('StrongPassword1!');
		await dialog.getByLabel('New password', { exact: true }).fill('ReplacementPassword2!');
		await dialog.getByLabel('Confirm new password', { exact: true }).fill('Mismatch');
		await expect(dialog.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
		await dialog.getByLabel('Confirm new password', { exact: true }).fill('ReplacementPassword2!');
		await page.screenshot({ path: testInfo.outputPath('password-editor.png'), fullPage: true });
		await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
		await expect(dialog).toHaveCount(0);
		await expect(page.getByText('Password changed successfully.', { exact: true })).toBeVisible();
		expect(requests.find((r) => r.path === '/api/user/me/name')?.body).toEqual({
			firstName: 'Taylor',
			lastName: 'Silva',
		});
		expect(requests.filter((r) => r.path === '/api/user/me/email').at(-1)?.body).toEqual({
			email: 'taylor@example.test',
			currentPassword: 'StrongPassword1!',
		});
		expect(requests.find((r) => r.path === '/api/user/me/password')?.body).toEqual({
			currentPassword: 'StrongPassword1!',
			newPassword: 'ReplacementPassword2!',
		});
		const stored = await page.evaluate(() => sessionStorage.getItem('forno-session')!);
		expect(JSON.parse(stored).user).toMatchObject({
			firstName: 'Taylor',
			lastName: 'Silva',
			email: 'taylor@example.test',
		});
		expect(stored).not.toContain('StrongPassword1!');
		expect(stored).not.toContain('ReplacementPassword2!');
	});
}

for (const width of [320, 390, 768, 1024, 1440]) {
	test(`responsive routes and mobile navigation at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await signIn(page, ['MANAGER', 'ADMINISTRATOR']);
		for (const route of [
			'products',
			'users',
			'product-categories',
			'pizza-components',
			'component-configurations',
			'pizza-sizes',
			'allergens',
			'pizzas',
			'orders',
			'kitchen',
			'profile',
		]) {
			await page.goto(`/backoffice/${route}`);
			await expect(page).toHaveURL(`/backoffice/${route}`);
			await expect(page.locator('h1')).toBeVisible();
			await expect(page.locator('app-feedback .loading')).toHaveCount(0);
			if (['products', 'pizzas', 'orders', 'kitchen', 'profile'].includes(route)) {
				await page.screenshot({ path: testInfo.outputPath(`${route}.png`), fullPage: true });
			}
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
			).toBeTruthy();
		}
		if (width <= 1100) {
			await page.getByRole('button', { name: 'Open navigation' }).click();
			await page.getByRole('link', { name: 'Manage products', exact: true }).click();
			await expect(page.getByRole('heading', { name: 'Product Management' })).toBeVisible();
			await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toBeVisible();
			await expect(page.locator('#workspace-navigation .nav-text').first()).toBeHidden();
		}
		await page.goto('/backoffice/products');
		await page.getByRole('button', { name: 'Update Water', exact: true }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.screenshot({ path: testInfo.outputPath('product-dialog.png'), fullPage: true });
		const bounds = await page.getByRole('dialog').boundingBox();
		expect(bounds!.x).toBeGreaterThanOrEqual(0);
		expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
		await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeInViewport();
		expect(errors).toEqual([]);
	});
}

test('staff logout revokes the bearer session before redirecting to login', async ({ page }) => {
	const requests = await signIn(page);
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(page).toHaveURL('/backoffice/login');
	expect(requests.filter((request) => request.path === '/api/auth/logout')).toEqual([
		expect.objectContaining({ method: 'POST', authorization: `Bearer ${token}` }),
	]);
	expect(await page.evaluate(() => sessionStorage.getItem('forno-session'))).toBeNull();
});

for (const width of [320, 1280]) {
	test(`manager user list and invitations at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		const requests = await signIn(page, ['MANAGER']);
		await page.goto('/backoffice/users');
		await expect(page.locator('tbody tr')).toHaveCount(1);
		await expect(page.getByRole('button', { name: 'Manage Alex Morgan' })).toHaveCount(0);
		await page.getByRole('button', { name: 'Customers', exact: true }).click();
		await expect(page.locator('tbody tr')).toHaveCount(1);
		expect(requests.some((r) => r.path === '/api/users/filter/role/CUSTOMER')).toBeTruthy();
		await page.getByRole('button', { name: 'Invite team member', exact: true }).click();
		await expect(page.getByLabel('First name')).toHaveCount(0);
		await page.getByLabel('Work email').fill('invite@example.test');
		await page.getByLabel('Role', { exact: true }).selectOption('MANAGER');
		await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
		await expect(page.getByRole('dialog')).not.toBeVisible();
		expect(requests.find((r) => r.path === '/api/auth/invite')?.body).toEqual({
			email: 'invite@example.test',
			roleName: 'MANAGER',
		});
		expect(requests.some((r) => r.path.startsWith('/api/users'))).toBeTruthy();
		await expect(
			page.getByText('Invitation saved and email sent.', { exact: false }),
		).toBeVisible();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
		).toBeTruthy();
		await page.route('**/api/auth/invite', (route) =>
			route.fulfill({
				status: 503,
				json: {
					error: {
						message: 'Invitation email could not be sent. The invitation is saved; please retry.',
					},
				},
			}),
		);
		await page.getByRole('button', { name: 'Invite team member', exact: true }).click();
		await page.getByLabel('Work email').fill('invite@example.test');
		await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page.getByRole('alert')).toContainText('please retry');
	});
}

for (const width of [320, 1280]) {
	test(`manage user roles and deactivate at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 1000 });
		await signIn(page, ['ADMINISTRATOR']);
		let managed = {
			...manager,
			username: 'managed_l',
			firstName: 'Jamie',
			lastName: 'Wilson',
			email: 'jamie@example.test',
			roles: ['EMPLOYEE'],
		};
		const roleWrites: string[][] = [];
		let failSave = false;
		let deactivations = 0;
		await page.route('**/api/users**', (route) => route.fulfill({ json: pageOf([managed]) }));
		await page.route('**/api/user/managed_l/roles', (route) => {
			if (failSave)
				return route.fulfill({
					status: 503,
					json: { error: { message: 'Roles could not be saved. Try again.' } },
				});
			roleWrites.push(route.request().postDataJSON().roles);
			managed = { ...managed, roles: route.request().postDataJSON().roles };
			return route.fulfill({ json: managed });
		});
		await page.route('**/api/user/managed_l/reactivate', (route) => {
			expect(route.request().method()).toBe('POST');
			managed = { ...managed, status: 'ACTIVE' };
			return route.fulfill({ status: 204 });
		});
		await page.route('**/api/user/managed_l', (route) => {
			expect(route.request().method()).toBe('DELETE');
			deactivations++;
			managed = { ...managed, status: 'DEACTIVATED' };
			return route.fulfill({ status: 200, body: '' });
		});
		await page.goto('/backoffice/users');
		await page.getByRole('button', { name: 'managed_l', exact: true }).click();
		const dialog = page.getByRole('dialog', { name: 'Manage user' });
		await expect(dialog.getByRole('checkbox', { name: 'EMPLOYEE' })).toBeChecked();
		await expect(dialog.getByRole('button', { name: 'Save roles' })).toBeDisabled();
		await dialog.getByRole('checkbox', { name: 'EMPLOYEE' }).uncheck();
		await expect(dialog.getByRole('alert')).toContainText('Select at least one role');
		await expect(dialog.getByRole('button', { name: 'Save roles' })).toBeDisabled();
		await dialog.getByRole('checkbox', { name: 'MANAGER' }).check();
		await dialog.getByRole('checkbox', { name: 'CUSTOMER', exact: true }).check();
		await dialog.getByRole('button', { name: 'Save roles' }).click();
		await expect(dialog).not.toBeVisible();
		expect(roleWrites).toEqual([['MANAGER', 'CUSTOMER']]);
		await page.getByRole('button', { name: 'Jamie Wilson', exact: true }).click();
		await expect(dialog.getByRole('checkbox', { name: 'MANAGER' })).toBeChecked();
		await expect(dialog.getByRole('checkbox', { name: 'EMPLOYEE' })).not.toBeChecked();
		failSave = true;
		await dialog.getByRole('checkbox', { name: 'ADMINISTRATOR', exact: true }).check();
		await dialog.getByRole('button', { name: 'Save roles' }).click();
		await expect(dialog.getByRole('alert')).toContainText('Roles could not be saved');
		expect(managed.roles).toEqual(['MANAGER', 'CUSTOMER']);
		await dialog.getByRole('button', { name: 'Deactivate account', exact: true }).click();
		await expect(dialog.getByRole('alert')).toContainText('Unsaved role changes will be discarded');
		expect(deactivations).toBe(0);
		await dialog.getByRole('button', { name: 'Back to roles' }).click();
		await dialog.getByRole('button', { name: 'Deactivate account', exact: true }).click();
		await dialog.getByRole('button', { name: 'Confirm deactivation' }).click();
		await expect(dialog).not.toBeVisible();
		expect(deactivations).toBe(1);
		await page.getByRole('button', { name: 'Manage Jamie Wilson' }).click();
		await expect(
			dialog.getByRole('button', { name: 'Reactivate account', exact: true }),
		).toBeEnabled();
		await expect(dialog.getByRole('checkbox', { name: 'MANAGER' })).toBeDisabled();
		await expect(dialog.getByRole('button', { name: 'Save roles' })).toBeDisabled();
		await expect(dialog.getByText('This account is deactivated.', { exact: false })).toBeVisible();
		await dialog.getByRole('button', { name: 'Reactivate account', exact: true }).click();
		await expect(dialog.getByRole('alert')).toContainText('able to sign in again');
		await dialog.getByRole('button', { name: 'Confirm reactivation' }).click();
		await expect(dialog).not.toBeVisible();
		await page.getByRole('button', { name: 'Manage Jamie Wilson' }).click();
		await expect(dialog.getByRole('checkbox', { name: 'MANAGER' })).toBeEnabled();
		await expect(
			dialog.getByRole('button', { name: 'Deactivate account', exact: true }),
		).toBeEnabled();
		expect(managed.roles).toEqual(['MANAGER', 'CUSTOMER']);

		expect(
			await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth),
		).toBeTruthy();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
		).toBeTruthy();
	});
}

test('own account management keeps administrator access and updates the saved session', async ({
	page,
}) => {
	await signIn(page, ['ADMINISTRATOR']);
	await page.goto('/backoffice/users');
	await page.route('**/api/user/alex_l/roles', (route) =>
		route.fulfill({ json: { ...manager, roles: route.request().postDataJSON().roles } }),
	);
	await page.getByRole('button', { name: 'Manage Alex Morgan' }).click();
	const dialog = page.getByRole('dialog', { name: 'Manage user' });
	await expect(
		dialog.getByRole('checkbox', { name: 'ADMINISTRATOR', exact: true }),
	).toBeDisabled();
	await expect(
		dialog.getByRole('button', { name: 'Deactivate account', exact: true }),
	).toBeDisabled();
	await dialog.getByRole('checkbox', { name: 'MANAGER' }).check();
	await dialog.getByRole('button', { name: 'Save roles' }).click();
	await expect(dialog).not.toBeVisible();
	const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('forno-session')!));
	expect(session.user.roles).toEqual(['ADMINISTRATOR', 'MANAGER']);
});
