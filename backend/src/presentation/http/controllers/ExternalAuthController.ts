import { Controller, Get, Post, Query, Res, Req, Inject, UnauthorizedException, Body, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import { Public } from '../middlewares/decorators';
import { ExternalAuthService } from '../../../application/auth/ExternalAuthService';
import { IOidcClient, OIDC_CLIENT } from '../../../application/auth/IOidcClient';
import { randomBytes, createHash } from 'node:crypto';
import * as jwt from 'jsonwebtoken';

@Controller('auth/external')
export class ExternalAuthController {
	private readonly logger = new Logger(ExternalAuthController.name);

	constructor(
		@Inject(ExternalAuthService) private readonly externalAuth: ExternalAuthService,
		@Inject(OIDC_CLIENT) private readonly oidc: IOidcClient,
	) {}

	@Public()
	@Get('login')
	async login(@Query('invitationToken') invitationToken: string, @Res() res: Response) {
		const state = randomBytes(16).toString('hex');
		const nonce = randomBytes(16).toString('hex');
		const codeVerifier = randomBytes(32).toString('base64url');
		const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

		const payload = { state, nonce, codeVerifier, invitationToken: invitationToken || undefined };
		const secret = process.env.OIDC_SESSION_COOKIE_SECRET || process.env.JWT_SECRET || 'fallback-secret';
		const cookieValue = jwt.sign(payload, secret, { expiresIn: '5m' });

		// CORREÇÃO: path alterado para '/'
		res.cookie('oidc_ctx', cookieValue, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: 5 * 60 * 1000
		});

		try {
			const url = await this.oidc.generateAuthUrl(state, codeChallenge, nonce);
			return res.redirect(url);
		} catch (err: any) {
			this.logger.error('Falha ao gerar a URL do IdP', err);
			const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
			return res.redirect(`${frontendUrl}/auth/callback?error=idp_error`);
		}
	}

	@Public()
	@Get('callback')
	async callback(
		@Query('code') code: string, 
		@Query('error') error: string, 
		@Query('state') state: string,
		@Req() req: Request, 
		@Res() res: Response
	) {
		const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
		const cookie = req.cookies?.['oidc_ctx'];
		const secret = process.env.OIDC_SESSION_COOKIE_SECRET || process.env.JWT_SECRET || 'fallback-secret';
		
		// CORREÇÃO: path alterado para '/'
		res.clearCookie('oidc_ctx', { path: '/' });

		if (error) return res.redirect(`${frontendUrl}/auth/callback?error=cancelled`);
		if (!code || !cookie) {
			this.logger.warn('Callback chamado sem code ou sem cookie oidc_ctx');
			return res.redirect(`${frontendUrl}/auth/callback?error=invalid_request`);
		}

		let payload: any;
		try {
			payload = jwt.verify(cookie, secret);
		} catch (err) {
			this.logger.warn('Falha ao verificar o cookie oidc_ctx (pode ter expirado)');
			return res.redirect(`${frontendUrl}/auth/callback?error=invalid_state`);
		}

		try {
			const claims = await this.oidc.exchangeCode(code, payload.codeVerifier, state);
			
			const user = payload.invitationToken
				? await this.externalAuth.resolveActivation(payload.invitationToken, claims.sub, claims.email, claims.email_verified)
				: await this.externalAuth.resolveUser(claims.sub, claims.email, claims.email_verified);
			const exchangeCode = await this.externalAuth.generateExchangeCode(user.username.value);
			
			return res.redirect(`${frontendUrl}/auth/callback?exchange_code=${exchangeCode}`);

		} catch (err: any) {
			this.logger.error('ERRO NO CALLBACK OIDC:', err);

			if (err.message === 'account_linking_required')
				return res.redirect(`${frontendUrl}/auth/callback?error=account_linking_required`);
			if (err.message === 'invitation_identity_mismatch')
				return res.redirect(`${frontendUrl}/auth/callback?error=invitation_identity_mismatch`);
			if (err.message === 'idp_subject_mismatch')
				return res.redirect(`${frontendUrl}/auth/callback?error=idp_subject_mismatch`);
			if (err.status === 404 || err.status === 410)
				return res.redirect(`${frontendUrl}/auth/callback?error=invitation_invalid`);
			if (err.status === 403)
				return res.redirect(`${frontendUrl}/auth/callback?error=account_inactive`);
			
			return res.redirect(`${frontendUrl}/auth/callback?error=idp_error`);
		}
	}

	@Public()
	@Post('exchange')
	async exchange(@Body('code') code: string) {
		if (!code) throw new UnauthorizedException('Exchange code required.');
		return this.externalAuth.exchangeCode(code);
	}
}