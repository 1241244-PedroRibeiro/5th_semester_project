import { typeFixture } from '../../../helpers/domain';
import { ComponentTypeName, AssemblyOrder } from '../../../../src/domain/pizza/pizza-component-type/valueObjects';
import { CardinalityBounds } from '../../../../src/domain/pizza/CardinalityBounds';
describe('PizzaComponentType', () => {
	it('uses name identity and value equality', () => { expect(typeFixture().name.value).toBe('Cheese'); expect(typeFixture().equals(typeFixture())).toBe(true); expect(() => ComponentTypeName.create(' ')).toThrow(); });
	it('changes ordering and cardinality through domain methods', () => { const type = typeFixture(); type.changeAssemblyOrder(AssemblyOrder.create(4).getValue()); type.changeCardinality(CardinalityBounds.create(1, 2).getValue()); expect(type.assemblyOrder.sequenceNumber).toBe(4); expect(type.cardinality.isSatisfiedBy(0)).toBe(false); expect(type.cardinality.isSatisfiedBy(2)).toBe(true); expect(type.cardinality.isSatisfiedBy(3)).toBe(false); });
	it.each([0, -1, 1.5])('rejects invalid assembly order %p', value => { expect(AssemblyOrder.create(value).isFailure).toBe(true); });
});
