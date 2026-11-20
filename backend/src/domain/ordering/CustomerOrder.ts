import { OrderId } from './OrderId';
import { Email } from '../common/Email';
import { Timestamp } from '../common/Timestamp';
import { Money } from '../common/Money';
import { DomainError } from '../common/DomainError';
import { OrderStatus } from './OrderStatus';
import { OrderItem } from './OrderItem';

export interface CustomerOrderProps {
	id: OrderId;
	customerEmail?: Email;
	placementTime: Timestamp;
	status: OrderStatus;
	totalAmount: Money;
	items: OrderItem[];
}

export class CustomerOrder {
	private constructor(private readonly props: CustomerOrderProps) {}
	static create(props: CustomerOrderProps): CustomerOrder {
		if (!props.items.length)
			throw new DomainError('Order must contain at least one item');
		if (!Object.values(OrderStatus).includes(props.status))
			throw new DomainError('Invalid order status');
		if (new Set(props.items.map(item => item.id.value)).size !== props.items.length)
			throw new DomainError('Order item identities must be unique');
		if (new Set(props.items.map(item => item.lineNumber)).size !== props.items.length)
			throw new DomainError('Order line numbers must be unique');

		const order = new CustomerOrder({ ...props, items: props.items.map(item => new OrderItem(item)) });
		order.recalculateTotal();
		return order;
	}

	addItem(item: OrderItem): void {
		if (this.props.items.some(entry => entry.id.equals(item.id) || entry.lineNumber === item.lineNumber))
			throw new DomainError('Order item identity and line number must be unique');
		const total = this.props.totalAmount.add(item.unitPrice.multiply(item.quantity));
		this.props.items.push(new OrderItem(item));
		this.props.totalAmount = total;
	}

	place(): void {
		// TODO: Define allowed order transitions into PLACED and placementTime semantics.
		throw new DomainError('Order placement transitions are not implemented');
	}

	confirm(): void {
		// TODO: Define allowed order transitions into CONFIRMED.
		throw new DomainError('Order confirmation transitions are not implemented');
	}

	cancel(): void {
		// TODO: Define which order states permit cancellation.
		throw new DomainError('Order cancellation transitions are not implemented');
	}

	recalculateTotal(): Money {
		const total = this.props.items.reduce((sum, item) => sum.add(item.unitPrice.multiply(item.quantity)), Money.create(0, this.props.totalAmount.currency));
		this.props.totalAmount = total;
		return total;
	}


	get id(): OrderId { return this.props.id; }
	get customerEmail(): Email | undefined { return this.props.customerEmail; }
	get placementTime(): Timestamp { return this.props.placementTime; }
	get status(): OrderStatus { return this.props.status; }
	get totalAmount(): Money { return this.props.totalAmount; }
	get items(): OrderItem[] { return this.props.items.map(item => new OrderItem(item)); }
}
