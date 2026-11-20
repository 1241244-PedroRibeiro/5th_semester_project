export const PASSWORD_RECOVERY_STORE = Symbol('PASSWORD_RECOVERY_STORE');
export const RECOVERY_USABLE_MS = 5 * 60 * 1000;
export const RECOVERY_COOLDOWN_MS = 30 * 60 * 1000;

export type IssueRecoveryResult = { status: 'SENT' | 'ACCOUNT_UNAVAILABLE' } | { status: 'COOLDOWN'; retryAfterSeconds: number };
export type ConsumeRecoveryResult = 'UPDATED' | 'INVALID' | 'USED' | 'EXPIRED' | 'ACCOUNT_UNAVAILABLE';

/** Utility persistence, independent of domain aggregates. Callbacks run inside the locked transaction. */
export interface IPasswordRecoveryStore {
	issue(email: string, codeHash: string, deliver: (recipient: string) => Promise<void>): Promise<IssueRecoveryResult>;
	consume(codeHash: string, hashPassword: () => Promise<string>): Promise<ConsumeRecoveryResult>;
}

export const RECOVERY_MAILER = Symbol('RECOVERY_MAILER');
export interface IRecoveryMailer { sendRecoveryCode(recipient: string, code: string): Promise<void>; }
