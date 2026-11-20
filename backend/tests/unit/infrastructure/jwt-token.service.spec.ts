import { JwtService } from '@nestjs/jwt';
import { JwtTokenService } from '../../../src/infrastructure/security/JwtTokenService';
import { InMemoryAuthSessionRepository } from '../../helpers/auth-sessions';
import { userFixture } from '../../helpers/domain';

describe('JWT session lifecycle', () => {
	const jwt = new JwtService({ secret: 'session-test-secret', signOptions: { expiresIn: '15m' } });
	let sessions: InMemoryAuthSessionRepository;
	let tokens: JwtTokenService;
	beforeEach(() => { sessions = new InMemoryAuthSessionRepository(); tokens = new JwtTokenService(jwt, sessions); });

	it('creates distinct, expiring sessions and invalidates token-service verification after revocation', async () => {
		const user = userFixture();
		const token = await tokens.generateToken(user);
		const other = await tokens.generateToken(user);
		const claims = jwt.decode(token);
		expect(claims.sid).not.toBe(jwt.decode(other).sid);
		expect(sessions.sessions.get(claims.sid)?.expiresAt.value.getTime()).toBe(claims.exp * 1000);
		expect(await tokens.verifyToken(token)).toMatchObject({ username: user.username.value });
		const session = (await sessions.findById(claims.sid))!;
		session.revoke();
		await sessions.save(session);
		expect(await tokens.verifyToken(token)).toBeNull();
		expect(await tokens.verifyToken(other)).not.toBeNull();
	});

	it('does not issue a token when the session cannot be stored', async () => {
		jest.spyOn(sessions, 'create').mockRejectedValue(new Error('Database unavailable'));
		await expect(tokens.generateToken(userFixture())).rejects.toThrow('Database unavailable');
	});

	it('fails closed on session lookup failure and rejects missing session IDs', async () => {
		const token = await tokens.generateToken(userFixture());
		jest.spyOn(sessions, 'findById').mockRejectedValue(new Error('Database unavailable'));
		await expect(tokens.verifyToken(token)).rejects.toThrow('Database unavailable');
		expect(await tokens.verifyToken(jwt.sign({ sub: 'legacy', roles: ['CUSTOMER'], status: 'ACTIVE' }))).toBeNull();
	});
});
