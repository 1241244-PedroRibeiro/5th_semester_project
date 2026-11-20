import type { Express } from 'express';
import { isIP } from 'node:net';

/** Trust explicit proxy IPs/CIDRs only; never a hop count or arbitrary headers. */
export function configureTrustedProxy(app: Express, value = process.env.TRUSTED_PROXY_CIDRS): void {
	const entries = (value ?? '').split(',').map(entry => entry.trim()).filter(Boolean);
	for (const entry of entries) {
		const [address, prefix, extra] = entry.split('/');
		const family = isIP(address);
		if (!family || extra !== undefined || (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > (family === 4 ? 32 : 128))))
			throw new Error('TRUSTED_PROXY_CIDRS must contain explicit proxy IP addresses or CIDRs (excluding /0).');
	}
	app.set('trust proxy', entries.length ? entries : false);
}
