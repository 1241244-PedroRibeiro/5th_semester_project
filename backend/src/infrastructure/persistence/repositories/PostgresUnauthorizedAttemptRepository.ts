import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IUnauthorizedAttemptRepository, UnauthorizedAttemptDTO } from '../../../application/auth/IUnauthorizedAttemptRepository';
import { UnauthorizedAttemptEntity } from '../entities/UnauthorizedAttemptEntity';

@Injectable()
export class PostgresUnauthorizedAttemptRepository implements IUnauthorizedAttemptRepository {
	constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

	async record(user: string, endpoint: string): Promise<void> {
		await this.dataSource.getRepository(UnauthorizedAttemptEntity).insert({ user, endpoint });
	}

	async findPage(page: number, pageSize: number): Promise<{ items: UnauthorizedAttemptDTO[]; total: number }> {
		return this.findFilteredPage({ page, pageSize });
	}

	async findFilteredPage(filters: { page: number; pageSize: number; user?: string; from?: Date; to?: Date }): Promise<{ items: UnauthorizedAttemptDTO[]; total: number }> {
		const repository = this.dataSource.getRepository(UnauthorizedAttemptEntity);
		const query = repository.createQueryBuilder('attempt')
			.orderBy('attempt.timestamp', 'DESC')
			.addOrderBy('attempt.id', 'DESC')
			.skip((filters.page - 1) * filters.pageSize)
			.take(filters.pageSize);
		if (filters.user) query.andWhere('attempt.user = :user', { user: filters.user });
		if (filters.from) query.andWhere('attempt.timestamp >= :from', { from: filters.from });
		if (filters.to) query.andWhere('attempt.timestamp < :to', { to: filters.to });
		const [rows, total] = await query.getManyAndCount();
		return {
			items: rows.map((row) => ({
				id: row.id,
				user: row.user,
				timestamp: row.timestamp.toISOString(),
				endpoint: row.endpoint,
			})),
			total,
		};
	}
}
