import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { IInvitationMailer } from '../../application/auth/IInvitationMailer';

@Injectable()
export class SmtpInvitationMailer implements IInvitationMailer {
	private readonly logger = new Logger(SmtpInvitationMailer.name);
	constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

	async sendInvitation(email: string, role: string, token = '', purpose = 'LOCAL_ACCOUNT_ACTIVATION'): Promise<void> {
		const host = this.config.get<string>('SMTP_HOST');
		const user = this.config.get<string>('SMTP_USER');
		const pass = this.config.get<string>('SMTP_PASSWORD');
		const port = Number(this.config.get<string>('SMTP_PORT') || 587);
		if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535)
			throw new ServiceUnavailableException('Invitation email is not configured. Please contact the restaurant.');
		const transporter = nodemailer.createTransport({ host, port, secure: port === 465, requireTLS: port !== 465,
			auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
			disableFileAccess: true, disableUrlAccess: true });
		try {
			const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:4200';
			const activationPath = purpose === 'EXTERNAL_IDP_MATCH' ? '/auth/activate-external' : '/auth/activate';
			const activationUrl = `${frontendUrl}${activationPath}?token=${encodeURIComponent(token)}`;
			const html = `
				<div style="margin:0;background:#f8f5ef;padding:40px 20px;font-family:Arial,sans-serif;color:#123b4a">
					<div style="margin:0 auto;max-width:600px;background:#fffdf9;border:1px solid #e5dfd5;border-radius:16px;overflow:hidden">
						<div style="background:#123b4a;padding:28px 36px">
							<div style="font-size:24px;font-weight:700;color:#fffdf9;letter-spacing:.02em">La<span style="color:#f15a29">Prizza</span></div>
							<div style="margin-top:8px;color:#d9ebe9;font-size:13px">Good food. Smooth operations.</div>
						</div>
						<div style="padding:36px">
							<div style="color:#f15a29;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Secure account activation</div>
							<h1 style="margin:12px 0 18px;font-size:30px;line-height:1.15;color:#123b4a">You are invited to LaPrizza</h1>
							<p style="font-size:16px;line-height:1.6">You have been invited to join the LaPrizza team as <strong>${role}</strong>.</p>
							<p style="font-size:16px;line-height:1.6">Activate your account and choose your own password. Your password is never included in an invitation email.</p>
							<p style="margin:28px 0;text-align:center"><a href="${activationUrl}" style="display:inline-block;background:#f15a29;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:16px;font-weight:700">Activate my account</a></p>
							<p style="font-size:13px;line-height:1.6;color:#687b82">If the button does not work, copy and paste this address into your browser:</p>
							<p style="font-size:12px;line-height:1.5;word-break:break-all;color:#687b82">${activationUrl}</p>
							<div style="margin-top:28px;padding:16px;background:#e6f2ef;border-radius:8px;color:#416d70;font-size:13px;line-height:1.5">This invitation expires according to the invitation policy. A new invitation replaces any previous one for this account.</div>
						</div>
						<div style="padding:20px 36px;border-top:1px solid #e5dfd5;color:#687b82;font-size:12px">LaPrizza · Made for the people behind the pizza.</div>
					</div>
				</div>`;
			const result = await transporter.sendMail({
				from: '"LaPrizza" <laprizzag05@gmail.com>', to: email,
				subject: 'You are invited to LaPrizza',
				text: `You have been invited to LaPrizza with the role ${role}. Activate your account and choose your password here: ${activationUrl}. If the link is unavailable, open the LaPrizza application and choose the normal Register button. This link expires according to the invitation policy. If you received a previous invitation, this role replaces the previous role.`,
				html,
			});
			if (!result.accepted?.length) throw new Error('Recipient not accepted');
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			this.logger.error(`Invitation email submission failed: ${detail}`);
			throw new ServiceUnavailableException('Invitation email could not be sent. The invitation is saved; please retry.');
		} finally { transporter.close(); }
	}
}
