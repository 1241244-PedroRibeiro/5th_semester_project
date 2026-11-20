export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  private _error: string | null;
  private _value?: T;

  private constructor(isSuccess: boolean, error?: string | null, value?: T) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error');
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs an error message');
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this._error = error ?? null;
    this._value = value;
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error(`Cannot retrieve the value from a failed result: ${this._error}`);
    }
    return this._value as T;
  }

  public getError(): string {
    return this._error ?? '';
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, null, value);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error);
  }
}