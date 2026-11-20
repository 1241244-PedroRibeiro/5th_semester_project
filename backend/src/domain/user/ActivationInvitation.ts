export type InvitationPurpose = 'LOCAL_ACCOUNT_ACTIVATION' | 'EXTERNAL_IDP_MATCH' | 'PASSWORD_RESET';

export interface ActivationInvitationProps {
	token: string;
	username: string;
	purpose: InvitationPurpose;
	expiresAt: Date;
	usedAt: Date | null;
	revokedAt: Date | null;
}

/** A single-use, expiring link that lets a pending account be activated. */
export class ActivationInvitation {
	private constructor(private readonly props: ActivationInvitationProps) {}

	static issue(props: Omit<ActivationInvitationProps, 'usedAt' | 'revokedAt'>): ActivationInvitation {
		return new ActivationInvitation({ ...props, usedAt: null, revokedAt: null });
	}

	static reconstitute(props: ActivationInvitationProps): ActivationInvitation {
		return new ActivationInvitation({ ...props });
	}

	get token(): string { return this.props.token; }
	get username(): string { return this.props.username; }
	get purpose(): InvitationPurpose { return this.props.purpose; }
	get expiresAt(): Date { return this.props.expiresAt; }
	get usedAt(): Date | null { return this.props.usedAt; }
	get revokedAt(): Date | null { return this.props.revokedAt; }

	/** Still usable: not consumed, not revoked and not past its expiry. */
	isActive(now: Date = new Date()): boolean {
		return !this.props.usedAt && !this.props.revokedAt && this.props.expiresAt.getTime() > now.getTime();
	}
}
