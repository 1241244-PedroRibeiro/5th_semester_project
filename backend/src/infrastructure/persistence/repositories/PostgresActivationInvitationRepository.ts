import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IActivationInvitationRepository } from '../../../application/auth/IActivationInvitationRepository';
import { ActivationInvitation } from '../../../domain/user/ActivationInvitation';

export class PostgresActivationInvitationRepository implements IActivationInvitationRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
	isAvailable(): boolean { return this.dataSource.isInitialized; }

	async create(invitation: ActivationInvitation): Promise<void> {
		await this.dataSource.query(
			`INSERT INTO activation_invitations
				(token, username, purpose, expires_at, used_at, revoked_at)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[invitation.token, invitation.username, invitation.purpose, invitation.expiresAt, invitation.usedAt, invitation.revokedAt],
		);
	}

	async findByToken(token: string): Promise<ActivationInvitation | null> {
		const rows = await this.dataSource.query(
			`SELECT token, username, purpose, expires_at, used_at, revoked_at
			 FROM activation_invitations WHERE token = $1`,
			[token],
		);
		if (!rows.length) return null;
		const row = rows[0];
		return ActivationInvitation.reconstitute({
			token: row.token,
			username: row.username,
			purpose: row.purpose,
			expiresAt: new Date(row.expires_at),
			usedAt: row.used_at ? new Date(row.used_at) : null,
			revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
		});
	}

	async activateLocal(token: string, username: string, passwordHash: string): Promise<void> {
		await this.dataSource.transaction(async manager => {
			const rows = await manager.query(
				`SELECT username, purpose, expires_at, used_at, revoked_at
				 FROM activation_invitations WHERE token = $1 FOR UPDATE`,
				[token],
			);
			if (!rows.length || rows[0].username !== username || rows[0].purpose !== 'LOCAL_ACCOUNT_ACTIVATION')
				throw new Error('Invitation changed while activating.');
			if (rows[0].used_at || rows[0].revoked_at || new Date(rows[0].expires_at) <= new Date())
				throw new Error('Invitation changed while activating.');
			const updated = await manager.query(
				`UPDATE users SET password_hash = $1, status = 'ACTIVE', updated_at = NOW()
				 WHERE username = $2 AND status = 'PENDING_REGISTRATION'
				 RETURNING username`,
				[passwordHash, username],
			);
			if (!updated?.length) throw new Error('Account changed while activating.');
			await manager.query(
				`UPDATE activation_invitations SET used_at = NOW()
				 WHERE token = $1 AND used_at IS NULL AND revoked_at IS NULL`,
				[token],
			);
			await manager.query(
				`UPDATE activation_invitations SET revoked_at = NOW()
				 WHERE username = $1 AND purpose = 'LOCAL_ACCOUNT_ACTIVATION'
				 AND token <> $2 AND used_at IS NULL AND revoked_at IS NULL`,
				[username, token],
			);
		});
	}

	async activateExternal(token: string, username: string, subject: string): Promise<void> {
		await this.dataSource.transaction(async manager => {
			const rows = await manager.query(
				`SELECT username, purpose, expires_at, used_at, revoked_at
				 FROM activation_invitations WHERE token = $1 FOR UPDATE`,
				[token],
			);
			if (!rows.length || rows[0].username !== username || rows[0].purpose !== 'EXTERNAL_IDP_MATCH'
				|| rows[0].used_at || rows[0].revoked_at || new Date(rows[0].expires_at) <= new Date())
				throw new Error('Invitation changed while activating.');
			const updated = await manager.query(
				`UPDATE users SET external_idp_subject = $1, password_hash = NULL,
					status = 'ACTIVE', updated_at = NOW()
				 WHERE username = $2 AND status = 'PENDING_REGISTRATION'
				 AND (external_idp_subject IS NULL OR external_idp_subject = $1)
				 RETURNING username`,
				[subject, username],
			);
			if (!updated?.length) throw new Error('External identity is already linked.');
			await manager.query(`UPDATE activation_invitations SET used_at = NOW() WHERE token = $1`, [token]);
			await manager.query(
				`UPDATE activation_invitations SET revoked_at = NOW()
				 WHERE username = $1 AND purpose = 'EXTERNAL_IDP_MATCH'
				 AND token <> $2 AND used_at IS NULL AND revoked_at IS NULL`,
				[username, token],
			);
		});
	}

	async revokeOtherLocalInvitations(username: string, token: string, purpose: string): Promise<void> {
		await this.dataSource.query(
			`UPDATE activation_invitations SET revoked_at = NOW()
			 WHERE username = $1 AND purpose = $3
			 AND token <> $2 AND used_at IS NULL AND revoked_at IS NULL`,
			[username, token, purpose],
		);
	}

}
