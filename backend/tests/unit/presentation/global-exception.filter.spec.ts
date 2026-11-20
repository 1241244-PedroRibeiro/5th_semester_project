import { testUnauthorizedAttempts } from '../../helpers/unauthorized-attempts';
import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { DomainError } from '../../../src/domain/common/DomainError';
import {
  PizzaComponentTypeConflictError,
  PizzaComponentTypeInUseError,
  PizzaComponentTypeNotFoundError,
} from '../../../src/domain/pizza/pizza-component-type/PizzaComponentTypeErrors';
import { GlobalExceptionFilter } from '../../../src/presentation/global_exception.filter';

describe('GlobalExceptionFilter pizza component type errors', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [new DomainError('Invalid component type'), 400],
    [new PizzaComponentTypeNotFoundError(), 404],
    [new PizzaComponentTypeConflictError(), 409],
    [new PizzaComponentTypeInUseError(), 409],
    [new BadRequestException('Invalid request'), 400],
  ])('formats %s as HTTP %s', async (error, status) => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host = { switchToHttp: () => ({ getResponse: () => response }) } as ArgumentsHost;

    await new GlobalExceptionFilter(testUnauthorizedAttempts).catch(error, host);

    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({ error: { message: error.message } });
  });

  it('logs infrastructure failures and hides their details', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const error = new Error('Database connection credentials');
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host = { switchToHttp: () => ({ getResponse: () => response }) } as ArgumentsHost;

    await new GlobalExceptionFilter(testUnauthorizedAttempts).catch(error, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: { message: 'Internal Server Error' } });
    expect(log).toHaveBeenCalledWith(error.stack);
  });
});
