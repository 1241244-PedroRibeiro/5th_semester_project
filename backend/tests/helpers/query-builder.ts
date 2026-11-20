/** Minimal TypeORM query mock for adapter orchestration tests. Database semantics are tested on PostgreSQL. */
export function queryBuilder() {
	const query = {
		where: jest.fn(), andWhere: jest.fn(), innerJoin: jest.fn(), leftJoin: jest.fn(),
		innerJoinAndSelect: jest.fn(), leftJoinAndSelect: jest.fn(), orderBy: jest.fn(), addOrderBy: jest.fn(),
		take: jest.fn(), skip: jest.fn(), setLock: jest.fn(), insert: jest.fn(), into: jest.fn(),
		values: jest.fn(), orUpdate: jest.fn(), orIgnore: jest.fn(),
		getOne: jest.fn(), getMany: jest.fn(), getExists: jest.fn(), getManyAndCount: jest.fn(), execute: jest.fn(),
	};
	for (const name of ['where', 'andWhere', 'innerJoin', 'leftJoin', 'innerJoinAndSelect', 'leftJoinAndSelect', 'orderBy', 'addOrderBy', 'take', 'skip', 'setLock', 'insert', 'into', 'values', 'orUpdate', 'orIgnore'] as const)
		query[name].mockReturnValue(query);
	return query;
}
