import { RolesAssignmentService } from '../application/user/RolesAssignmentService';
import { ROLES_ASSIGNMENT_REPOSITORY } from '../application/user/IRolesAssignmentRepository';
import { PostgresRolesAssignmentRepository } from '../infrastructure/persistence/repositories/PostgresRolesAssignmentRepository';
import { ROLE_CHANGE_LOG_REPOSITORY } from '../application/user/IRoleChangeLogRepository';
import { PostgresRoleChangeLogRepository } from '../infrastructure/persistence/repositories/PostgresRoleChangeLogRepository';
import { Module } from '@nestjs/common';
import { UserService } from '../application/user/UserService';
import { BackofficeUsersController } from './http/controllers/BackofficeUsersController';
import { CustomerManagementController } from './http/controllers/CustomerManagementController';
import { UserController } from './http/controllers/UserController';
import { AllergenModule } from './allergen.module';
import { AuthModule } from './auth.module';
import { CustomerService } from '../application/customer/CustomerService';
import { CUSTOMER_DIRECTORY_REPOSITORY } from '../application/customer/ICustomerDirectoryRepository';
import { PostgresCustomerDirectoryRepository } from '../infrastructure/persistence/repositories/PostgresCustomerDirectoryRepository';

@Module({
	imports: [AuthModule, AllergenModule],
	controllers: [UserController, BackofficeUsersController, CustomerManagementController],
	providers: [UserService, CustomerService,
		{ provide: CUSTOMER_DIRECTORY_REPOSITORY, useClass: PostgresCustomerDirectoryRepository },
		RolesAssignmentService, { provide: ROLES_ASSIGNMENT_REPOSITORY, useClass: PostgresRolesAssignmentRepository },
		{ provide: ROLE_CHANGE_LOG_REPOSITORY, useClass: PostgresRoleChangeLogRepository }],
})
export class UserModule {}
