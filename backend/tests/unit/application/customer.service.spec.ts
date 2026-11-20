import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerService } from '../../../src/application/customer/CustomerService';
import { CreateCustomerDTO } from '../../../src/application/customer/CustomerDTOs';
import { ICustomerRepository } from '../../../src/application/customer/ICustomerRepository';
import { DomainError } from '../../../src/domain/common/DomainError';
import { Customer } from '../../../src/domain/customer/Customer';

describe('CustomerService', () => {
	let customers: Map<string, Customer>;
	let repo: jest.Mocked<ICustomerRepository>;
	let service: CustomerService;
	const input: CreateCustomerDTO = {
		firstName: 'Ana', lastName: 'Silva', phone: '+351912345678', email: 'ana@example.com',
	};
	const address = { street: 'Rua Nova', postalCode: '1000-001', city: 'Lisbon' };

	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(new Date('2026-10-27T10:00:00Z'));
		customers = new Map();
		repo = {
			findById: jest.fn(async id => customers.get(id.value) ?? null),
			findByUsername: jest.fn(async username =>
				[...customers.values()].find(customer => customer.username?.equals(username)) ?? null),
			insert: jest.fn(async customer => { customers.set(customer.id.value, customer); }),
			save: jest.fn(async customer => { customers.set(customer.id.value, customer); }),
		};
		service = new CustomerService(repo);
	});

	afterEach(() => jest.useRealTimers());

	it('creates an independent customer with UUID identity and database defaults', async () => {
		const result = await service.createCustomer(input);
		expect(result).toEqual({
			...input, id: expect.stringMatching(/^[0-9a-f-]{36}$/), username: null, vatNumber: null,
			marketingConsent: false, addresses: [], consentTimestamp: '2026-10-27T10:00:00.000Z',
			createdAt: '2026-10-27T10:00:00.000Z', updatedAt: '2026-10-27T10:00:00.000Z',
		});
		expect(repo.findByUsername).not.toHaveBeenCalled();
		expect(repo.insert).toHaveBeenCalledWith(expect.any(Customer));
		expect(await service.getCustomer(result.id)).toEqual(result);
	});

	it('supports nullable database fields and multiple customers without usernames', async () => {
		const first = await service.createCustomer({ ...input, username: null, vatNumber: null });
		const second = await service.createCustomer(input);
		expect(first.username).toBeNull();
		expect(first.vatNumber).toBeNull();
		expect(first.id).not.toBe(second.id);
	});

	it('captures optional username, VAT number and explicit consent', async () => {
		const result = await service.createCustomer({
			...input, username: 'ana', vatNumber: '123456789', marketingConsent: true,
		});
		expect(result).toMatchObject({ username: 'ana', vatNumber: '123456789', marketingConsent: true });
		await expect(service.createCustomer({ ...input, username: 'ana' })).rejects.toBeInstanceOf(ConflictException);
		expect(repo.insert).toHaveBeenCalledTimes(1);
	});

	it.each([
		{ firstName: ' ' }, { lastName: 'x'.repeat(76) }, { phone: '' }, { email: 'invalid' },
		{ marketingConsent: 'false' }, { marketingConsent: null },
	])('rejects invalid creation data %j before persistence', async invalid => {
		await expect(service.createCustomer({ ...input, ...invalid } as CreateCustomerDTO)).rejects.toThrow();
		expect(repo.insert).not.toHaveBeenCalled();
	});

	it('updates contact information while preserving other customer fields and consent time', async () => {
		const created = await service.createCustomer(input);
		jest.advanceTimersByTime(1000);
		const updated = await service.updateContactInformation(created.id, {
			phone: '+351923456789', email: 'NEW@EXAMPLE.COM',
		});
		expect(updated).toEqual({
			...created, phone: '+351923456789', email: 'new@example.com', updatedAt: '2026-10-27T10:00:01.000Z',
		});
		expect(repo.save).toHaveBeenCalledTimes(1);
		await expect(service.updateContactInformation(created.id, { ...input, email: 'invalid' }))
			.rejects.toBeInstanceOf(BadRequestException);
		expect(repo.save).toHaveBeenCalledTimes(1);
	});

	it('persists address additions, default changes and removals through the aggregate', async () => {
		const created = await service.createCustomer(input);
		const first = (await service.addAddress(created.id, address, true)).addresses[0];
		const added = await service.addAddress(created.id, { ...address, street: 'Rua Dois' }, true);
		expect(added.addresses).toEqual([
			{ ...first, isDefault: false },
			{ ...address, street: 'Rua Dois', id: expect.any(String), isDefault: true, extraDetails: '' },
		]);
		const switched = await service.setDefaultAddress(created.id, first.id);
		expect(switched.addresses.map(entry => entry.isDefault)).toEqual([true, false]);
		const removed = await service.removeAddress(created.id, first.id);
		expect(removed.addresses).toEqual([{ ...added.addresses[1], isDefault: false }]);
		expect(repo.save).toHaveBeenCalledTimes(4);
	});

	it('rejects an address owned by another customer without saving', async () => {
		const first = await service.createCustomer(input);
		const second = await service.createCustomer(input);
		const added = await service.addAddress(second.id, address);
		repo.save.mockClear();
		await expect(service.setDefaultAddress(first.id, added.addresses[0].id)).rejects.toBeInstanceOf(DomainError);
		expect(repo.save).not.toHaveBeenCalled();
	});

	it('records consent changes with a new consent timestamp and update time', async () => {
		const created = await service.createCustomer(input);
		jest.advanceTimersByTime(1000);
		const granted = await service.updateConsent(created.id, true);
		expect(granted).toMatchObject({
			marketingConsent: true, consentTimestamp: '2026-10-27T10:00:01.000Z',
			updatedAt: '2026-10-27T10:00:01.000Z', createdAt: created.createdAt,
		});
		jest.advanceTimersByTime(1000);
		expect(await service.updateConsent(created.id, false)).toMatchObject({
			marketingConsent: false, consentTimestamp: '2026-10-27T10:00:02.000Z',
		});
	});

	it('reports unknown customers without saving', async () => {
		await expect(service.getCustomer('missing')).rejects.toBeInstanceOf(NotFoundException);
		await expect(service.updateConsent('missing', true)).rejects.toBeInstanceOf(NotFoundException);
		await expect(service.addAddress('missing', address)).rejects.toBeInstanceOf(NotFoundException);
		expect(repo.save).not.toHaveBeenCalled();
	});
});
