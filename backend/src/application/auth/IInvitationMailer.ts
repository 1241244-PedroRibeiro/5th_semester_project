export const INVITATION_MAILER = Symbol('INVITATION_MAILER');

export interface IInvitationMailer {
	sendInvitation(email: string, role: string, token?: string, purpose?: 'LOCAL_ACCOUNT_ACTIVATION' | 'EXTERNAL_IDP_MATCH'): Promise<void>;
}
