import { Identifier } from '../common/Identifier';

export class StockMovementId extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): StockMovementId { return new StockMovementId(value); }
}
