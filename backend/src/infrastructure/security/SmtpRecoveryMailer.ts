import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { IRecoveryMailer } from '../../application/auth/IPasswordRecoveryStore';

@Injectable()
export class SmtpRecoveryMailer implements IRecoveryMailer {
	private readonly logger = new Logger(SmtpRecoveryMailer.name);
	constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

	async sendRecoveryCode(recipient: string, code: string): Promise<void> {
		const host = this.config.get<string>('SMTP_HOST');
		const user = this.config.get<string>('SMTP_USER');
		const pass = this.config.get<string>('SMTP_PASSWORD');
		const port = Number(this.config.get<string>('SMTP_PORT') || 587);
		if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535)
			throw new ServiceUnavailableException('Recovery email is not configured. Please contact the restaurant.');
		const transporter = nodemailer.createTransport({ host, port, secure: port === 465, requireTLS: port !== 465,
			auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
			disableFileAccess: true, disableUrlAccess: true });
		try {
			const result = await transporter.sendMail({
				from: '"LaPrizza" <laprizzag05@gmail.com>', to: recipient,
				subject: 'LaPrizza password recovery code',
				text: `Your LaPrizza password recovery code is:

${code}

It is valid for 5 minutes and can be used once. You may request another code 30 minutes after this request. If you did not request it, ignore this email.`,
				html: `<p>Your LaPrizza password recovery code is:</p><p><code>${code}</code></p><p>It is valid for <strong>5 minutes</strong> and can be used once. You may request another code 30 minutes after this request.</p><p>If you did not request it, ignore this email.</p>`,
			});
			if (!result.accepted?.length) throw new Error('Recipient not accepted');
		} catch {
			this.logger.error('Password recovery email submission failed.');
			throw new ServiceUnavailableException('Recovery email could not be sent. Please try again later.');
		} finally { transporter.close(); }
	}
}
