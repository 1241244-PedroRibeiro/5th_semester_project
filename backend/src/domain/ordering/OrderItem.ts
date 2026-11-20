import { OrderItemId } from './OrderItemId';
import { OrderItemType } from './OrderItemType';
import { FulfillmentStatus } from './FulfillmentStatus';
import { Sku } from '../product/Sku';
import { Money } from '../common/Money';
import { PersonalizedPizzaSnapshot } from './PersonalizedPizzaSnapshot';
import { requirePositiveInteger } from '../common/Guard';
import { DomainError } from '../common/DomainError';

export interface OrderItemProps {
	id: OrderItemId;
	lineNumber: number;
	itemType: OrderItemType;
	catalogueProductSku?: Sku;
	quantity: number;
	unitPrice: Money;
	fulfillmentStatus: FulfillmentStatus;
	snapshot?: PersonalizedPizzaSnapshot;
}

export class OrderItem {
	private readonly props: OrderItemProps;
	constructor(props: OrderItemProps) {
		requirePositiveInteger('Line number', props.lineNumber);
		requirePositiveInteger('Item quantity', props.quantity);
		if (!Object.values(OrderItemType).includes(props.itemType)) throw new DomainError('Invalid order item type');
		if (!Object.values(FulfillmentStatus).includes(props.fulfillmentStatus)) throw new DomainError('Invalid fulfillment status');
		this.props = {
			id: props.id,
			lineNumber: props.lineNumber,
			itemType: props.itemType,
			catalogueProductSku: props.catalogueProductSku,
			quantity: props.quantity,
			unitPrice: props.unitPrice,
			fulfillmentStatus: props.fulfillmentStatus,
			snapshot: props.snapshot,
		};
	}
	get id(): OrderItemId { return this.props.id; }
	get lineNumber(): number { return this.props.lineNumber; }
	get itemType(): OrderItemType { return this.props.itemType; }
	get catalogueProductSku(): Sku | undefined { return this.props.catalogueProductSku; }
	get quantity(): number { return this.props.quantity; }
	get unitPrice(): Money { return this.props.unitPrice; }
	get fulfillmentStatus(): FulfillmentStatus { return this.props.fulfillmentStatus; }
	get snapshot(): PersonalizedPizzaSnapshot | undefined { return this.props.snapshot; }
	markBeingPrepared(): void {
		// TODO: Define allowed fulfillment transitions into BEING_PREPARED and root coordination.
		throw new DomainError('Order item fulfillment transitions are not implemented');
	}
	markReady(): void {
		// TODO: Define allowed fulfillment transitions into READY_TO_SERVE and root coordination.
		throw new DomainError('Order item fulfillment transitions are not implemented');
	}
	markServed(): void {
		// TODO: Define allowed fulfillment transitions into SERVED and root coordination.
		throw new DomainError('Order item fulfillment transitions are not implemented');
	}
}
