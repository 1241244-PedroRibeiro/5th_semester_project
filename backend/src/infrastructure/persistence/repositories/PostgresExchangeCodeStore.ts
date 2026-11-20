import { createHash } from 'node:crypto';
import { InjectDataSource } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ExchangeCodeEntry, IExchangeCodeStore } from '../../../application/auth/IExchangeCodeStore';
import { ExchangeCodeEntity } from '../entities/ExchangeCodeEntity';

@Injectable()
export class PostgresExchangeCodeStore implements IExchangeCodeStore {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

	async put(code: string, entry: ExchangeCodeEntry): Promise<void> {
		const codeHash = this.hash(code);
		await this.dataSource.getRepository(ExchangeCodeEntity).upsert({
			code_hash: codeHash,
			username: entry.username,
			expires_at: entry.expiresAt,
			used_at: null,
		}, ['code_hash']);
	}

	async consume(code: string): Promise<ExchangeCodeEntry | null> {
		const codeHash = this.hash(code);
		return this.dataSource.transaction(async manager => {
			const row = await manager.createQueryBuilder(ExchangeCodeEntity, 'exchange')
				.setLock('pessimistic_write')
				.where('exchange.code_hash = :codeHash', { codeHash })
				.andWhere('exchange.used_at IS NULL')
				.andWhere('exchange.expires_at > NOW()')
				.getOne();
			if (!row) return null;
			row.used_at = new Date();
			await manager.save(ExchangeCodeEntity, row);
			return { username: row.username, expiresAt: row.expires_at };
		});
	}

	private hash(code: string): string {
		return createHash('sha256').update(code).digest('hex');
	}
}
