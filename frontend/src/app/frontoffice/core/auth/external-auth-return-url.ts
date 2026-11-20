const EXTERNAL_AUTH_RETURN_URL = 'laprizza-external-auth-return-url';
const CUSTOMER_DESTINATIONS = new Set(['/account', '/order', '/menu', '/']);

export function safeCustomerReturnUrl(value: string | null | undefined): string {
	if (!value || value.startsWith('//')) return '/menu';
	const path = value.split(/[?#]/, 1)[0];
	return CUSTOMER_DESTINATIONS.has(path) ? value : '/menu';
}

export function rememberExternalAuthReturnUrl(value: string | null | undefined): void {
	try {
		sessionStorage.setItem(EXTERNAL_AUTH_RETURN_URL, safeCustomerReturnUrl(value));
	} catch {
		// The callback falls back to the storefront menu when tab storage is unavailable.
	}
}

export function takeExternalAuthReturnUrl(): string {
	try {
		const value = sessionStorage.getItem(EXTERNAL_AUTH_RETURN_URL);
		sessionStorage.removeItem(EXTERNAL_AUTH_RETURN_URL);
		return safeCustomerReturnUrl(value);
	} catch {
		return '/menu';
	}
}
