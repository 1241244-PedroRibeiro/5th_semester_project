"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DomainError_1 = require("../../../../src/domain/common/DomainError");
const PizzaComponentType_1 = require("../../../../src/domain/pizza/pizza-component-type/PizzaComponentType");
const valueObjects_1 = require("../../../../src/domain/pizza/pizza-component-type/valueObjects");
describe('PizzaComponentTypeId', () => {
    test('generate creates different ids each time', () => {
        expect(valueObjects_1.PizzaComponentTypeId.generate().equals(valueObjects_1.PizzaComponentTypeId.generate())).toBe(false);
    });
    test('create rejects blank values', () => {
        expect(() => valueObjects_1.PizzaComponentTypeId.create(' ')).toThrow(DomainError_1.DomainError);
    });
});
describe('ComponentTypeName', () => {
    test('trims the value', () => {
        expect(valueObjects_1.ComponentTypeName.create(' Cheese ').value).toBe('Cheese');
    });
    test('rejects empty and too long names', () => {
        expect(() => valueObjects_1.ComponentTypeName.create('')).toThrow(DomainError_1.DomainError);
        expect(() => valueObjects_1.ComponentTypeName.create('x'.repeat(valueObjects_1.ComponentTypeName.MAX_LENGTH + 1))).toThrow(DomainError_1.DomainError);
    });
});
describe('AssemblyOrder', () => {
    test('accepts positive integers', () => {
        expect(valueObjects_1.AssemblyOrder.create(1).value).toBe(1);
        expect(valueObjects_1.AssemblyOrder.create(4).value).toBe(4);
    });
    test('rejects zero, negatives and decimals', () => {
        expect(() => valueObjects_1.AssemblyOrder.create(0)).toThrow(DomainError_1.DomainError);
        expect(() => valueObjects_1.AssemblyOrder.create(-1)).toThrow(DomainError_1.DomainError);
        expect(() => valueObjects_1.AssemblyOrder.create(1.5)).toThrow(DomainError_1.DomainError);
    });
    test('equals compares by value', () => {
        expect(valueObjects_1.AssemblyOrder.create(2).equals(valueObjects_1.AssemblyOrder.create(2))).toBe(true);
        expect(valueObjects_1.AssemblyOrder.create(2).equals(valueObjects_1.AssemblyOrder.create(3))).toBe(false);
    });
});
describe('PizzaComponentType', () => {
    const make = () => PizzaComponentType_1.PizzaComponentType.create({
        name: valueObjects_1.ComponentTypeName.create('Base'),
        assemblyOrder: valueObjects_1.AssemblyOrder.create(1),
    });
    test('create generates an id when none is given', () => {
        const type = make();
        expect(type.id.value.length).toBeGreaterThan(0);
        expect(type.name.value).toBe('Base');
        expect(type.assemblyOrder.value).toBe(1);
    });
    test('create keeps the provided id', () => {
        const id = valueObjects_1.PizzaComponentTypeId.create('type-1');
        const type = PizzaComponentType_1.PizzaComponentType.create({
            id,
            name: valueObjects_1.ComponentTypeName.create('Base'),
            assemblyOrder: valueObjects_1.AssemblyOrder.create(1),
        });
        expect(type.id.equals(id)).toBe(true);
    });
    test('rename and changeAssemblyOrder update the type', () => {
        const type = make();
        type.rename(valueObjects_1.ComponentTypeName.create('Sauce'));
        type.changeAssemblyOrder(valueObjects_1.AssemblyOrder.create(2));
        expect(type.name.value).toBe('Sauce');
        expect(type.assemblyOrder.value).toBe(2);
    });
    test('reconstitute restores the stored state', () => {
        const type = PizzaComponentType_1.PizzaComponentType.reconstitute({
            id: valueObjects_1.PizzaComponentTypeId.create('type-5'),
            name: valueObjects_1.ComponentTypeName.create('Topping'),
            assemblyOrder: valueObjects_1.AssemblyOrder.create(3),
        });
        expect(type.id.value).toBe('type-5');
        expect(type.assemblyOrder.value).toBe(3);
    });
    test('equals compares by id', () => {
        const a = make();
        expect(a.equals(a)).toBe(true);
        expect(a.equals(make())).toBe(false);
    });
});
