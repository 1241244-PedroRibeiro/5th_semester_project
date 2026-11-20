import { DomainError } from '../common/DomainError';

export class StockQuantity {
	private constructor(public readonly units: number) { Object.freeze(this); }
	static create(units: number): StockQuantity {
		if (!Number.isSafeInteger(units) || units < 0) throw new DomainError('Stock quantity must be a non-negative safe integer');
		return new StockQuantity(units);
	}
	add(other: StockQuantity): StockQuantity { return StockQuantity.create(this.units + other.units); }
	subtract(other: StockQuantity): StockQuantity { return StockQuantity.create(this.units - other.units); }
	isGreaterThanOrEqual(other: StockQuantity): boolean { return this.units >= other.units; }
}
