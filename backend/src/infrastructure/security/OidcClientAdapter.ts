import { Injectable, Logger } from '@nestjs/common';
import { IOidcClient, IdTokenClaims } from '../../application/auth/IOidcClient';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class OidcClientAdapter implements IOidcClient {
	private readonly logger = new Logger(OidcClientAdapter.name);
	private issuer: any;

	private async getIssuer() {
		if (this.issuer) return this.issuer;
		const { Issuer } = await import('openid-client');
		this.issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL!);
		return this.issuer;
	}

	async generateAuthUrl(state: string, codeChallenge: string, nonce: string): Promise<string> {
		const issuer = await this.getIssuer();
		const client = new issuer.Client({
			client_id: process.env.OIDC_CLIENT_ID!,
			client_secret: process.env.OIDC_CLIENT_SECRET!,
			redirect_uris: [process.env.OIDC_REDIRECT_URI!],
			response_types: ['code'],
		});

		const url = client.authorizationUrl({
			scope: process.env.OIDC_SCOPES || 'openid email profile',
			state,
			nonce,
			code_challenge: codeChallenge,
			code_challenge_method: 'S256',
		});
		return url.replace('host.docker.internal', 'localhost');
	}

	async exchangeCode(code: string, codeVerifier: string, state: string): Promise<IdTokenClaims> {
		const issuer = await this.getIssuer();
		const tokenEndpoint = issuer.token_endpoint;

		const body = new URLSearchParams({
			grant_type: 'authorization_code',
			code: code,
			redirect_uri: process.env.OIDC_REDIRECT_URI!,
			client_id: process.env.OIDC_CLIENT_ID!,
			client_secret: process.env.OIDC_CLIENT_SECRET!,
			code_verifier: codeVerifier,
		});

		try {
			const response = await fetch(tokenEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: body.toString(),
			});

			const data: any = await response.json();

			this.logger.debug('Resposta crua do Keycloak (Token): ' + JSON.stringify(data, null, 2));

			if (!response.ok) {
				throw new Error('Keycloak devolveu erro ' + response.status + ': ' + JSON.stringify(data));
			}

			if (!data.id_token) {
				throw new Error('id_token nao presente na resposta do Keycloak');
			}

			const claims = jwt.decode(data.id_token) as any;
			this.logger.debug('Claims extraidas do id_token: ' + JSON.stringify(claims, null, 2));

			return {
				sub: claims.sub,
				email: claims.email,
				email_verified: claims.email_verified === true,
				given_name: claims.given_name,
				family_name: claims.family_name,
			};
		} catch (err: any) {
			this.logger.error('Erro na troca de codigo (Keycloak):', err);
			throw err;
		}
	}
}
