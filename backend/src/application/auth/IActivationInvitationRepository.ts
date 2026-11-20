import { ActivationInvitation, InvitationPurpose } from '../../domain/user/ActivationInvitation';

export const ACTIVATION_INVITATION_REPOSITORY = Symbol('ACTIVATION_INVITATION_REPOSITORY');

export interface IActivationInvitationRepository {
	isAvailable(): boolean;
	create(invitation: ActivationInvitation): Promise<void>;
	findByToken(token: string): Promise<ActivationInvitation | null>;
	activateLocal(token: string, username: string, passwordHash: string): Promise<void>;
	activateExternal(token: string, username: string, subject: string): Promise<void>;
	revokeOtherLocalInvitations(username: string, token: string, purpose: InvitationPurpose): Promise<void>;
}
