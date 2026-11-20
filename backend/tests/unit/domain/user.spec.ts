import { userFixture } from '../../helpers/domain';
import { User } from '../../../src/domain/user/User';
import { Username } from '../../../src/domain/user/Username';
import { RoleName } from '../../../src/domain/user/RoleName';
import { AllergenName } from '../../../src/domain/allergen/AllergenName';
import { UserStatus } from '../../../src/domain/user/UserStatus';
import { PersonName } from '../../../src/domain/common/PersonName';
import { Timestamp } from '../../../src/domain/common/Timestamp';
import { PasswordHash } from '../../../src/domain/user/PasswordHash';
import { Email } from '../../../src/domain/common/Email';
import { DeliveryAddress } from '../../../src/domain/customer/DeliveryAddress';
import { PhoneNumber } from '../../../src/domain/customer/PhoneNumber';
describe('User aggregate with username identity', () => {
	it('preserves supplied username, names and timestamps', () => { const user = userFixture(); expect(user.username.value).toBe('test_e'); expect(user.name.fullName()).toBe('Test User'); expect(user.createdAt.value).toEqual(new Date('2020-01-01Z')); });
	it('rejects users without roles and invalid statuses', () => { expect(() => userFixture({ roles: new Set() })).toThrow(); expect(() => userFixture({ status: 'INVALID' as UserStatus })).toThrow(); });
	it.each(['', ' ', 'a'.repeat(76)])('rejects invalid person names %p', value => { expect(() => PersonName.create(value, 'User')).toThrow(); });
	it('rejects invalid email and reversed timestamps', () => { expect(Email.create('invalid').isFailure).toBe(true); expect(() => userFixture({ updatedAt: Timestamp.create(new Date('2019-01-01Z')) })).toThrow(); });
	it('assigns/revokes roles by value and preserves one role', () => { const user = userFixture(); user.assignRole(RoleName.create('MANAGER')); user.assignRole(RoleName.create('MANAGER')); expect(user.roles.size).toBe(2); user.revokeRole(RoleName.create('CUSTOMER')); expect(user.hasRole(RoleName.create('MANAGER'))).toBe(true); expect(() => user.revokeRole(RoleName.create('MANAGER'))).toThrow(); user.roles.clear(); expect(user.roles.size).toBe(1); });
	it('changes passwords and status through domain methods', () => { const user = userFixture(); user.changePassword(PasswordHash.create('new-hash').getValue()); user.deactivate(); expect(user.status).toBe(UserStatus.DEACTIVATED); user.activate(); expect(user.status).toBe(UserStatus.ACTIVE); expect(user.passwordHash!.hashedValue).toBe('new-hash'); expect(user.updatedAt.value.getTime()).toBeGreaterThan(user.createdAt.value.getTime()); });
	it('owns and deduplicates dietary restrictions by allergen identity', () => { const user = userFixture(); user.recordDietaryRestriction(AllergenName.create('Milk')); user.recordDietaryRestriction(AllergenName.create('Milk')); user.dietaryRestrictions.clear(); expect(user.dietaryRestrictions.size).toBe(1); user.clearDietaryRestriction(AllergenName.create('Milk')); expect(user.dietaryRestrictions.size).toBe(0); });
	it('keeps contact details optional for existing users', () => {
		const user = userFixture();
		expect(user.address).toBeUndefined();
		expect(user.phoneNumber).toBeUndefined();
	});
	it('replaces the address and updates the modification timestamp', () => {
		const phoneNumber = PhoneNumber.create('+351912345678');
		const user = userFixture({ phoneNumber, address: new DeliveryAddress('Old Street', '1000-001', 'Lisbon', '') });
		const createdAt = user.createdAt.value;
		const previousUpdatedAt = user.updatedAt.value;
		const address = new DeliveryAddress('New Street', '4000-001', 'Porto', 'Floor 2');
		user.changeAddress(address);
		expect(user.address).toBe(address);
		expect(user.phoneNumber).toBe(phoneNumber);
		expect(user.createdAt.value).toEqual(createdAt);
		expect(user.updatedAt.value.getTime()).toBeGreaterThan(previousUpdatedAt.getTime());
	});
	it('replaces the phone number and updates the modification timestamp', () => {
		const address = new DeliveryAddress('Street', '1000-001', 'Lisbon', '');
		const user = userFixture({ address, phoneNumber: PhoneNumber.create('+351912345678') });
		const previousUpdatedAt = user.updatedAt.value;
		const phoneNumber = PhoneNumber.create('+351923456789');
		user.changePhoneNumber(phoneNumber);
		expect(user.phoneNumber).toBe(phoneNumber);
		expect(user.address).toBe(address);
		expect(user.updatedAt.value.getTime()).toBeGreaterThan(previousUpdatedAt.getTime());
	});
	it('reconstitutes the supplied identity' , () => { const user = userFixture(); expect(User.reconstitute({ username: Username.create('existing'), name: user.name, email: user.email, passwordHash: user.passwordHash, status: user.status, roles: user.roles, dietaryRestrictions: user.dietaryRestrictions, createdAt: user.createdAt, updatedAt: user.updatedAt }).username.value).toBe('existing'); });
});
