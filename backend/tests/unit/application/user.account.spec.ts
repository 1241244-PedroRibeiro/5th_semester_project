import { testStatusAssignments } from '../../helpers/status-assignments';
import { testRolesAssignments } from '../../helpers/roles-assignments';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UserService } from '../../../src/application/user/UserService';
import { InMemoryUserRepository } from '../../../src/infrastructure/persistence/repositories/InMemoryUserRepository';
import { Email } from '../../../src/domain/common/Email';
import { Username } from '../../../src/domain/user/Username';
import { PasswordHash } from '../../../src/domain/user/PasswordHash';
import { UserStatus } from '../../../src/domain/user/UserStatus';
import { userFixture } from '../../helpers/domain';
import { passwordHasher } from '../../helpers/password-hasher';

describe('Self-service account updates', () => {
	let repo: InMemoryUserRepository;
	let service: UserService;
	const currentPassword = 'CurrentPassword1!';
	beforeEach(async () => {
		repo = new InMemoryUserRepository();
		await repo.insert(userFixture({ passwordHash: PasswordHash.create(await passwordHasher.hash(currentPassword)).getValue() }));
		service = new UserService(repo, passwordHasher, testRolesAssignments, testStatusAssignments);
	});
	it('trims name changes, preserves identity and does not expose credentials', async () => {
		const saved = await service.setName('test_e', { firstName: ' New ', lastName: ' Name ' });
		expect(saved).toMatchObject({ username: 'test_e', firstName: 'New', lastName: 'Name', email: 'test@example.com' });
		expect(saved).not.toHaveProperty('passwordHash');
		expect(saved).not.toHaveProperty('password');
		expect((await repo.findByUsername(Username.create('test_e')))!.name.fullName()).toBe('New Name');
	});
	it('normalizes email only after verifying the current password', async () => {
		await expect(service.setEmail('test_e', { email: 'new@example.com', currentPassword: 'wrong' })).rejects.toBeInstanceOf(ForbiddenException);
		expect((await repo.findByUsername(Username.create('test_e')))!.email.address).toBe('test@example.com');
		const saved = await service.setEmail('test_e', { email: ' NEW@EXAMPLE.COM ', currentPassword });
		expect(saved.email).toBe('new@example.com');
		expect(await repo.findByEmail(Email.create('test@example.com').getValue())).toBeNull();
	});
	it('rejects another account email and concurrent unique constraint violations', async () => {
		await repo.insert(userFixture({ username: Username.create('other_e'), email: Email.create('taken@example.com').getValue() }));
		await expect(service.setEmail('test_e', { email: 'TAKEN@example.com', currentPassword })).rejects.toBeInstanceOf(ConflictException);
		jest.spyOn(repo, 'save').mockRejectedValueOnce({ driverError: { code: '23505' } });
		await expect(service.setEmail('test_e', { email: 'race@example.com', currentPassword })).rejects.toBeInstanceOf(ConflictException);
		expect((await repo.findByUsername(Username.create('test_e')))!.email.address).toBe('test@example.com');
	});
	it('requires the previous password, applies registration policy and hashes the replacement', async () => {
		const hash = jest.spyOn(passwordHasher, 'hash');
		await expect(service.setPassword('test_e', { currentPassword: 'wrong', newPassword: 'NewPassword2!' })).rejects.toBeInstanceOf(ForbiddenException);
		await expect(service.setPassword('test_e', { currentPassword, newPassword: 'weak' })).rejects.toBeInstanceOf(BadRequestException);
		expect(hash).not.toHaveBeenCalled();
		const saved = await service.setPassword('test_e', { currentPassword, newPassword: ' NewPassword2! ' });
		expect(hash).toHaveBeenCalledWith(' NewPassword2! ');
		const stored = (await repo.findByUsername(Username.create('test_e')))!.passwordHash!.hashedValue;
		expect(await passwordHasher.compare(' NewPassword2! ', stored)).toBe(true);
		expect(await passwordHasher.compare(currentPassword, stored)).toBe(false);
		expect(saved).not.toHaveProperty('passwordHash');
		expect(saved).not.toHaveProperty('newPassword');
		hash.mockRestore();
	});
	it.each(['setName', 'setEmail', 'setPassword'] as const)('rejects unexpected identity fields in %s', async method => {
		const save = jest.spyOn(repo, 'save');
		await expect(service[method]('test_e', { firstName: 'Name', username: 'other_e' } as never)).rejects.toBeInstanceOf(BadRequestException);
		expect(save).not.toHaveBeenCalled();
	});
	it('rejects missing fields and inactive accounts', async () => {
		await expect(service.setEmail('test_e', { email: 'a@example.com' } as never)).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.setPassword('test_e', { currentPassword, newPassword: null } as never)).rejects.toBeInstanceOf(BadRequestException);
		const user = (await repo.findByUsername(Username.create('test_e')))!;
		user.deactivate(); await repo.save(user);
		await expect(service.setName('test_e', { firstName: 'New', lastName: 'Name' })).rejects.toBeInstanceOf(ForbiddenException);
		expect(user.status).toBe(UserStatus.DEACTIVATED);
	});
});
