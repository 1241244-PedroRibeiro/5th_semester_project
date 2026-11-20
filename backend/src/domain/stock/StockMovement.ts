import { StockMovementId } from './StockMovementId';
import { StockMovementType } from './StockMovementType';
import { StockQuantity } from './StockQuantity';
import { Timestamp } from '../common/Timestamp';

export class StockMovement {
	constructor(
		public readonly id: StockMovementId,
		public readonly type: StockMovementType,
		public readonly amount: StockQuantity,
		public readonly reason: string,
		public readonly recordedAt: Timestamp,
	) { Object.freeze(this); }
}
