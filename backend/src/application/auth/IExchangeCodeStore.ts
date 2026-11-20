export interface ExchangeCodeEntry {
	username: string;
	expiresAt: Date;
}
export interface IExchangeCodeStore {
	put(code: string, entry: ExchangeCodeEntry): Promise<void>;
	consume(code: string): Promise<ExchangeCodeEntry | null>;
}
export const EXCHANGE_CODE_STORE = Symbol('EXCHANGE_CODE_STORE');