import { DataSource, QueryFailedError } from 'typeorm';
import { PostgresPizzaComponentTypeRepository } from '../../../src/infrastructure/persistence/repositories/PostgresPizzaComponentTypeRepository';
import { PizzaComponentTypeMap } from '../../../src/infrastructure/persistence/mappers/PizzaComponentTypeMap';
import { PizzaComponentTypeConflictError, PizzaComponentTypeInUseError } from '../../../src/domain/pizza/pizza-component-type/PizzaComponentTypeErrors';
import { ComponentTypeName } from '../../../src/domain/pizza/pizza-component-type/valueObjects';
import { queryBuilder } from '../../helpers/query-builder';

const row = { name: 'Topping', assembly_order: 4, min_cardinality: 0, max_cardinality: null };
function setup() {
	const query = queryBuilder();
	const repository = { findOneBy: jest.fn(), upsert: jest.fn(), delete: jest.fn(), existsBy: jest.fn(), createQueryBuilder: () => query };
	const repo = new PostgresPizzaComponentTypeRepository({ getRepository: () => repository } as unknown as DataSource);
	return { repo, repository, query };
}
describe('TypeORM component type persistence', () => {
	it('preserves unbounded cardinality during domain reconstitution', () => {
		expect(PizzaComponentTypeMap.toDomain(row).cardinality.maximum).toBe(2147483647);
	});
	it('loads natural keys and returns null for missing records', async () => {
		const { repo, repository } = setup(); repository.findOneBy.mockResolvedValueOnce(row).mockResolvedValueOnce(null);
		expect((await repo.findByName(ComponentTypeName.create('Topping')))!.name.value).toBe('Topping');
		expect(await repo.findByName(ComponentTypeName.create('Missing'))).toBeNull();
	});
	it('persists an unbounded maximum as SQL null', async () => {
		const { repo, repository } = setup(); await repo.save(PizzaComponentTypeMap.toDomain(row));
		expect(repository.upsert).toHaveBeenCalledWith(row, ['name']);
	});
	it('maps wrapped PostgreSQL uniqueness and reference errors to domain errors', async () => {
		const { repo, repository } = setup();
		repository.upsert.mockRejectedValue(new QueryFailedError('insert', [], Object.assign(new Error('duplicate'), { code: '23505' })));
		await expect(repo.save(PizzaComponentTypeMap.toDomain(row))).rejects.toBeInstanceOf(PizzaComponentTypeConflictError);
		repository.delete.mockRejectedValue(new QueryFailedError('delete', [], Object.assign(new Error('referenced'), { code: '23503' })));
		await expect(repo.delete(ComponentTypeName.create('Topping'))).rejects.toBeInstanceOf(PizzaComponentTypeInUseError);
	});
	it('binds search text as a value', async () => {
		const { repo, query } = setup(); query.getMany.mockResolvedValue([]);
		await repo.findAll("x' OR TRUE");
		expect(query.where.mock.calls[0][0]).not.toContain("x' OR TRUE");
		expect(query.where.mock.calls[0][1]).toEqual({ search: "%x' OR TRUE%", order: "x' OR TRUE" });
	});
});
