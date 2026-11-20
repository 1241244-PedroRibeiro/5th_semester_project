import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SmtpRecoveryMailer } from '../../src/infrastructure/security/SmtpRecoveryMailer';
import { createSmtpSink } from '../helpers/smtp-sink';

describe('Recovery SMTP email delivery', () => {
	afterEach(() => jest.restoreAllMocks());
	it('submits the sender, recipient, code, and expiry text to a local SMTP server', async () => {
		const sink = await createSmtpSink();
		const realCreateTransport = nodemailer.createTransport.bind(nodemailer);
		const observed: SMTPTransport.Options[] = [];
		// Production still requires TLS. Only this local fake SMTP transport skips the TLS upgrade.
		jest.spyOn(nodemailer, 'createTransport').mockImplementation((options: unknown) => {
			observed.push(options as SMTPTransport.Options);
			return realCreateTransport({ ...(options as SMTPTransport.Options), requireTLS: false, ignoreTLS: true });
		});
		try {
			const mailer = new SmtpRecoveryMailer(new ConfigService({ SMTP_HOST: '127.0.0.1', SMTP_PORT: String(sink.port), SMTP_USER: 'test', SMTP_PASSWORD: 'test' }));
			const code = 'a'.repeat(64);
			await mailer.sendRecoveryCode('recovery@example.test', code);
			expect(sink.messages).toHaveLength(1);
			const message = sink.messages[0].replace(/=\r\n/g, '');
			expect(message).toContain('laprizzag05@gmail.com');
			expect(message).toContain('recovery@example.test');
			expect(message).toContain(code);
			expect(message).toContain('5 minutes');
			expect(message).toContain('30 minutes');
			expect(observed[0]).toMatchObject({ requireTLS: true, secure: false });
		} finally { await sink.close(); }
	});

	it('returns a configuration error without logging secrets when SMTP settings are missing', async () => {
		const config = { get: () => undefined } as unknown as ConfigService;
		await expect(new SmtpRecoveryMailer(config).sendRecoveryCode('recovery@example.test', 'a'.repeat(64)))
			.rejects.toMatchObject({ status: 503 });
	});
});
