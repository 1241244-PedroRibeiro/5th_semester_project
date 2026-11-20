import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SmtpInvitationMailer } from '../../src/infrastructure/security/SmtpInvitationMailer';
import { createSmtpSink } from '../helpers/smtp-sink';

describe('Invitation email delivery', () => {
	afterEach(() => jest.restoreAllMocks());
	it('submits the invitation, role, sender and normal registration instructions to local SMTP', async () => {
		const sink = await createSmtpSink();
		const create = nodemailer.createTransport.bind(nodemailer);
		const observed: SMTPTransport.Options[] = [];
		jest.spyOn(nodemailer, 'createTransport').mockImplementation((options: unknown) => {
			observed.push(options as SMTPTransport.Options);
			return create({ ...(options as SMTPTransport.Options), requireTLS: false, ignoreTLS: true });
		});
		try {
			const settings: Record<string, string> = { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(sink.port), SMTP_USER: 'test', SMTP_PASSWORD: 'test' };
			const config = { get: (key: string) => settings[key] } as unknown as ConfigService;
			await new SmtpInvitationMailer(config).sendInvitation('invited@example.test', 'MANAGER');
			expect(sink.messages).toHaveLength(1);
			const message = sink.messages[0].replace(/=\r\n/g, '');
			for (const text of ['laprizzag05@gmail.com', 'invited@example.test', 'MANAGER', 'Register button', 'previous role'])
				expect(message).toContain(text);
			expect(observed[0]).toMatchObject({ secure: false, requireTLS: true });
		} finally { await sink.close(); }
	});

	it('returns 503 for absent configuration', async () => {
		const config = { get: () => undefined } as unknown as ConfigService;
		await expect(new SmtpInvitationMailer(config).sendInvitation('invited@example.test', 'EMPLOYEE'))
			.rejects.toMatchObject({ status: 503 });
	});

	it('returns 503 when SMTP rejects the recipient and closes the transport', async () => {
		const close = jest.fn();
		jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail: async () => ({ accepted: [] }), close } as unknown as ReturnType<typeof nodemailer.createTransport>);
		const config = { get: (key: string) => ({ SMTP_HOST: 'localhost', SMTP_USER: 'test', SMTP_PASSWORD: 'test', SMTP_PORT: '587' } as Record<string, string>)[key] } as unknown as ConfigService;
		await expect(new SmtpInvitationMailer(config).sendInvitation('invited@example.test', 'EMPLOYEE'))
			.rejects.toMatchObject({ status: 503 });
		expect(close).toHaveBeenCalled();
	});
});
