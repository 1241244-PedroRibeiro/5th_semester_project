import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Inject, Logger } from '@nestjs/common';
import { UNAUTHORIZED_ATTEMPT_REPOSITORY, IUnauthorizedAttemptRepository } from '../application/auth/IUnauthorizedAttemptRepository';
import type { Request, Response } from 'express';
import { DomainError } from '../domain/common/DomainError';
import { PizzaComponentTypeConflictError, PizzaComponentTypeInUseError, PizzaComponentTypeNotFoundError } from '../domain/pizza/pizza-component-type/PizzaComponentTypeErrors';
import { UserValidationError } from '../domain/user/UserValidationError';

type ErrorClass = new (...args: never[]) => Error;


// * Always register your errors here, so they could be caught by the error handler
// * and create the http response! Example:  [InvalidRequestBodyError, 400].
const ERROR_STATUS: Array<[ErrorClass, number]> = [
	[UserValidationError, 400],
	[PizzaComponentTypeNotFoundError, 404],
	[PizzaComponentTypeConflictError, 409],
	[PizzaComponentTypeInUseError, 409],
	// Specific domain errors must precede the base validation error.
	[DomainError, 400],
];


@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(GlobalExceptionFilter.name);

	constructor(@Inject(UNAUTHORIZED_ATTEMPT_REPOSITORY) private readonly attempts: IUnauthorizedAttemptRepository) {}

	async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
		const response = host.switchToHttp().getResponse<Response>();
		const { status, message } = this.toHttpError(exception);

		if (status === 403) {
			const request = host.switchToHttp().getRequest<Request & { user?: { username?: unknown } }>();
			const username = request.user?.username;
			const route: unknown = request.route?.path;
			// Only authenticated identities and registered route patterns enter the audit table.
			// Never persist request URLs, query parameters, headers, or bodies.
			if (typeof username === 'string' && typeof route === 'string') {
				try {
					await this.attempts.record(username, `${request.method} ${request.baseUrl || ''}${route}`);
				} catch {
					// An audit storage failure must not turn a denied operation into an allowed one.
					this.logger.error('Failed to persist unauthorized access attempt.');
				}
			}
		}

		if (status === 429 && exception instanceof HttpException) {
			const body = exception.getResponse();
			const retry = typeof body === 'object' && body !== null ? (body as { retryAfterSeconds?: unknown }).retryAfterSeconds : undefined;
			if (typeof retry === 'number' && Number.isInteger(retry) && retry > 0)
				response.set('Retry-After', String(retry));
		}

		if (status === 401)
			response.set('WWW-Authenticate', 'Bearer');
		response.status(status).json({ error: { message } });
	}


	private toHttpError(exception: unknown): { status: number; message: string } {
		// 1. Nest exceptions: guards (401, 403), ValidationPipe (400), NotFoundException (404)...
		if (exception instanceof HttpException)
			return { status: exception.getStatus(), message: this.readMessage(exception) };

		// 2. Your own application errors
		for (const [errorClass, status] of ERROR_STATUS)
		{
			if (exception instanceof errorClass)
				return { status, message: (exception as Error).message };
		}

		// 3. Anything else is an infrastructure failure (log and return 500)
		this.logger.error(exception instanceof Error ? exception.stack : String(exception));
		return { status: 500, message: 'Internal Server Error' };
	}

	/** HttpException responses are a string, or an object whose `message` may be an array. */
	private readMessage(exception: HttpException): string {
		const body = exception.getResponse();

		if (typeof body === 'string')
			return body;
		const message = (body as { message?: string | string[] }).message;
		return Array.isArray(message) ? message.join('; ') : (message ?? exception.message);
	}
}
