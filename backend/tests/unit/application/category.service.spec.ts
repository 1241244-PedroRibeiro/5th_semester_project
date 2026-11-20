import { CategoryService } from '../../../src/application/catalogue/CategoryService';
import { ICategoryRepository } from '../../../src/application/catalogue/ICategoryRepository';
import { ProductCategory } from '../../../src/domain/product/product-category/ProductCategory';

describe('CategoryService natural identities', () => {
	let service: CategoryService;
	let repo: ICategoryRepository;

	beforeEach(() => {
		const store = new Map<string, ProductCategory>();
		repo = {
			findByName: async name => store.get(name.value) ?? null,
			findAll: async () => [...store.values()],
			save: async value => { store.set(value.name.value, value); },
			update: async value => { store.set(value.name.value, value); },
			delete: async name => { store.delete(name.value); },
			isReferencedByProducts: async () => false
		};
		service = new CategoryService(repo);
	});

	it('creates, reads and deletes by name without public UUIDs or codes', async () => {
		const result = await service.createCategory({ name: 'Example', description: 'Description' });
		expect(result.getValue()).toEqual({ name: 'Example', description: 'Description' });
		expect((await service.getCategoryByName('Example')).isSuccess).toBe(true);

		await service.deleteCategory('Example');
		expect((await service.getCategoryByName('Example')).isFailure).toBe(true);
	});

	it('rejects duplicate identities', async () => {
		await service.createCategory({ name: 'Example', description: '' });
		expect((await service.createCategory({ name: 'Example', description: '' })).isFailure).toBe(true);
	});

	it('protects referenced records on deletion', async () => {
		await service.createCategory({ name: 'Example', description: '' });
		repo.isReferencedByProducts = async () => true;
		expect((await service.deleteCategory('Example')).isFailure).toBe(true);
	});

	it('updates category details successfully', async () => {
		await service.createCategory({ name: 'Example', description: 'Old' });
		const updateRes = await service.updateCategory('Example', { name: 'Example', description: 'New description' });
		expect(updateRes.isSuccess).toBe(true);
		expect(updateRes.getValue().description).toBe('New description');
	});
});