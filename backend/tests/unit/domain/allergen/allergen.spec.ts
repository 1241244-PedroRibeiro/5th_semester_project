import { Allergen } from '../../../../src/domain/allergen/Allergen';
import { AllergenName } from '../../../../src/domain/allergen/AllergenName';
describe('Allergen name identity', () => {
	it('uses the name as its identity', () => { const value = Allergen.create({ name: AllergenName.create('Example'), description: 'Before' }); expect(value.name.value).toBe('Example'); });
	it('updates descriptions through the root', () => { const value = Allergen.create({ name: AllergenName.create('Example'), description: 'Before' }); value.updateDescription('After'); expect(value.description).toBe('After'); });
});
