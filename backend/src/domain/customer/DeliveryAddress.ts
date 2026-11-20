import { ValueObject } from '../common/ValueObject';

export class DeliveryAddress extends ValueObject<{ street: string; postalCode: string; city: string; extraDetails: string }> {
	constructor(street: string, postalCode: string, city: string, extraDetails: string) { super({ street, postalCode, city, extraDetails }); }
	
	get street(): string { return this.props.street; }
	get postalCode(): string { return this.props.postalCode; }
	get city(): string { return this.props.city; }
	get extraDetails(): string { return this.props.extraDetails; }
}
