import { DomainError } from '../../../domain/common/DomainError';
import { CardinalityBounds } from '../../../domain/pizza/CardinalityBounds';
export const UNBOUNDED_MAXIMUM = 2147483647;
export function cardinalityFromStorage(minimum: number, maximum: number | null): CardinalityBounds {
	const result = CardinalityBounds.create(minimum, maximum === null ? UNBOUNDED_MAXIMUM : maximum);
	if (result.isFailure) throw new DomainError(result.getError());
	return result.getValue();
}
export function cardinalityToStorage(maximum: number): number | null {
	return maximum === UNBOUNDED_MAXIMUM ? null : maximum;
}
