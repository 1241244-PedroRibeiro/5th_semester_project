import { DataSource } from 'typeorm';
import { mockDataSource } from '../../helpers/mock-data-source';
import { Test } from '@nestjs/testing';
import { UserModule } from '../../../src/presentation/user.module';
import { UserService } from '../../../src/application/user/UserService';
import { AuthService } from '../../../src/application/auth/AuthService';
import { AuthModule } from '../../../src/presentation/auth.module';
import { RolesAssignmentService } from '../../../src/application/user/RolesAssignmentService';
import { BackofficeUsersController } from '../../../src/presentation/http/controllers/BackofficeUsersController';
import { UserController } from '../../../src/presentation/http/controllers/UserController';
import { USER_REPOSITORY } from '../../../src/application/auth/IUserRepository';
import { USER_REPOSITORY as AUTH_USER_REPOSITORY } from '../../../src/application/auth/AuthDTOs';
import { PostgresUserRepository } from '../../../src/infrastructure/persistence/repositories/PostgresUserRepository';

describe('UserModule dependency injection', () => {
	it('resolves the controller and service using the shared authentication repository token', async () => {
		const userRepository = { findByUsername: jest.fn() };
		const module = await Test.createTestingModule({ imports: [UserModule] })
			.overrideProvider(PostgresUserRepository).useValue(userRepository)
			.overrideProvider('IAllergenRepository').useValue({})
			.overrideProvider(DataSource).useValue(mockDataSource).compile();

		try {
			expect(USER_REPOSITORY).toBe(AUTH_USER_REPOSITORY);
			expect(module.get(USER_REPOSITORY)).toBe(userRepository);
			expect(module.get(UserService)).toBeInstanceOf(UserService);
			expect(module.get(AuthService)).toBeInstanceOf(AuthService);
			expect(module.select(UserModule).get(RolesAssignmentService)).toBe(module.select(AuthModule).get(RolesAssignmentService));
			expect(module.get(UserController)).toBeInstanceOf(UserController);
			expect(module.get(BackofficeUsersController)).toBeInstanceOf(BackofficeUsersController);
		} finally {
			await module.close();
		}
	});
});
