/** Base class for every business-rule violation raised by the domain layer. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
