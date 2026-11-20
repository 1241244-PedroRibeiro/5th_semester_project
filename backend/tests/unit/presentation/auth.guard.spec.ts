import { AuthSession } from '../../../src/domain/user/AuthSession';
import { Username } from '../../../src/domain/user/Username';
import { Timestamp } from '../../../src/domain/common/Timestamp';
import { IAuthSessionRepository } from '../../../src/application/auth/IAuthSessionRepository';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '../../../src/presentation/auth.guard';
import { IUserRepository } from '../../../src/application/auth/IUserRepository';
import { User } from '../../../src/domain/user/User';
import { UserRole } from '../../../src/application/user/UserRoles';
import { UserStatus } from '../../../src/domain/user/UserStatus';

describe('AuthGuard', () => {
	const sid = '00000000-0000-4000-8000-000000000001';
	const findById = jest.fn();
	const verifyAsync = jest.fn();
	const getAllAndOverride = jest.fn();
	const findByUsername = jest.fn();
	let guard: AuthGuard;
	let request: { headers: { authorization?: string }; user?: unknown };
	let context: ExecutionContext;

	beforeEach(() => {
		jest.resetAllMocks();
		findById.mockResolvedValue(AuthSession.create({ id: sid, username: Username.create('user-1'), expiresAt: Timestamp.create(new Date(Date.now() + 900000)) }));
		guard = new AuthGuard(
			{ verifyAsync } as unknown as JwtService,
			{ getAllAndOverride } as unknown as Reflector,
			{ findByUsername } as unknown as IUserRepository,
			{ findById } as unknown as IAuthSessionRepository,
		);
		request = { headers: { authorization: 'Bearer test-token' } };
		context = {
			getHandler: () => () => undefined,
			getClass: () => AuthGuard,
			switchToHttp: () => ({ getRequest: () => request }),
		} as unknown as ExecutionContext;
	});

	it('skips verification and database lookup for public routes', async () => {
		getAllAndOverride.mockReturnValue(true);
		await expect(guard.canActivate(context)).resolves.toBe(true);
		expect(verifyAsync).not.toHaveBeenCalled();
		expect(findByUsername).not.toHaveBeenCalled();
	});

	it('uses current database roles and status instead of token claims', async () => {
		verifyAsync.mockResolvedValue({ sid, sub: 'user-1', roles: ['MANAGER'], status: 'ACTIVE' });
		findByUsername.mockResolvedValue({
			username: { value: 'user-1' }, roles: new Set([{ name: UserRole.CUSTOMER }]), status: UserStatus.DEACTIVATED,
		} as User);
		await expect(guard.canActivate(context)).resolves.toBe(true);
		expect(findByUsername.mock.calls[0][0].value).toBe('user-1');
		expect(request.user).toEqual({ sid, username: 'user-1', roles: ['CUSTOMER'], status: 'DEACTIVATED' });
	});

	it.each([undefined, 'Basic token', 'Bearer'])('rejects missing or invalid authorization: %p', async (authorization) => {
		request.headers.authorization = authorization;
		await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
		expect(findByUsername).not.toHaveBeenCalled();
	});

	it('rejects invalid or expired tokens', async () => {
		verifyAsync.mockRejectedValue(new Error('Expired token'));
		await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
		expect(findByUsername).not.toHaveBeenCalled();
	});

	it.each([undefined, null, {}, { sub: 123 }, { sub: '' }, { sub: '   ' }])('rejects malformed subjects: %p', async (payload) => {
		verifyAsync.mockResolvedValue(payload);
		await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
		expect(findByUsername).not.toHaveBeenCalled();
	});

	it('rejects tokens belonging to deleted users', async () => {
		verifyAsync.mockResolvedValue({ sid, sub: 'deleted-user' });
		findById.mockResolvedValue(AuthSession.create({ id: sid, username: Username.create('deleted-user'), expiresAt: Timestamp.create(new Date(Date.now() + 900000)) }));
		findByUsername.mockResolvedValue(null);
		await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
		expect(request.user).toBeUndefined();
	});

	it.each([undefined, null, '', 'malformed'])('rejects a missing or malformed session ID: %p', async sessionId => {
		verifyAsync.mockResolvedValue({ sub: 'user-1', sid: sessionId });
		await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
		expect(findById).not.toHaveBeenCalled();
	});

	it('rejects ended or unknown sessions before loading the user', async () => {
		verifyAsync.mockResolvedValue({ sub: 'user-1', sid });
		findById.mockResolvedValue(null);
		await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
		expect(findByUsername).not.toHaveBeenCalled();
	});

	it('fails closed when the session database is unavailable', async () => {
		verifyAsync.mockResolvedValue({ sub: 'user-1', sid });
		const failure = new Error('Session database unavailable');
		findById.mockRejectedValue(failure);
		await expect(guard.canActivate(context)).rejects.toBe(failure);
		expect(findByUsername).not.toHaveBeenCalled();
	});

	it('lets database failures propagate to the global exception handler', async () => {
		const failure = new Error('Database unavailable');
		verifyAsync.mockResolvedValue({ sid, sub: 'user-1' });
		findByUsername.mockRejectedValue(failure);
		await expect(guard.canActivate(context)).rejects.toBe(failure);
	});
});
