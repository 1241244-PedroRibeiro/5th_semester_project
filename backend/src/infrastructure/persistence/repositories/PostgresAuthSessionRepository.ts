import { Inject, Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { IAuthSessionRepository } from '../../../application/auth/IAuthSessionRepository';
import { AuthSession } from '../../../domain/user/AuthSession';
import { AuthSessionEntity } from '../entities/AuthSessionEntity';
import { AuthSessionMap } from '../mappers/AuthSessionMap';

@Injectable()
export class PostgresAuthSessionRepository implements IAuthSessionRepository {
	constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

	async create(session: AuthSession): Promise<void> {
		await this.dataSource.getRepository(AuthSessionEntity).insert(AuthSessionMap.toPersistence(session));
	}

	async findById(id: string): Promise<AuthSession | null> {
		const row = await this.dataSource.getRepository(AuthSessionEntity).findOneBy({ id });
		return row ? AuthSessionMap.toDomain(row) : null;
	}

	async save(session: AuthSession): Promise<void> {
		// Persist only mutable state; stale copies cannot undo or overwrite a prior revocation.
		await this.dataSource.getRepository(AuthSessionEntity).update(
			{ id: session.id, username: session.username.value, revoked_at: IsNull() },
			{ revoked_at: session.revokedAt?.value ?? null },
		);
	}

	async findByRefreshTokenHash(hash: string): Promise<AuthSession | null> {
		const row = await this.dataSource.getRepository(AuthSessionEntity).findOneBy({ refresh_token_hash: hash, revoked_at: IsNull() });
		return row ? AuthSessionMap.toDomain(row) : null;
	}

	async rotate(currentHash: string, replacement: AuthSession): Promise<boolean> {
		return this.dataSource.transaction(async manager => {
			const current = await manager.findOne(AuthSessionEntity, { where: { refresh_token_hash: currentHash, revoked_at: IsNull() } });
			if (!current) return false;
			const result = await manager.update(AuthSessionEntity, { id: current.id, revoked_at: IsNull() }, { revoked_at: new Date() });
			if (!result.affected) return false;
			await manager.insert(AuthSessionEntity, AuthSessionMap.toPersistence(replacement));
			return true;
		});
	}
}
