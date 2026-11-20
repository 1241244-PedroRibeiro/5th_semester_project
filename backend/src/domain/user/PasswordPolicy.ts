/** Shared registration/change policy; passwords are never trimmed or normalized. */
export function isValidPassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 8 && /[A-Z]/.test(password)
		&& /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9\s]/.test(password);
}
