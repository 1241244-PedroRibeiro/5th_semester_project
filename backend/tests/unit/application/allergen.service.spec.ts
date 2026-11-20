import { AllergenService } from '../../../src/application/allergen/AllergenService';
import { IAllergenRepository } from '../../../src/application/allergen/IAllergenRepository';
import { Allergen } from '../../../src/domain/allergen/Allergen';

describe('AllergenService natural identities', () => {
	let service: AllergenService;
	let repo: IAllergenRepository;

	beforeEach(() => {
		const store = new Map<string, Allergen>();
		repo = {
			findByName: async (name) => store.get(name.value) ?? null,
			findAll: async () => [...store.values()],
			save: async (value) => {
				store.set(value.name.value, value);
			},
			update: async (value) => {
				store.set(value.name.value, value);
			},
			delete: async (name) => {
				store.delete(name.value);
			},
			isReferenced: async () => false,
		};
		service = new AllergenService(repo);
	});

	it('creates, reads and deletes by name without public UUIDs or codes', async () => {
		const result = await service.createAllergen({ name: 'Peanuts', description: 'Nuts' });
		expect(result.getValue()).toEqual({ name: 'Peanuts', description: 'Nuts' });
		expect((await service.getAllergenByName('Peanuts')).isSuccess).toBe(true);

		await service.deleteAllergen('Peanuts');
		expect((await service.getAllergenByName('Peanuts')).isFailure).toBe(true);
	});

	it('rejects duplicate identities on creation', async () => {
		await service.createAllergen({ name: 'Peanuts', description: '' });
		expect((await service.createAllergen({ name: 'Peanuts', description: '' })).isFailure).toBe(true);
	});

	it('protects referenced records on deletion', async () => {
		await service.createAllergen({ name: 'Peanuts', description: '' });
		repo.isReferenced = async () => true;
		expect((await service.deleteAllergen('Peanuts')).isFailure).toBe(true);
	});

	it('updates allergen description and supports renaming when unreferenced', async () => {
		await service.createAllergen({ name: 'Peanuts', description: 'Old description' });

		const updateRes = await service.updateAllergen('Peanuts', {
			name: 'Roasted Peanuts',
			description: 'New description',
		});
		expect(updateRes.isSuccess).toBe(true);
		expect(updateRes.getValue()).toEqual({
			name: 'Roasted Peanuts',
			description: 'New description',
		});
		expect((await service.getAllergenByName('Peanuts')).isFailure).toBe(true);
		expect((await service.getAllergenByName('Roasted Peanuts')).isSuccess).toBe(true);
	});

	it('rejects renaming to an already existing allergen name', async () => {
		await service.createAllergen({ name: 'Peanuts', description: '' });
		await service.createAllergen({ name: 'Gluten', description: '' });

		const collision = await service.updateAllergen('Peanuts', {
			name: 'Gluten',
			description: 'Attempt collision',
		});
		expect(collision.isFailure).toBe(true);
		expect(collision.getError()).toContain('already exists');
	});
});