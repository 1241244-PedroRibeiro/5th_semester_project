import { DomainError } from '../common/DomainError';

export class SlotCapacity {
	private constructor(public readonly slots: number) { Object.freeze(this); }
	static create(slots: number): SlotCapacity {
		if (!Number.isSafeInteger(slots) || slots < 0) throw new DomainError('SlotCapacity must be a non-negative safe integer');
		return new SlotCapacity(slots);
	}
	equals(other?: SlotCapacity): boolean { return !!other && this.slots === other.slots; }
}
