import { PasswordRecoveryService } from '../../src/application/auth/PasswordRecoveryService';
import { IPasswordRecoveryStore } from '../../src/application/auth/IPasswordRecoveryStore';
import { IPasswordHasher } from '../../src/application/auth/ISecurityServices';
import { IRecoveryMailer } from '../../src/application/auth/IPasswordRecoveryStore';
import { PasswordRecoveryController } from '../../src/presentation/http/controllers/PasswordRecoveryController';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';

describe('PasswordRecoveryService account-enumeration protection', () => {
	const store = { issue: jest.fn(), consume: jest.fn() } as unknown as jest.Mocked<IPasswordRecoveryStore>;
	const mailer = { sendRecoveryCode: jest.fn() } as jest.Mocked<IRecoveryMailer>;
	const hasher = { hash: jest.fn(), verify: jest.fn() } as unknown as jest.Mocked<IPasswordHasher>;
	const service = new PasswordRecoveryService(store, mailer, hasher);

	beforeEach(() => jest.clearAllMocks());

	it('returns the same success response for unknown, inactive, sent, and cooldown accounts', async () => {
		store.issue
			.mockResolvedValueOnce({ status: 'ACCOUNT_UNAVAILABLE' })
			.mockResolvedValueOnce({ status: 'ACCOUNT_UNAVAILABLE' })
			.mockResolvedValueOnce({ status: 'SENT' })
			.mockResolvedValueOnce({ status: 'COOLDOWN', retryAfterSeconds: 1200 });

		const responses = await Promise.all([
			service.requestCode({ email: 'unknown@example.test' }),
			service.requestCode({ email: 'inactive@example.test' }),
			service.requestCode({ email: 'active@example.test' }),
			service.requestCode({ email: 'active@example.test' }),
		]);

		expect(responses).toEqual(Array(4).fill({ message: 'If the account is eligible, recovery instructions will be sent.' }));
		expect(store.issue).toHaveBeenCalledTimes(4);
		expect(Reflect.getMetadata(HTTP_CODE_METADATA, PasswordRecoveryController.prototype.requestCode)).toBe(202);
	});

	it('keeps the generic response when delivery to an eligible account fails', async () => {
		store.issue.mockImplementationOnce(async (_email, _hash, deliver) => {
			await deliver('active@example.test');
			return { status: 'SENT' };
		});
		mailer.sendRecoveryCode.mockRejectedValueOnce(new Error('SMTP unavailable'));

		await expect(service.requestCode({ email: 'active@example.test' })).resolves.toEqual({
			message: 'If the account is eligible, recovery instructions will be sent.',
		});
	});
});
