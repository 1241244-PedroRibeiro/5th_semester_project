import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StatusGuard } from '../../../src/presentation/http/middlewares/UserStatus.guard';
import { IS_PUBLIC_KEY, USER_STATUSES_KEY } from '../../../src/presentation/http/middlewares/decorators';

describe('StatusGuard', () => {
	const getAllAndOverride = jest.fn();
	const request: { user?: { status: string } } = {};
	const context = {
		getHandler: () => () => undefined,
		getClass: () => class TestController {},
		switchToHttp: () => ({ getRequest: () => request }),
	} as unknown as ExecutionContext;
	let guard: StatusGuard;

	beforeEach(() => {
		jest.resetAllMocks();
		delete request.user;
		getAllAndOverride.mockImplementation((key: string) => key === IS_PUBLIC_KEY ? false : undefined);
		guard = new StatusGuard({ getAllAndOverride } as unknown as Reflector);
	});

	it('skips status validation only for explicitly public routes', () => {
		getAllAndOverride.mockImplementation((key: string) => key === IS_PUBLIC_KEY);
		expect(guard.canActivate(context)).toBe(true);
	});

	it('requires an ACTIVE account by default on protected routes', () => {
		request.user = { status: 'ACTIVE' };
		expect(guard.canActivate(context)).toBe(true);
		request.user.status = 'DEACTIVATED';
		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
	});

	it('honours explicitly allowed statuses', () => {
		request.user = { status: 'PENDING_REGISTRATION' };
		getAllAndOverride.mockImplementation((key: string) => key === USER_STATUSES_KEY ? ['PENDING_REGISTRATION'] : undefined);
		expect(guard.canActivate(context)).toBe(true);
	});

	it('rejects missing users and empty status policies', () => {
		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
		request.user = { status: 'ACTIVE' };
		getAllAndOverride.mockImplementation((key: string) => key === USER_STATUSES_KEY ? [] : undefined);
		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
	});
});
