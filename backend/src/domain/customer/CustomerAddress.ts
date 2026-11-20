import { AddressId } from './AddressId';
import { DeliveryAddress } from './DeliveryAddress';

export class CustomerAddress {
	constructor(public readonly id: AddressId, public readonly isDefault: boolean, public readonly address: DeliveryAddress) {
		Object.freeze(this);
	}
}
