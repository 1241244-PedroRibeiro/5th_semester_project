
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Converts an HTTP or application error into a message that is safe
 * and understandable for the user.
 *
 * Never display raw server responses or internal exception messages.
 */
export function errorMessage(error: unknown): string {
	if (!(error instanceof HttpErrorResponse)) {
		return 'Something went wrong. Please try again.';
	}

	switch (error.status) {
		case 0:
			return 'Cannot connect to the service. Check your internet connection and try again.';

		case 400:
		case 422:
			return 'Some information is invalid. Check the fields and try again.';

		case 401:
			return 'Your request could not be authenticated. Check your credentials or sign in again.';

		case 403:
			return 'You do not have permission to perform this action.';

		case 404:
			return 'The requested information could not be found. Refresh the page and try again.';

		case 408:
			return 'The request took too long. Check your connection and try again.';

		case 409:
			return 'This action conflicts with the current information. Refresh the page and try again.';

		case 429:
			return 'Too many requests. Please wait a moment and try again.';

		default:
			if (error.status >= 500) {
				return 'The service is temporarily unavailable. Please try again later.';
			}

			return 'The request could not be completed. Please try again.';
	}
}

/**
 * Identifies errors that may be caused by a connection failure.
 * The caller can use this to decide whether to offer a retry action.
 */
export function isConnectionError(error: unknown): boolean {
	return (
		error instanceof HttpErrorResponse &&
		(error.status === 0 || error.status === 408)
	);
}

/**
 * Identifies HTTP responses commonly associated with invalid input.
 * Field-specific validation will be handled separately.
 */
export function isValidationError(error: unknown): boolean {
	return (
		error instanceof HttpErrorResponse &&
		(error.status === 400 || error.status === 422)
	);
}
