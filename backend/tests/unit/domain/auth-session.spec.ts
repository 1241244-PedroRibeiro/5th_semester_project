import { AuthSession } from '../../../src/domain/user/AuthSession';
import { Username } from '../../../src/domain/user/Username';
import { Timestamp } from '../../../src/domain/common/Timestamp';
import { DomainError } from '../../../src/domain/common/DomainError';

describe('AuthSession', () => {
	const id = '00000000-0000-4000-8000-000000000001';
	const username = Username.create('session_owner');
	const expiration = new Date('2026-11-04T12:15:00Z');
	const props = () => ({ id, username, expiresAt: Timestamp.create(expiration) });

	it('accepts only its owner while active and expires exactly at its deadline', () => {
		const session = AuthSession.create(props());
		expect(session.isActiveFor(username.value, new Date('2026-11-04T12:14:59.999Z'))).toBe(true);
		expect(session.isActiveFor('another_owner', new Date('2026-11-04T12:00:00Z'))).toBe(false);
		expect(session.isActive(expiration)).toBe(false);
		expect(session.isActive(new Date('2026-11-04T12:16:00Z'))).toBe(false);
	});

	it('revokes irreversibly and preserves the first revocation time', () => {
		const session = AuthSession.create(props());
		const revokedAt = new Date('2026-11-04T12:05:00Z');
		session.revoke(revokedAt);
		expect(session.isActiveFor(username.value, revokedAt)).toBe(false);
		session.revoke(new Date('2026-11-04T12:06:00Z'));
		expect(session.revokedAt?.value).toEqual(revokedAt);
	});

	it('reconstitutes expired and revoked records without making them active again', () => {
		const expired = AuthSession.reconstitute({ ...props(), revokedAt: null });
		expect(expired.isActive(expiration)).toBe(false);
		const revoked = AuthSession.reconstitute({ ...props(), revokedAt: Timestamp.create(new Date('2026-11-04T12:05:00Z')) });
		expect(revoked.isActive(new Date('2026-11-04T12:06:00Z'))).toBe(false);
	});

	it('protects session state from changes to input properties and returned dates', () => {
		const original = props();
		const session = AuthSession.create(original);
		original.expiresAt = Timestamp.create(new Date(0));
		session.expiresAt.value.setTime(0);
		expect(session.expiresAt.value).toEqual(expiration);
		const revocation = new Date('2026-11-04T12:05:00Z');
		session.revoke(revocation);
		revocation.setTime(0);
		session.revokedAt!.value.setTime(0);
		expect(session.revokedAt?.value).toEqual(new Date('2026-11-04T12:05:00Z'));
	});

	it.each(['', 'invalid', '00000000-0000-1000-8000-000000000001'])('rejects invalid session identity: %s', invalidId => {
		expect(() => AuthSession.create({ ...props(), id: invalidId })).toThrow(DomainError);
		expect(() => AuthSession.reconstitute({ ...props(), id: invalidId, revokedAt: null })).toThrow(DomainError);
	});
});
