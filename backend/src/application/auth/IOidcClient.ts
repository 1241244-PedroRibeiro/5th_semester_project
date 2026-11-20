export interface IdTokenClaims {
	sub: string;
	email: string;
	email_verified: boolean;
	given_name?: string;
	family_name?: string;
}

export interface IOidcClient {
	generateAuthUrl(state: string, codeChallenge: string, nonce: string): Promise<string>;
	exchangeCode(code: string, codeVerifier: string, state: string): Promise<IdTokenClaims>;
}
export const OIDC_CLIENT = Symbol('OIDC_CLIENT');