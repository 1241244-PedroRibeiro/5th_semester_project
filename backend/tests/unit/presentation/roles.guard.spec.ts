import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../src/presentation/http/middlewares/roles.guard';
import { AUTHENTICATED_KEY, IS_PUBLIC_KEY, ROLES_KEY } from '../../../src/presentation/http/middlewares/decorators';
import { StockController } from '../../../src/presentation/http/controllers/StockController';
import { CustomerDirectoryController } from '../../../src/presentation/http/controllers/CustomerDirectoryController';

describe('RolesGuard', () => {
	const getAllAndOverride = jest.fn();
	const request: { user?: { roles: string[] } } = {};
	const context = {
		getHandler: () => () => undefined,
		getClass: () => class TestController {},
		switchToHttp: () => ({ getRequest: () => request }),
	} as unknown as ExecutionContext;
	let guard: RolesGuard;

	beforeEach(() => {
		jest.resetAllMocks();
		delete request.user;
		getAllAndOverride.mockImplementation((key: string) => {
			if (key === IS_PUBLIC_KEY) return false;
			return undefined;
		});
		guard = new RolesGuard({ getAllAndOverride } as unknown as Reflector);
	});

	it('allows explicitly public routes', () => {
		getAllAndOverride.mockImplementation((key: string) => key === IS_PUBLIC_KEY);
		expect(guard.canActivate(context)).toBe(true);
	});

	it('rejects a protected route with no declared access policy', () => {
		request.user = { roles: ['MANAGER'] };
		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
	});

	it('allows any authenticated role only when the endpoint opts into that policy', () => {
		request.user = { roles: ['CUSTOMER'] };
		getAllAndOverride.mockImplementation((key: string) => key === AUTHENTICATED_KEY);
		expect(guard.canActivate(context)).toBe(true);
	});

	it('rejects an authenticated-only route without an authenticated user', () => {
		getAllAndOverride.mockImplementation((key: string) => key === AUTHENTICATED_KEY);
		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
	});

	it('requires one of the declared roles', () => {
		request.user = { roles: ['EMPLOYEE'] };
		getAllAndOverride.mockImplementation((key: string) => key === ROLES_KEY ? ['MANAGER'] : undefined);
		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
		request.user.roles = ['MANAGER'];
		expect(guard.canActivate(context)).toBe(true);
	});

	it('rejects an empty role policy', () => {
		request.user = { roles: ['MANAGER'] };
		getAllAndOverride.mockImplementation((key: string) => key === ROLES_KEY ? [] : undefined);
		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
	});

	it('allows Employees to read stock while keeping adjustments Manager-only', () => {
		expect(Reflect.getMetadata(ROLES_KEY, StockController.prototype.getAll)).toEqual(['MANAGER', 'EMPLOYEE']);
		expect(Reflect.getMetadata(ROLES_KEY, StockController.prototype.getByProductId)).toEqual(['MANAGER', 'EMPLOYEE']);
		expect(Reflect.getMetadata(ROLES_KEY, StockController)).toEqual(['MANAGER']);
		expect(Reflect.getMetadata(ROLES_KEY, StockController.prototype.adjustStock)).toBeUndefined();
	});

	it('keeps customer directory access Manager-only', () => {
		expect(Reflect.getMetadata(ROLES_KEY, CustomerDirectoryController)).toEqual(['MANAGER']);
	});
});
