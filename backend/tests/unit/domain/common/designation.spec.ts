
import { Designation } from '../../../../src/domain/common/Designation';

describe('Designation', () => {
  it('should create a designation with valid text', () => {
    const result = Designation.create('Pizzas');

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().text).toBe('Pizzas');
  });

  it('should trim whitespace from the text', () => {
    const result = Designation.create('  Bebidas  ');

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().text).toBe('Bebidas');
  });

  it('should reject empty text', () => {
    const result = Designation.create('');

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('cannot be empty');
  });

  it('should reject text containing only whitespace', () => {
    const result = Designation.create('   ');

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('cannot be empty');
  });
});
