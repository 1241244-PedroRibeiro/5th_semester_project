import { NotFoundException } from '@nestjs/common';
import { Result } from '../../domain/common/Result';

export const PIZZA_SIZES = ['Small', 'Medium', 'Large'];

/** True when the service finds the resource; a NotFoundException means it is missing, anything else is a real error. */
export async function found(probe: () => Promise<unknown>): Promise<boolean> {
	try {
		await probe();
		return true;
	} catch (error) {
		if (error instanceof NotFoundException) return false;
		throw error;
	}
}

/** Services that report failures through Result: a failed fixture aborts the seed with the service's message. */
export function unwrap<T>(label: string, result: Result<T>): T {
	if (result.isFailure) throw new Error(`${label}: ${result.getError()}`);
	return result.getValue();
}
