import { PizzaSizeService } from '../../../src/application/pizza/PizzaSizeService';
import { InMemoryPizzaSizeRepository } from '../../../src/infrastructure/persistence/repositories/InMemoryPizzaSizeRepository';

describe('PizzaSizeService (Application Unit Test)', () => {
	let service: PizzaSizeService;
	let repo: InMemoryPizzaSizeRepository;

	beforeEach(() => {
		repo = new InMemoryPizzaSizeRepository();
		service = new PizzaSizeService(repo);
	});

	it('should successfully create a pizza size', async () => {
		const result = await service.createPizzaSize({ name: 'Medium' });
		expect(result.isSuccess).toBe(true);
		expect(result.getValue().name).toBe('Medium');
		expect(result.getValue().active).toBe(true);
	});

	it('should reject creation on duplicate designation', async () => {
		await service.createPizzaSize({ name: 'Large' });
		const duplicate = await service.createPizzaSize({ name: 'Large' });
		expect(duplicate.isFailure).toBe(true);
		expect(duplicate.getError()).toContain('already exists');
	});

	it('should prevent deletion if size is referenced (AC6)', async () => {
		const created = (await service.createPizzaSize({ name: 'Family' })).getValue();
		jest.spyOn(repo, 'isReferenced').mockResolvedValue(true);

		const deleteResult = await service.deletePizzaSize(created.name);
		expect(deleteResult.isFailure).toBe(true);
		expect(deleteResult.getError()).toContain('referenced by existing business information');
	});
});
