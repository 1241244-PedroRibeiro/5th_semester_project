import { Injectable } from '@nestjs/common';
import { IExchangeCodeStore, ExchangeCodeEntry } from '../../../application/auth/IExchangeCodeStore';

@Injectable()
export class InMemoryExchangeCodeStore implements IExchangeCodeStore {
	private codes = new Map<string, ExchangeCodeEntry>();

	constructor() {
		setInterval(() => {
			const now = new Date();
			for (const [code, entry] of this.codes.entries()) {
				if (entry.expiresAt < now) this.codes.delete(code);
			}
		}, 60000).unref();
	}

	async put(code: string, entry: ExchangeCodeEntry): Promise<void> {
		this.codes.set(code, entry);
	}

	async consume(code: string): Promise<ExchangeCodeEntry | null> {
		const entry = this.codes.get(code);
		if (!entry) return null;
		this.codes.delete(code); // Single use
		if (entry.expiresAt < new Date()) return null;
		return entry;
	}
}