import { ValueObject } from './ValueObject';

export interface MoneyProps {
	amount: number;
	currency: string;
}

export class Money extends ValueObject<MoneyProps> {
	get amount(): number {
		return this.props.amount;
	}

	get currency(): string {
		return this.props.currency;
	}

	private constructor(props: MoneyProps) {
		super(props);
	}

	public static create(amount: number, currency: string = 'EUR'): Money {
		if (amount === undefined || amount === null || !Number.isFinite(amount)) {
			throw new Error('Money amount must be a valid number.');
		}

		if (amount < 0) {
			throw new Error('Money amount cannot be negative.');
		}

		const normalizedCurrency = (currency || 'EUR').trim().toUpperCase();

		// Garante que o valor numérico é arredondado a 2 casas decimais
		const roundedAmount = Math.round(amount * 100) / 100;
		if (!Number.isFinite(roundedAmount)) {
			throw new Error('Money amount exceeds the supported number range.');
		}

		return new Money({
			amount: roundedAmount,
			currency: normalizedCurrency,
		});
	}

	public add(other: Money): Money {
		if (this.currency !== other.currency) {
			throw new Error(`Cannot add money with different currencies: ${this.currency} and ${other.currency}.`);
		}
		return Money.create(this.amount + other.amount, this.currency);
	}

	public subtract(other: Money): Money {
		if (this.currency !== other.currency) {
			throw new Error(`Cannot subtract money with different currencies: ${this.currency} and ${other.currency}.`);
		}
		const diff = this.amount - other.amount;
		if (diff < 0) {
			throw new Error('Resulting money amount cannot be negative.');
		}
		return Money.create(diff, this.currency);
	}

	public multiply(factor: number): Money {
		if (!Number.isSafeInteger(factor) || factor < 0) {
			throw new Error('Multiplication factor must be a non-negative integer.');
		}
		return Money.create(this.amount * factor, this.currency);
	}

	public equals(other: Money): boolean {
		if (!other) return false;
		return this.amount === other.amount && this.currency === other.currency;
	}

	public toString(): string {
		return `${this.amount.toFixed(2)} ${this.currency}`;
	}
}
