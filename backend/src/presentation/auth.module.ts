import { StatusAssignmentService } from '../application/user/StatusAssignmentService';
import { RolesAssignmentService } from '../application/user/RolesAssignmentService';
import { ROLES_ASSIGNMENT_REPOSITORY } from '../application/user/IRolesAssignmentRepository';
import { PostgresRolesAssignmentRepository } from '../infrastructure/persistence/repositories/PostgresRolesAssignmentRepository';
import { STATUS_ASSIGNMENT_REPOSITORY } from '../application/user/IStatusAssignmentRepository';
import { PostgresStatusAssignmentRepository } from '../infrastructure/persistence/repositories/PostgresStatusAssignmentRepository';
import { INVITATION_MAILER } from '../application/auth/IInvitationMailer';
import { SmtpInvitationMailer } from '../infrastructure/security/SmtpInvitationMailer';
import { AUTH_SESSION_REPOSITORY } from '../application/auth/IAuthSessionRepository';
import { PostgresAuthSessionRepository } from '../infrastructure/persistence/repositories/PostgresAuthSessionRepository';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PasswordRecoveryController } from './http/controllers/PasswordRecoveryController';
import { PasswordRecoveryService } from '../application/auth/PasswordRecoveryService';
import { PASSWORD_RECOVERY_STORE, RECOVERY_MAILER } from '../application/auth/IPasswordRecoveryStore';
import { PostgresPasswordRecoveryStore } from '../infrastructure/persistence/repositories/PostgresPasswordRecoveryStore';
import { SmtpRecoveryMailer } from '../infrastructure/security/SmtpRecoveryMailer';
import { AuthController } from './http/controllers/AuthController';
import { AuthService } from '../application/auth/AuthService';
import { ActivationInvitationService } from '../application/auth/ActivationInvitationService';
import {
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from '../application/auth/AuthDTOs';
import { JwtTokenService } from '../infrastructure/security/JwtTokenService';
import { PostgresUserRepository } from '../infrastructure/persistence/repositories/PostgresUserRepository';
import { Argon2Hasher } from '../infrastructure/security/Argon2Hasher';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './http/middlewares/roles.guard';
import { StatusGuard } from './http/middlewares/UserStatus.guard';
import { LoginAbuseService } from '../application/auth/LoginAbuseService';
import { LOGIN_ATTEMPT_STORE } from '../application/auth/ILoginAttemptStore';
import { PostgresLoginAttemptStore } from '../infrastructure/persistence/repositories/PostgresLoginAttemptStore';
import { LoginRateLimitGuard } from './http/middlewares/LoginRateLimit.guard';

import { ExternalAuthController } from './http/controllers/ExternalAuthController';
import { ExternalAuthService } from '../application/auth/ExternalAuthService';
import { OIDC_CLIENT } from '../application/auth/IOidcClient';
import { OidcClientAdapter } from '../infrastructure/security/OidcClientAdapter';
import { EXCHANGE_CODE_STORE } from '../application/auth/IExchangeCodeStore';
import { PostgresExchangeCodeStore } from '../infrastructure/persistence/repositories/PostgresExchangeCodeStore';
import { CUSTOMER_REPOSITORY } from '../application/customer/ICustomerRepository';
import { PostgresCustomerRepository } from '../infrastructure/persistence/repositories/PostgresCustomerRepository';
import { ACTIVATION_INVITATION_REPOSITORY } from '../application/auth/IActivationInvitationRepository';
import { PostgresActivationInvitationRepository } from '../infrastructure/persistence/repositories/PostgresActivationInvitationRepository';

@Module({
	imports: [PersistenceModule,
		ConfigModule,
		JwtModule.registerAsync({
		global: true,
		imports: [ConfigModule],
		inject: [ConfigService],
		useFactory: (config: ConfigService) => ({
			secret:
			config.get<string>('JWT_SECRET') ||
			process.env.JWT_SECRET ||
			'laprizza-default-secret-key-change-in-production-2026',
			signOptions: { expiresIn: '15m' },
		}),
		}),
	],
	controllers: [
        AuthController,
        PasswordRecoveryController,
        ExternalAuthController
    ],
	providers: [
		LoginAbuseService,
		LoginRateLimitGuard,
		{ provide: LOGIN_ATTEMPT_STORE, useClass: PostgresLoginAttemptStore },
		StatusAssignmentService,
		RolesAssignmentService,
		{ provide: ROLES_ASSIGNMENT_REPOSITORY, useClass: PostgresRolesAssignmentRepository },
		{ provide: STATUS_ASSIGNMENT_REPOSITORY, useClass: PostgresStatusAssignmentRepository },
		{ provide: INVITATION_MAILER, useClass: SmtpInvitationMailer },
		{ provide: ACTIVATION_INVITATION_REPOSITORY, useClass: PostgresActivationInvitationRepository },
		PasswordRecoveryService,
		{ provide: PASSWORD_RECOVERY_STORE, useClass: PostgresPasswordRecoveryStore },
		{ provide: RECOVERY_MAILER, useClass: SmtpRecoveryMailer },
		{ provide: AUTH_SESSION_REPOSITORY, useClass: PostgresAuthSessionRepository },
		PostgresUserRepository,
		Argon2Hasher,
		{ provide: USER_REPOSITORY, useExisting: PostgresUserRepository },
		{ provide: PASSWORD_HASHER, useExisting: Argon2Hasher },
		{ provide: TOKEN_SERVICE, useClass: JwtTokenService },
		AuthService,
		ActivationInvitationService,
		{ provide: APP_GUARD, useClass: AuthGuard },
		{ provide: APP_GUARD, useClass: RolesGuard },
		{ provide: APP_GUARD, useClass: StatusGuard },

        ExternalAuthService,
        { provide: OIDC_CLIENT, useClass: OidcClientAdapter },
        { provide: EXCHANGE_CODE_STORE, useClass: PostgresExchangeCodeStore },
        { provide: CUSTOMER_REPOSITORY, useClass: PostgresCustomerRepository },
	],
	exports: [StatusAssignmentService, RolesAssignmentService, AUTH_SESSION_REPOSITORY, AuthService, USER_REPOSITORY, CUSTOMER_REPOSITORY, TOKEN_SERVICE, PASSWORD_HASHER, JwtModule],
})
export class AuthModule {}
