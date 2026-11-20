import { Controller, Post, Get, Body, HttpCode, HttpStatus, Inject, Param, Req, UseGuards, HttpException } from '@nestjs/common';
import { LoginAbuseService } from '../../../application/auth/LoginAbuseService';
import { LoginRateLimitGuard, LoginRequest } from '../middlewares/LoginRateLimit.guard';
import { ActivationInvitationService } from '../../../application/auth/ActivationInvitationService';
import { AuthService, StaffResponseDTO } from '../../../application/auth/AuthService';
import { RegisterUserDTO, LoginDTO, AuthResponseDTO, InviteUserDTO, InviteRegisterUserDTO, ActivateAccountDTO, ResendActivationDTO, RefreshTokenDTO } from '../../../application/auth/AuthDTOs';
import { Authenticated, CurrentUser, AuthenticatedUser, Public, UserStatuses } from '../middlewares/decorators';
import { Roles } from '../middlewares/roles.decorator';
import { UserRole } from '../../../application/user/UserRoles';
import { UserStatus } from '../../../domain/user/UserStatus';

// PENDING_REGISTRATION

@Controller('auth')
export class AuthController {
	constructor(
		@Inject(AuthService) private readonly authService: AuthService,
		@Inject(LoginAbuseService) private readonly loginAbuse: LoginAbuseService,
		@Inject(ActivationInvitationService) private readonly activationInvitations: ActivationInvitationService,
	) {}

	@Public()
	@Post('register') // 201 by default
	@HttpCode(HttpStatus.CREATED)
	async register(@Body() dto: RegisterUserDTO): Promise<AuthResponseDTO> {
		return this.authService.register(dto);
	}

	@Post('pre_register') // 201 by default
	@Roles(UserRole.MANAGER)
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.CREATED)
	async pre_register(@Body() dto: InviteRegisterUserDTO, @CurrentUser() user: AuthenticatedUser): Promise<StaffResponseDTO> {
		return this.authService.inviteStaff(dto, user.username);
	}

	@Post('invite')
	@Roles(UserRole.MANAGER)
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.CREATED)
	async invite(@Body() dto: InviteUserDTO, @CurrentUser() user: AuthenticatedUser): Promise<StaffResponseDTO> {
		return this.authService.invite(dto, user.username);
	}

	@Post('logout')
	@Authenticated()
	@HttpCode(HttpStatus.NO_CONTENT)
	async logout(@CurrentUser() user: AuthenticatedUser & { sid: string }): Promise<void> {
		await this.authService.logout(user.sid, user.username);
	}

	@Public()
	@Post('login')
	@UseGuards(LoginRateLimitGuard)
	@HttpCode(HttpStatus.OK)
	async login(@Body() dto: LoginDTO, @Req() request: LoginRequest): Promise<AuthResponseDTO> {
		let response: AuthResponseDTO;
		try {
			response = await this.authService.login(dto);
		} catch (error) {
			const rejectedCredentials = error instanceof HttpException && [400, 401, 403].includes(error.getStatus());
			await this.loginAbuse.finish(request.loginAttempt, rejectedCredentials ? 'failure' : 'error');
			throw error;
		}
		await this.loginAbuse.finish(request.loginAttempt, 'success');
		return response;
	}

	@Public()
	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	async refresh(@Body() dto: RefreshTokenDTO): Promise<Pick<AuthResponseDTO, 'token' | 'refreshToken'>> {
		return this.authService.refresh(dto);
	}

	@Public()
	@Post('resend-activation')
	@HttpCode(HttpStatus.OK)
	async resendActivation(@Body() dto: ResendActivationDTO): Promise<{ message: string }> {
		return this.activationInvitations.resendActivation(dto);
	}

	@Public()
	@Get('invitation/:token')
	async inspectInvitation(@Param('token') token: string) {
		return this.activationInvitations.inspectInvitation(token);
	}

	@Public()
	@Post('activate')
	@HttpCode(HttpStatus.OK)
	async activate(@Body() dto: ActivateAccountDTO): Promise<{ message: string }> {
		return this.authService.activate(dto);
	}
}
