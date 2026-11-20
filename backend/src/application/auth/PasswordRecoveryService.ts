import { BadRequestException, ConflictException, GoneException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Email } from '../../domain/common/Email';
import { isValidPassword } from '../../domain/user/PasswordPolicy';
import { PASSWORD_HASHER } from './AuthDTOs';
import { IPasswordHasher } from './ISecurityServices';
import { IPasswordRecoveryStore, IRecoveryMailer, PASSWORD_RECOVERY_STORE, RECOVERY_MAILER } from './IPasswordRecoveryStore';

@Injectable()
export class PasswordRecoveryService {
	private readonly logger = new Logger(PasswordRecoveryService.name);
	private readonly genericRequestResponse = Object.freeze({
		message: 'If the account is eligible, recovery instructions will be sent.',
	});

	constructor(
		@Inject(PASSWORD_RECOVERY_STORE) private readonly store: IPasswordRecoveryStore,
		@Inject(RECOVERY_MAILER) private readonly mailer: IRecoveryMailer,
		@Inject(PASSWORD_HASHER) private readonly hasher: IPasswordHasher,
	) {}

	private input(body: unknown, fields: string[]): Record<string, unknown> {
		if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !fields.includes(key)))
			throw new BadRequestException('Invalid recovery request fields.');
		return body as Record<string, unknown>;
	}

	async requestCode(body: unknown): Promise<{ message: string }> {
		const input = this.input(body, ['email']);
		const email = Email.create(input.email as string);
		if (email.isFailure) throw new BadRequestException('Enter a valid email address.');
		const code = randomBytes(32).toString('hex');
		const codeHash = createHash('sha256').update(code).digest('hex');
		let deliveryFailed = false;
		try {
			await this.store.issue(email.getValue().address, codeHash, async recipient => {
				try {
					await this.mailer.sendRecoveryCode(recipient, code);
				} catch (error) {
					deliveryFailed = true;
					throw error;
				}
			});
		} catch (error) {
			if (!deliveryFailed) throw error;
			this.logger.error('Password recovery email delivery failed.');
		}
		return { ...this.genericRequestResponse };
	}

	async resetPassword(body: unknown): Promise<{ message: string }> {
		const input = this.input(body, ['recovery_code', 'new_password']);
		if (typeof input.recovery_code !== 'string' || !/^[0-9a-f]{64}$/i.test(input.recovery_code.trim()))
			throw new BadRequestException('Enter the complete recovery code from your email.');
		if (!isValidPassword(input.new_password) || input.new_password.length > 128)
			throw new BadRequestException('Password must have 8–128 characters and include uppercase, lowercase, a number, and a symbol.');
		const password = input.new_password;
		const hash = createHash('sha256').update(input.recovery_code.trim().toLowerCase()).digest('hex');
		const outcome = await this.store.consume(hash, () => this.hasher.hash(password));
		if (outcome === 'INVALID') throw new UnauthorizedException('Invalid recovery code.');
		if (outcome === 'USED') throw new ConflictException('This recovery code has already been used.');
		if (outcome === 'EXPIRED') throw new GoneException('This recovery code has expired. Codes are valid for 5 minutes.');
		if (outcome === 'ACCOUNT_UNAVAILABLE') throw new NotFoundException('Password recovery is only available for registered active accounts.');
		return { message: 'Password updated successfully. Sign in with your new password.' };
	}
}
