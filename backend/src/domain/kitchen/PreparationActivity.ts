import { ActivityId } from './ActivityId';
import { OrderId } from '../ordering/OrderId';
import { OrderItemId } from '../ordering/OrderItemId';
import { ActivityDuration } from './ActivityDuration';
import { ActivityStatus } from './ActivityStatus';
import { ResourceId } from './ResourceId';
import { DomainError } from '../common/DomainError';

export interface PreparationActivityProps {
	id: ActivityId;
	orderId: OrderId;
	orderItemId: OrderItemId;
	activityType: string;
	expectedDuration: ActivityDuration;
	status: ActivityStatus;
	allocatedResourceId?: ResourceId;
	prerequisites: Set<ActivityId>;
}

export class PreparationActivity {
	private constructor(private readonly props: PreparationActivityProps) {}
	static create(props: PreparationActivityProps): PreparationActivity {
		if (!Object.values(ActivityStatus).includes(props.status)) throw new DomainError('Invalid activity status');
		const prerequisites = new Map([...props.prerequisites].map(id => [id.value, id]));
		return new PreparationActivity({ ...props, prerequisites: new Set(prerequisites.values()) });
	}
	get id(): ActivityId { return this.props.id; }
	get orderId(): OrderId { return this.props.orderId; }
	get orderItemId(): OrderItemId { return this.props.orderItemId; }
	get activityType(): string { return this.props.activityType; }
	get expectedDuration(): ActivityDuration { return this.props.expectedDuration; }
	get status(): ActivityStatus { return this.props.status; }
	get allocatedResourceId(): ResourceId | undefined { return this.props.allocatedResourceId; }
	get prerequisites(): Set<ActivityId> { return new Set(this.props.prerequisites); }
	addPrerequisite(id: ActivityId): void {
		if (![...this.props.prerequisites].some(existing => existing.equals(id))) this.props.prerequisites.add(id);
	}
	allocateResource(id: ResourceId): void {
		// TODO: Define allocation restrictions and whether allocation changes status to SCHEDULED.
		throw new DomainError('Kitchen resource allocation rules are not implemented');
	}
	start(): void {
		// TODO: Define allowed transitions into IN_PROGRESS and how readiness is checked before starting.
		throw new DomainError('Activity start transitions are not implemented');
	}
	complete(): void {
		// TODO: Define allowed transitions into COMPLETED.
		throw new DomainError('Activity completion transitions are not implemented');
	}
	isReady(completedActivityIds: Set<ActivityId>): boolean {
		// TODO: Define readiness: prerequisite completion, allowed statuses and resource allocation requirements.
		throw new DomainError('Activity readiness rules are not implemented');
	}
}
