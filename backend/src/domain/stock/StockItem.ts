import { randomUUID } from 'node:crypto';
import { Sku } from '../product/Sku';
import { Timestamp } from '../common/Timestamp';
import { DomainError } from '../common/DomainError';
import { StockQuantity } from './StockQuantity';
import { StockMovement } from './StockMovement';
import { StockMovementId } from './StockMovementId';
import { StockMovementType } from './StockMovementType';

export interface StockItemProps {
	productSku: Sku;
	currentUnits: StockQuantity;
	movements: StockMovement[];
	createdAt: Timestamp;
	updatedAt: Timestamp;
}

export class StockItem {
	private constructor(private readonly props: StockItemProps) {}

	static create(props: StockItemProps): StockItem {

		if (new Set(props.movements.map(movement => movement.id.value)).size !== props.movements.length)
			throw new DomainError('Stock movement identities must be unique');
		if (props.updatedAt.value < props.createdAt.value)
			throw new DomainError('Invalid stock timestamps');

		return new StockItem({ ...props, movements: [...props.movements] });
	}

	
	replenish(quantity: StockQuantity, reason: string): void {
		if (quantity.units === 0)
			throw new DomainError('Replenishment quantity must be positive');

		const balance = this.props.currentUnits.add(quantity);
		this.record(StockMovementType.REPLENISHMENT, quantity, reason, balance);
	}

	consume(quantity: StockQuantity, reason: string): void {
		if (quantity.units === 0)
			throw new DomainError('Consumption quantity must be positive');
		const balance = this.props.currentUnits.subtract(quantity);
		this.record(StockMovementType.CONSUMPTION, quantity, reason, balance);
	}

	adjust(quantity: StockQuantity, reason: string): void {
		// TODO: Decide whether quantity sets the balance or applies a delta, then record an ADJUSTMENT movement with reason.
		throw new DomainError('Stock adjustment semantics are not implemented');
	}

	hasSufficientStock(quantity: StockQuantity): boolean { return this.props.currentUnits.isGreaterThanOrEqual(quantity); }

	private record(type: StockMovementType, amount: StockQuantity, reason: string, balance: StockQuantity): void {
		const now = Timestamp.create(new Date());
		const movement = new StockMovement(StockMovementId.create(randomUUID()), type, amount, reason, now);
		this.props.currentUnits = balance;
		this.props.movements.push(movement);
		this.props.updatedAt = now;
	}

	get productSku(): Sku { return this.props.productSku; }
	get currentUnits(): StockQuantity { return this.props.currentUnits; }
	get movements(): StockMovement[] { return [...this.props.movements]; }
	get createdAt(): Timestamp { return this.props.createdAt; }
	get updatedAt(): Timestamp { return this.props.updatedAt; }
}
