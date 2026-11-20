import { ResourceId } from './ResourceId';
import { SlotCapacity } from './SlotCapacity';

export interface KitchenResourceProps {
	id: ResourceId;
	name: string;
	resourceType: string;
	capacity: SlotCapacity;
	operational: boolean;
}

export class KitchenResource {
	private constructor(private readonly props: KitchenResourceProps) {}
	static create(props: KitchenResourceProps): KitchenResource { return new KitchenResource({ ...props }); }
	get id(): ResourceId { return this.props.id; }
	get name(): string { return this.props.name; }
	get resourceType(): string { return this.props.resourceType; }
	get capacity(): SlotCapacity { return this.props.capacity; }
	get operational(): boolean { return this.props.operational; }
	markOperational(): void { this.props.operational = true; }
	markOutOfService(): void { this.props.operational = false; }
}
