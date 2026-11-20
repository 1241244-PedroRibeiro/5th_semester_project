import { GoneException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ResendActivationDTO, USER_REPOSITORY } from './AuthDTOs';
import { IUserRepository } from './IUserRepository';
import { INVITATION_MAILER, IInvitationMailer } from './IInvitationMailer';
import { ACTIVATION_INVITATION_REPOSITORY, IActivationInvitationRepository } from './IActivationInvitationRepository';
import { ActivationInvitation } from '../../domain/user/ActivationInvitation';
import { Email } from '../../domain/common/Email';
import { User } from '../../domain/user/User';
import { Username } from '../../domain/user/Username';
import { UserStatus } from '../../domain/user/UserStatus';
import { UserRole } from '../user/UserRoles';

export type ActivationPurpose = 'LOCAL_ACCOUNT_ACTIVATION' | 'EXTERNAL_IDP_MATCH';

/** Issues, re-sends and looks up activation invitations. Email delivery itself is delegated to IInvitationMailer. */
@Injectable()
export class ActivationInvitationService {
	constructor(
		@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
		@Inject(INVITATION_MAILER) private readonly invitationMailer: IInvitationMailer,
		@Optional() @Inject(ACTIVATION_INVITATION_REPOSITORY) private readonly invitations?: IActivationInvitationRepository,
	) {}

	async sendActivationInvitation(user: User, role: UserRole, purpose: ActivationPurpose = 'LOCAL_ACCOUNT_ACTIVATION'): Promise<void> {
		if (!this.invitations || !this.invitations.isAvailable()) {
			await this.invitationMailer.sendInvitation(user.email.address, role);
			return;
		}
		const token = randomBytes(32).toString('base64url');
		const ttlHours = Number(process.env.INVITATION_TTL_HOURS || 24);
		const expiresAt = new Date(Date.now() + (Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 24) * 60 * 60 * 1000);
		await this.invitations.revokeOtherLocalInvitations(user.username.value, token, purpose);
		await this.invitations.create(ActivationInvitation.issue({ token, username: user.username.value, purpose, expiresAt }));
		await this.invitationMailer.sendInvitation(user.email.address, role, token, purpose);
	}

	async resendActivation(dto: ResendActivationDTO): Promise<{ message: string }> {
		const generic = 'If the account is pending, a new activation invitation has been sent.';
		const result = Email.create(dto?.email);
		if (result.isFailure) return { message: generic };
		const user = await this.userRepo.findByEmail(result.getValue());
		if (!user || user.status !== UserStatus.PENDING_REGISTRATION) return { message: generic };
		const role = [...user.roles][0]?.name as UserRole | undefined;
		if (!role) return { message: generic };
		await this.sendActivationInvitation(user, role, 'LOCAL_ACCOUNT_ACTIVATION');
		return { message: generic };
	}

	async inspectInvitation(token: string): Promise<{ purpose: string; maskedEmail: string; expiresAt: string; valid: true }> {
		const invitation = await this.getActiveInvitation(token);
		const user = await this.userRepo.findByUsername(Username.create(invitation.username));
		if (!user) throw new NotFoundException('Invitation not found.');
		return { purpose: invitation.purpose, maskedEmail: user.email.masked(), expiresAt: invitation.expiresAt.toISOString(), valid: true };
	}

	async getInvitation(token: string): Promise<ActivationInvitation> {
		if (!this.invitations) throw new NotFoundException('Invitation not found.');
		if (typeof token !== 'string' || token.length < 32) throw new NotFoundException('Invitation not found.');
		const invitation = await this.invitations.findByToken(token);
		if (!invitation) throw new NotFoundException('Invitation not found.');
		return invitation;
	}

	/** Like getInvitation, but rejects invitations that are expired, revoked or already used. */
	async getActiveInvitation(token: string): Promise<ActivationInvitation> {
		const invitation = await this.getInvitation(token);
		if (!invitation.isActive()) throw new GoneException('Invitation is expired, revoked or already used.');
		return invitation;
	}
}
