import { testStatusAssignments } from '../../helpers/status-assignments';
import { testRolesAssignments } from '../../helpers/roles-assignments';
import { passwordHasher } from '../../helpers/password-hasher';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from '../../../src/application/user/UserService';
import { InMemoryUserRepository } from '../../../src/infrastructure/persistence/repositories/InMemoryUserRepository';
import { Username } from '../../../src/domain/user/Username';
import { Email } from '../../../src/domain/common/Email';
import { userFixture } from '../../helpers/domain';
describe('UserService aggregate orchestration', () => {
	let repo: InMemoryUserRepository, service: UserService;
	beforeEach(async () => { repo = new InMemoryUserRepository(); await repo.insert(userFixture()); service = new UserService(repo, passwordHasher, testRolesAssignments, testStatusAssignments); });
	it('returns public identity without credentials', async () => { const result = await service.getUser('test_e'); expect(result.username).toBe('test_e'); expect(result).not.toHaveProperty('passwordHash'); expect(result).not.toHaveProperty('id'); });
	it('persists dietary restrictions through User and deduplicates by name', async () => { await service.relateUserAllergens('test_e', ['Milk', 'Gluten', 'Milk']); expect(await service.getUserAllergens('test_e')).toEqual({ username: 'test_e', allergens: ['Milk', 'Gluten'] }); expect((await repo.findByUsername(Username.create('test_e')))!.dietaryRestrictions.size).toBe(2); });
	it('deactivates through User and persists the root', async () => { await service.deactivateUser('test_e', 'test_e'); expect((await repo.findByUsername(Username.create('test_e')))!.status).toBe('DEACTIVATED'); });
	it('returns 404 for unknown usernames', async () => { await expect(service.getUser('missing')).rejects.toBeInstanceOf(NotFoundException); await expect(service.relateUserAllergens('missing', ['Milk'])).rejects.toBeInstanceOf(NotFoundException); });
});


describe('User contact updates', () => {
	let repo: InMemoryUserRepository, service: UserService;
	const address = { street: 'Rua Nova', postalCode: '1000-001', city: 'Lisbon', extraDetails: 'Floor 2' };
	beforeEach(async () => {
		repo = new InMemoryUserRepository();
		await repo.insert(userFixture());
		await repo.insert(userFixture({ username: Username.create('other_e'), email: Email.create('other@example.com').getValue() }));
		service = new UserService(repo, passwordHasher, testRolesAssignments, testStatusAssignments);
	});
	it('saves and replaces an address through the root, preserving other contact details', async () => {
		await service.setPhoneNumber('test_e', { phoneNumber: '+351912345678' });
		expect(await service.setAddress('test_e', address)).toMatchObject({ username: 'test_e', address, phoneNumber: '+351912345678' });
		const result = await service.setAddress('test_e', { street: 'Rua Nova 2', postalCode: '4000-001', city: 'Porto' });
		expect(result.address).toEqual({ street: 'Rua Nova 2', postalCode: '4000-001', city: 'Porto', extraDetails: '' });
		const saved = (await repo.findByUsername(Username.create('test_e')))!;
		expect(saved.address?.city).toBe('Porto');
		expect(saved.phoneNumber?.value).toBe('+351912345678');
		expect(saved.updatedAt.value.getTime()).toBeGreaterThan(saved.createdAt.value.getTime());
		expect((await repo.findByUsername(Username.create('other_e')))!.address).toBeUndefined();
	});
	it('saves and replaces a phone number without changing the address', async () => {
		await service.setAddress('test_e', address);
		await service.setPhoneNumber('test_e', { phoneNumber: '+351912345678' });
		const result = await service.setPhoneNumber('test_e', { phoneNumber: ' +351923456789 ' });
		expect(result).toMatchObject({ phoneNumber: '+351923456789', address });
		expect((await repo.findByUsername(Username.create('test_e')))!.phoneNumber?.value).toBe('+351923456789');
		expect(result).not.toHaveProperty('passwordHash');
		expect((await repo.findByUsername(Username.create('other_e')))!.phoneNumber).toBeUndefined();
	});
	it('keeps shared existing response contracts unchanged', async () => {
		await service.setAddress('test_e', address);
		await service.setPhoneNumber('test_e', { phoneNumber: '+351912345678' });
		expect(await service.getUser('test_e')).not.toHaveProperty('address');
		expect((await service.getAllUsers()).items[0]).not.toHaveProperty('phoneNumber');
	});
	it.each([null, [], {}, { ...address, street: '' }, { ...address, city: 123 }, { ...address, postalCode: ' ' }, { ...address, extraDetails: null }, { ...address, username: 'other_e' }, { ...address, id: 'other' }])('rejects invalid address input %j before saving', async dto => {
		const save = jest.spyOn(repo, 'save');
		await expect(service.setAddress('test_e', dto as any)).rejects.toBeInstanceOf(BadRequestException);
		expect(save).not.toHaveBeenCalled();
	});
	it.each([null, [], {}, { phoneNumber: '' }, { phoneNumber: 351912345678 }, { phoneNumber: '912345678' }, { phoneNumber: '+0123' }, { phoneNumber: '+1234567890123456' }, { phoneNumber: '+351912345678', username: 'other_e' }])('rejects invalid phone input %j before saving', async dto => {
		const save = jest.spyOn(repo, 'save');
		await expect(service.setPhoneNumber('test_e', dto as any)).rejects.toBeInstanceOf(BadRequestException);
		expect(save).not.toHaveBeenCalled();
	});
	it('reports a missing user for either contact update', async () => {
		await expect(service.setAddress('missing', address)).rejects.toBeInstanceOf(NotFoundException);
		await expect(service.setPhoneNumber('missing', { phoneNumber: '+351912345678' })).rejects.toBeInstanceOf(NotFoundException);
	});
	it('preserves contact details across unrelated aggregate saves', async () => {
		await service.setAddress('test_e', address);
		await service.setPhoneNumber('test_e', { phoneNumber: '+351912345678' });
		await service.deactivateUser('test_e', 'test_e');
		const user = (await repo.findByUsername(Username.create('test_e')))!;
		expect(user.address?.street).toBe(address.street);
		expect(user.phoneNumber?.value).toBe('+351912345678');
	});
});
