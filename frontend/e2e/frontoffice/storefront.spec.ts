import { expect, test, type Page } from '@playwright/test';

const customer = {
	username: 'jamie_l',
	firstName: 'Jamie',
	lastName: 'Wilson',
	email: 'jamie@laprizza.test',
	roles: ['CUSTOMER'],
	status: 'ACTIVE',
	createdAt: '2026-10-22T10:00:00Z',
};
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
const pizza = {
	productSku: 'PIZZA',
	name: 'Margherita',
	description: 'Tomato sauce, mozzarella and fresh basil.',
	categoryName: 'Pizzas',
	allergens: ['Milk', 'Gluten'],
	isPredefinedPizza: true,
	isAvailable: true,
	defaultRecipeLines: [
		{ componentSku: 'DOUGH', defaultQuantity: 1 },
		{ componentSku: 'SAUCE', defaultQuantity: 1 },
		{ componentSku: 'CHEESE', defaultQuantity: 1 },
	],
	sizeVariants: [
		{
			pizzaSize: 'Small',
			sizeName: 'Small',
			computedPrice: { amount: 10, currency: 'EUR' },
			isAvailable: true,
		},
		{
			pizzaSize: 'Large',
			sizeName: 'Large',
			computedPrice: { amount: 15, currency: 'EUR' },
			isAvailable: true,
		},
	],
};
const knots = {
	productSku: 'KNOTS',
	name: 'Garlic Knots',
	description: 'Six pieces, baked fresh.',
	categoryName: 'Sides',
	allergens: ['Gluten'],
	directPrice: { amount: 8, currency: 'EUR' },
	isPredefinedPizza: false,
	isAvailable: true,
};
const unavailable = {
	...knots,
	productSku: 'WATER',
	name: 'Water',
	categoryName: 'Drinks',
	isAvailable: false,
};
const catalogue = [pizza, knots, unavailable];
const products = [
	{
		sku: 'DOUGH',
		name: 'Classic crust',
		componentTypeName: 'Crust',
		associatedAllergens: ['Gluten'],
	},
	{ sku: 'SAUCE', name: 'Tomato sauce', componentTypeName: 'Sauce', associatedAllergens: [] },
	{ sku: 'CHEESE', name: 'Mozzarella', componentTypeName: 'Cheese', associatedAllergens: ['Milk'] },
].map((p) => ({
	...p,
	description: '',
	categoryName: 'Ingredients',
	isSellable: false,
	isPizzaComponent: true,
	isStockControlled: true,
	directSellingPrice: null,
	active: true,
}));
const configurations = ['Small', 'Large'].flatMap((size, index) =>
	products.map((p, i) => ({
		id: `${size}-${p.sku}`,
		componentSku: p.sku,
		productName: p.name,
		pizzaSize: size,
		sizeName: size,
		price: index ? [4, 3, 8][i] : [3, 2, 5][i],
		stockUnitsConsumed: 1,
		stockControlled: true,
	})),
);

async function mockApi(page: Page) {
	const requests: { path: string; method: string; body: any; authorization?: string }[] = [];
	let allergies = ['Milk'];
	let contact = { ...customer } as typeof customer & {
		address?: Record<string, string>;
		phoneNumber?: string;
	};
	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		const method = request.method();
		const body = request.postDataJSON();
		requests.push({ path, method, body, authorization: request.headers()['authorization'] });
		let response: unknown;
		if (path === '/api/catalogue') response = catalogue;
		else if (path === '/api/products') response = products;
		else if (path === '/api/component-size-configurations') response = configurations;
		else if (path === '/api/pizza-component-types')
			response = {
				items: ['Crust', 'Sauce', 'Cheese'].map((name, i) => ({
					name,
					assemblyOrder: i + 1,
					minCardinality: 1,
					maxCardinality: 1,
				})),
				total: 3,
				page: 1,
				pageSize: 100,
				totalPages: 1,
			};
		else if (path === '/api/allergens')
			response = [{ name: 'Milk' }, { name: 'Gluten' }, { name: 'Eggs' }];
		else if (path === '/api/auth/logout') return route.fulfill({ status: 204 });
		else if (path === '/api/auth/login' || path === '/api/auth/register')
			response = { token, user: customer };
		else if (path === '/api/user/jamie_l/allergens')
			response = { username: customer.username, allergens: allergies };
		else if (path === '/api/user/jamie_l') response = customer;
		else if (path === '/api/user/me/contact-details' && method === 'GET') response = contact;
		else if (path === '/api/user/me/address' && method === 'PUT') {
			contact = { ...contact, address: body };
			response = contact;
		} else if (path === '/api/user/me/phone-number' && method === 'PUT') {
			contact = { ...contact, phoneNumber: body.phoneNumber };
			response = contact;
		} else if (path === '/api/user/jamie_l/allergen' && method === 'POST') {
			allergies = [...new Set([...allergies, ...body.allergens])];
			return route.fulfill({ status: 201, body: '' });
		} else
			return route.fulfill({
				status: 404,
				json: { error: { message: `Unmocked endpoint: ${method} ${path}` } },
			});
		return route.fulfill({ json: response });
	});
	return requests;
}

async function login(page: Page) {
	await page.goto('/login?returnUrl=/account');
	await page.getByLabel('Email', { exact: true }).fill(customer.email);
	await page.getByLabel('Password', { exact: true }).fill('StrongPassword1!');
	await page.getByRole('button', { name: 'Login', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Jamie Wilson', exact: true })).toBeVisible();
}

test('public home and menu use the customer layout and actual catalogue categories', async ({
	page,
}) => {
	await mockApi(page);
	await page.goto('/');
	await expect(page.getByRole('heading', { name: /Your pizza party/ })).toBeVisible();
	await expect(page.getByRole('link', { name: 'LaPrizza home', exact: true })).toBeVisible();
	await expect(page.getByText('Management center', { exact: true })).toHaveCount(0);
	await page.getByRole('link', { name: 'Browse the menu', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Margherita', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Sides', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Garlic Knots', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Margherita', exact: true })).toHaveCount(0);
});

test('empty order navigation stays on the order page and links to the menu', async ({ page }) => {
	await mockApi(page);
	await page.goto('/');
	await page.getByRole('link', { name: 'Order', exact: true }).click();
	await expect(page).toHaveURL('/order');
	await expect(page.getByRole('heading', { name: 'Your order', exact: true })).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Your order is empty', exact: true }),
	).toBeVisible();
	await expect(page.getByRole('heading', { name: /Your pizza party/ })).toHaveCount(0);
	await page.reload();
	await expect(page).toHaveURL('/order');
	await expect(
		page.getByRole('heading', { name: 'Your order is empty', exact: true }),
	).toBeVisible();
	await page.getByRole('link', { name: 'Browse the menu', exact: true }).click();
	await expect(page).toHaveURL('/menu');
	await expect(page.getByRole('heading', { name: 'Margherita', exact: true })).toBeVisible();
	await page.getByRole('link', { name: 'Your order, 0 items', exact: true }).click();
	await expect(page).toHaveURL('/order');
	await expect(
		page.getByRole('heading', { name: 'Your order is empty', exact: true }),
	).toBeVisible();
});

test('seeded beverages display local photos and can be added to the order', async ({ page }) => {
	await mockApi(page);
	const drinks = [
		{ productSku: 'BEV-COLA', name: 'Cola', price: 2.5 },
		{ productSku: 'BEV-WATER', name: 'Still Water', price: 1.5 },
		{ productSku: 'BEV-ORANGE-JUICE', name: 'Orange Juice', price: 3 },
	].map(({ price, ...item }) => ({
		...item,
		description: 'Cold beverage',
		categoryName: 'Beverages',
		allergens: [],
		directPrice: { amount: price, currency: 'EUR' },
		isPredefinedPizza: false,
		isAvailable: true,
	}));
	await page.route('**/api/catalogue', (route) =>
		route.fulfill({ json: [pizza, knots, ...drinks] }),
	);
	await page.goto('/menu');
	await page.getByRole('button', { name: 'Beverages', exact: true }).click();
	for (const drink of drinks) {
		const image = page.getByRole('img', { name: drink.name, exact: true });
		await expect(image).toBeVisible();
		await expect
			.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
			.toBeGreaterThan(0);
	}
	await page.getByRole('button', { name: 'Add Cola to order', exact: true }).click();
	await page.getByRole('link', { name: 'Order', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Cola', exact: true })).toBeVisible();
	await expect(page.getByRole('img', { name: 'Cola', exact: true })).toBeVisible();
	await expect(page.getByText('€2.50', { exact: true }).first()).toBeVisible();
});

test('menu has loading, failure, retry, unavailable and empty-search states', async ({ page }) => {
	await mockApi(page);
	let calls = 0;
	let release!: () => void;
	const pending = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/api/catalogue', async (route) => {
		calls++;
		if (calls === 1) {
			await pending;
			return route.fulfill({
				status: 503,
				json: { error: { message: 'Kitchen menu service is offline' } },
			});
		}
		return route.fulfill({ json: catalogue });
	});
	await page.goto('/menu');
	await expect(page.getByRole('status', { name: 'Loading menu', exact: true })).toBeVisible();
	release();
	await expect(page.getByRole('alert')).toContainText('Kitchen menu service is offline');
	await page.getByRole('button', { name: 'Try again', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Margherita', exact: true })).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Add Water to order', exact: true }),
	).toBeDisabled();
	await page.getByRole('checkbox', { name: 'Available only', exact: true }).check();
	await expect(page.getByRole('heading', { name: 'Water', exact: true })).toHaveCount(0);
	await page.getByRole('searchbox', { name: 'Search menu', exact: true }).fill('nothing matches');
	await expect(
		page.getByRole('heading', { name: 'No matches on the menu.', exact: true }),
	).toBeVisible();
});

test('pizza customization uses size configurations, quantities, cardinality and persists a draft', async ({
	page,
}) => {
	await mockApi(page);
	await page.goto('/menu');
	await page.getByRole('button', { name: 'Customize Margherita', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Margherita', exact: true });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('radio', { name: /Large/ }).check();
	await dialog.getByRole('button', { name: 'Increase Mozzarella', exact: true }).click();
	await expect(dialog.getByRole('button', { name: /Add to order/ })).toContainText('23.00');
	await dialog.getByRole('button', { name: 'Decrease Tomato sauce', exact: true }).click();
	await expect(dialog.getByRole('button', { name: /Add to order/ })).toBeDisabled();
	await dialog.getByRole('button', { name: 'Increase Tomato sauce', exact: true }).click();
	await dialog.getByRole('button', { name: /Add to order/ }).click();
	await expect(dialog).not.toBeVisible();
	await page.getByRole('link', { name: 'Order', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Margherita', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Check out', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Increase Margherita quantity', exact: true }).click();
	await expect(page.getByText('€46.00', { exact: true }).first()).toBeVisible();
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Margherita', exact: true })).toBeVisible();
	await expect(
		page.getByRole('group', { name: 'Margherita quantity', exact: true }).getByRole('status'),
	).toHaveText('2');
});

test('fixed products can change quantity and be removed back to the empty-order page', async ({
	page,
}) => {
	await mockApi(page);
	await page.goto('/menu');
	await page.getByRole('button', { name: 'Customize Garlic Knots', exact: true }).click();
	await page.getByRole('button', { name: 'Increase Garlic Knots quantity', exact: true }).click();
	await page
		.getByRole('dialog')
		.getByRole('button', { name: /Add to order/ })
		.click();
	await page.getByRole('link', { name: 'Order', exact: true }).click();
	await expect(page.getByText('€16.00', { exact: true }).first()).toBeVisible();
	await page.getByRole('button', { name: 'Remove Garlic Knots', exact: true }).click();
	await expect(page).toHaveURL('/order');
	await expect(
		page.getByRole('heading', { name: 'Your order is empty', exact: true }),
	).toBeVisible();
});

test('account loads database contacts without an update or a browser contact cache', async ({
	page,
}) => {
	const requests = await mockApi(page);
	const storedAddress = {
		street: 'Rua Guardada 42',
		postalCode: '4000-042',
		city: 'Porto',
		extraDetails: 'Floor 3',
	};
	let reads = 0;
	await page.route('**/api/user/me/contact-details', (route) => {
		reads++;
		return route.fulfill({
			json: { ...customer, address: storedAddress, phoneNumber: '+351923456789' },
		});
	});
	await login(page);
	await expect(page.getByText('Rua Guardada 42', { exact: false })).toBeVisible();
	await expect(page.getByText('+351923456789', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Edit address', exact: true }).click();
	await expect(page.getByLabel('Street address', { exact: true })).toHaveValue('Rua Guardada 42');
	await page.getByRole('button', { name: 'Cancel', exact: true }).click();
	await page.evaluate(() => sessionStorage.removeItem('laprizza-contact:jamie_l'));
	await page.reload();
	await expect(page.getByText('Rua Guardada 42', { exact: false })).toBeVisible();
	expect(reads).toBe(2);
	expect(requests.some((request) => request.method === 'PUT')).toBeFalsy();
});

test('the authoritative contact read replaces stale cached values, including absent fields', async ({
	page,
}) => {
	await mockApi(page);
	await page.addInitScript(() =>
		sessionStorage.setItem(
			'laprizza-contact:jamie_l',
			JSON.stringify({
				address: { street: 'Outdated cached address', city: 'Old city', postalCode: '0000-000' },
				phoneNumber: '+351900000000',
			}),
		),
	);
	await login(page);
	await expect(
		page.getByText('No saved address. Add your delivery details.', { exact: true }),
	).toBeVisible();
	await expect(page.getByText('Outdated cached address', { exact: false })).toHaveCount(0);
	await expect(page.getByText('+351900000000', { exact: true })).toHaveCount(0);
});

test('customer login, address and phone editors send supported requests and preserve confirmations', async ({
	page,
}) => {
	const requests = await mockApi(page);
	await login(page);
	await page.getByRole('button', { name: 'Edit address', exact: true }).click();
	await page.getByLabel('Street address', { exact: true }).fill('Rua das Flores 10');
	await page.getByLabel('City', { exact: true }).fill('Porto');
	await page.getByLabel('Postal code', { exact: true }).fill('4000-001');
	await page.getByRole('button', { name: 'Save address', exact: true }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.getByText('Rua das Flores 10', { exact: false })).toBeVisible();
	expect(requests.find((r) => r.path === '/api/user/me/address')?.authorization).toBe(
		`Bearer ${token}`,
	);
	await page.getByRole('button', { name: 'Edit phone', exact: true }).click();
	await page.getByRole('dialog').getByLabel('Phone number', { exact: true }).fill('+351912345678');
	await page.getByRole('button', { name: 'Save phone number', exact: true }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.getByText('+351912345678', { exact: true })).toBeVisible();
	await page.reload();
	await expect(page.getByText('Rua das Flores 10', { exact: false })).toBeVisible();
});

test('allergy editor adds new allergens and locks saved selections', async ({ page }) => {
	const requests = await mockApi(page);
	await login(page);
	await expect(page.getByText('Milk', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Edit allergies', exact: true }).click();
	await expect(
		page.getByRole('dialog').getByRole('button', { name: 'Milk (already saved)', exact: true }),
	).toBeDisabled();
	await page.getByRole('dialog').getByRole('button', { name: 'Eggs', exact: true }).click();
	await page.getByRole('button', { name: 'Save allergies', exact: true }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.getByText('Eggs', { exact: true })).toBeVisible();
	expect(requests.find((r) => r.path.endsWith('/allergen'))?.body).toEqual({
		allergens: ['Eggs'],
	});
});

test('two-step registration validates matching passwords and updates the optional phone', async ({
	page,
}) => {
	const requests = await mockApi(page);
	await page.goto('/register');
	await page.getByLabel('First name', { exact: true }).fill('Jamie');
	await page.getByLabel('Last name', { exact: true }).fill('Wilson');
	await page.getByLabel('Email', { exact: true }).fill(customer.email);
	await page.getByLabel('Phone number (optional)', { exact: false }).fill('+351912345678');
	await page.getByRole('button', { name: 'Next step', exact: true }).click();
	await page.getByLabel('Password', { exact: true }).fill('StrongPassword1!');
	await page.getByLabel('Confirm password', { exact: true }).fill('DifferentPassword1!');
	await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeDisabled();
	await page.getByLabel('Confirm password', { exact: true }).fill('StrongPassword1!');
	await page.getByRole('button', { name: 'Register', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Jamie Wilson', exact: true })).toBeVisible();
	expect(requests.find((r) => r.path === '/api/auth/register')?.body).toEqual({
		firstName: 'Jamie',
		lastName: 'Wilson',
		email: customer.email,
		password: 'StrongPassword1!',
	});
	expect(requests.some((r) => r.path === '/api/user/me/phone-number')).toBeTruthy();
});

test('unsupported credential actions never send a fabricated endpoint and auth guards preserve return paths', async ({
	page,
}) => {
	const requests = await mockApi(page);
	await page.goto('/account');
	await expect(page).toHaveURL(/\/login\?returnUrl=/);
	await login(page);
	await page.getByRole('button', { name: 'Change password', exact: true }).click();
	await expect(
		page.getByRole('dialog').getByText('Password changes are not available yet.', { exact: false }),
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
	await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
	await page.getByRole('button', { name: 'Change email', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
	expect(requests.some((r) => /password|change-email/.test(r.path))).toBeFalsy();
});

for (const width of [390, 768, 1440]) {
	test(`customer pages and dialogs fit ${width}px screens`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await mockApi(page);
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));
		for (const path of ['/', '/menu', '/order', '/login', '/register']) {
			await page.goto(path);
			await expect(page.locator('h1')).toBeVisible();
			if (path === '/') {
				await expect
					.poll(() =>
						page
							.locator('img')
							.first()
							.evaluate((image) => (image as HTMLImageElement).naturalWidth),
					)
					.toBeGreaterThan(0);
			}
			if (path === '/menu')
				await expect(page.getByRole('heading', { name: 'Margherita', exact: true })).toBeVisible();
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
			).toBeTruthy();
			if (['/', '/menu', '/login'].includes(path))
				await page.screenshot({
					path: testInfo.outputPath(`${path.slice(1) || 'home'}.png`),
					fullPage: true,
				});
		}
		await login(page);
		await page.screenshot({ path: testInfo.outputPath('account.png'), fullPage: true });
		await page.getByRole('button', { name: 'Edit address', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Save address', exact: true })).toBeInViewport();
		let bounds = await page.getByRole('dialog').boundingBox();
		expect(bounds!.x).toBeGreaterThanOrEqual(0);
		expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
		await page.keyboard.press('Escape');
		await page.getByRole('link', { name: 'Menu', exact: true }).click();
		await page.getByRole('button', { name: 'Customize Margherita', exact: true }).click();
		await expect(page.getByRole('dialog').getByRole('radio', { name: /Small/ })).toBeVisible();
		await page.screenshot({ path: testInfo.outputPath('customize.png'), fullPage: true });
		await expect(
			page.getByRole('dialog').getByRole('button', { name: /Add to order/ }),
		).toBeInViewport();
		await page
			.getByRole('dialog')
			.getByRole('button', { name: /Add to order/ })
			.click();
		await page.getByRole('link', { name: 'Order', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Order summary', exact: true })).toBeVisible();
		await page.screenshot({ path: testInfo.outputPath('order-summary.png'), fullPage: true });
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
		).toBeTruthy();
		expect(errors).toEqual([]);
	});
}

test('logout waits for server revocation before clearing credentials and leaving the account', async ({
	page,
}) => {
	await mockApi(page);
	await login(page);
	let release!: () => void;
	const pending = new Promise<void>((resolve) => {
		release = resolve;
	});
	let received!: () => void;
	const requested = new Promise<void>((resolve) => {
		received = resolve;
	});
	await page.route('**/api/auth/logout', async (route) => {
		expect(route.request().method()).toBe('POST');
		expect(route.request().headers()['authorization']).toBe(`Bearer ${token}`);
		received();
		await pending;
		await route.fulfill({ status: 204 });
	});
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await requested;
	await expect(page).toHaveURL('/account');
	expect(await page.evaluate(() => sessionStorage.getItem('forno-session'))).not.toBeNull();
	await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeDisabled();
	release();
	await expect(page).toHaveURL('/');
	expect(await page.evaluate(() => sessionStorage.getItem('forno-session'))).toBeNull();
});

test('failed logout keeps the account available for retry and never reports success', async ({
	page,
}) => {
	await mockApi(page);
	await login(page);
	await page.route('**/api/auth/logout', (route) =>
		route.fulfill({ status: 503, json: { error: { message: 'Unavailable' } } }),
	);
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Sign out could not be completed');
	await expect(page).toHaveURL('/account');
	expect(await page.evaluate(() => sessionStorage.getItem('forno-session'))).not.toBeNull();
	await page.route('**/api/auth/logout', (route) => route.fulfill({ status: 204 }));
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(page).toHaveURL('/');
});

test('logout clears an already rejected credential without retrying recursively', async ({
	page,
}) => {
	await mockApi(page);
	await login(page);
	let attempts = 0;
	await page.route('**/api/auth/logout', (route) => {
		attempts++;
		return route.fulfill({
			status: 401,
			json: { error: { message: 'Invalid or ended session.' } },
		});
	});
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(page).toHaveURL('/');
	expect(attempts).toBe(1);
	expect(await page.evaluate(() => sessionStorage.getItem('forno-session'))).toBeNull();
});
