import { Body, Controller, Header, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { PasswordRecoveryService } from '../../../application/auth/PasswordRecoveryService';
import { Public } from '../middlewares/decorators';

@Controller(['password-recovery', 'auth/password-recovery'])
@Public()
export class PasswordRecoveryController {
	constructor(@Inject(PasswordRecoveryService) private readonly recovery: PasswordRecoveryService) {}

	@Post()
	@HttpCode(HttpStatus.ACCEPTED)
	@Header('Cache-Control', 'no-store')
	requestCode(@Body() body: unknown): Promise<{ message: string }> { return this.recovery.requestCode(body); }

	@Post('new_pass')
	@HttpCode(HttpStatus.OK)
	@Header('Cache-Control', 'no-store')
	resetPassword(@Body() body: unknown): Promise<{ message: string }> { return this.recovery.resetPassword(body); }
}
