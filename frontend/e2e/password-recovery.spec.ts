import { expect, test, type Page } from '@playwright/test';

const code = 'a'.repeat(64);
const password = 'RecoveredPassword2!';
const email = 'recovery@example.test';
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;

async function openRecovery(page: Page, staff: boolean) {
	await page.goto(staff ? '/backoffice/login' : '/login');
	await page.getByRole('button', { name: 'Forgot your password?', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Recover your password.', exact: true }),
	).toBeVisible();
}
async function fillReset(page: Page) {
	await page.getByLabel('Recovery code', { exact: true }).fill(code);
	await page.getByLabel('New password', { exact: true }).fill(password);
	await page.getByLabel('Confirm new password', { exact: true }).fill(password);
}

for (const staff of [false, true]) {
	const office = staff ? 'staff' : 'customer';
	for (const width of [320, 390, 1440]) {
		test(`${office} recovery sends email, consumes a code, and returns to sign-in at ${width}px`, async ({
			page,
		}, testInfo) => {
			await page.setViewportSize({ width, height: 1000 });
			const requests: { path: string; body: unknown; authorization?: string }[] = [];
			await page.route('**/api/password-recovery**', (route) => {
				const path = new URL(route.request().url()).pathname;
				requests.push({
					path,
					body: route.request().postDataJSON(),
					authorization: route.request().headers()['authorization'],
				});
				return route.fulfill({
					json: {
						message: path.endsWith('new_pass')
							? 'Password updated successfully. Sign in with your new password.'
							: 'Recovery code sent. Check your email; the code is valid for 5 minutes.',
					},
				});
			});
			await openRecovery(page, staff);
			await page.getByLabel('Email address', { exact: true }).fill(email);
			await page.getByRole('button', { name: 'Send recovery code', exact: true }).click();
			await expect(page.getByLabel('Recovery code', { exact: true })).toBeVisible();
			await fillReset(page);
			await page.getByLabel('Confirm new password', { exact: true }).fill('Mismatch');
			await expect(
				page.getByRole('button', { name: 'Update password', exact: true }),
			).toBeDisabled();
			await expect(page.getByText('Passwords do not match.', { exact: true })).toBeVisible();
			await page.getByLabel('Confirm new password', { exact: true }).fill(password);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true,
			);
			await page.screenshot({ path: testInfo.outputPath('recovery-form.png'), fullPage: true });
			await page.getByRole('button', { name: 'Update password', exact: true }).click();
			await expect(
				page.getByRole('heading', { name: 'Your password is updated.', exact: true }),
			).toBeVisible();
			expect(requests).toEqual([
				{ path: '/api/password-recovery', body: { email }, authorization: undefined },
				{
					path: '/api/password-recovery/new_pass',
					body: { recovery_code: code, new_password: password },
					authorization: undefined,
				},
			]);
			const storage = await page.evaluate(() =>
				JSON.stringify({ ...localStorage, ...sessionStorage }),
			);
			expect(storage).not.toContain(password);
			expect(storage).not.toContain(code);
			await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
			await expect(
				page.getByRole('button', { name: staff ? 'Sign in' : 'Login', exact: true }),
			).toBeVisible();
		});
	}

	for (const [status, message] of [
		[401, 'Invalid recovery code.'],
		[409, 'This recovery code has already been used.'],
		[410, 'This recovery code has expired.'],
	] as const) {
		test(`${office} reset ${status} stays inline and does not clear another stored session`, async ({
			page,
		}) => {
			await page.addInitScript(
				(token) =>
					sessionStorage.setItem(
						'forno-session',
						JSON.stringify({
							token,
							user: {
								username: 'existing',
								email: 'existing@example.test',
								firstName: 'Existing',
								lastName: 'User',
								status: 'ACTIVE',
								roles: ['CUSTOMER'],
							},
						}),
					),
				token,
			);
			await page.route('**/api/password-recovery/new_pass', (route) => {
				expect(route.request().headers()['authorization']).toBeUndefined();
				return route.fulfill({ status, json: { error: { message } } });
			});
			await openRecovery(page, staff);
			await page.getByRole('button', { name: 'I already have a code', exact: true }).click();
			await fillReset(page);
			await page.getByRole('button', { name: 'Update password', exact: true }).click();
			await expect(page.getByRole('alert')).toContainText(message);
			await expect(page).toHaveURL(staff ? '/backoffice/login' : '/login');
			expect(
				JSON.parse((await page.evaluate(() => sessionStorage.getItem('forno-session')))!).token,
			).toBe(token);
			await expect(
				page.getByRole('button', { name: 'Update password', exact: true }),
			).toBeEnabled();
		});
	}

	for (const [status, message] of [
		[
			429,
			'A recovery code was requested recently. Please wait 30 minute(s) before requesting another.',
		],
		[503, 'Recovery email could not be sent. Please try again later.'],
	] as const) {
		test(`${office} request ${status} explains the problem without claiming an email was sent`, async ({
			page,
		}) => {
			await page.route('**/api/password-recovery', (route) =>
				route.fulfill({ status, json: { error: { message } } }),
			);
			await openRecovery(page, staff);
			await page.getByLabel('Email address', { exact: true }).fill(email);
			await page.getByRole('button', { name: 'Send recovery code', exact: true }).click();
			await expect(page.getByRole('alert')).toHaveText(message);
			await expect(page.getByLabel('Recovery code', { exact: true })).toHaveCount(0);
			await expect(
				page.getByRole('button', { name: 'Send recovery code', exact: true }),
			).toBeEnabled();
		});
	}
}
