import { UnauthorizedException } from '@nestjs/common';
import { DomainError } from '../../common/DomainError';

export class PizzaComponentTypeConflictError extends DomainError {
  constructor() { super('Component type code, name or assembly order already exists'); }
}

export class PizzaComponentTypeInUseError extends DomainError {
  constructor() { super('Component type is referenced by products or configurations and cannot be deleted'); }
}

export class PizzaComponentTypeNotFoundError extends DomainError {
  constructor() { super('Component type not found'); }
}

export class PizzaComponentUnauthorizedDeletionException extends UnauthorizedException {
  constructor() { super('Given PizzaComponentType cannot be deactivated nor deleted from the application!'); }
}
