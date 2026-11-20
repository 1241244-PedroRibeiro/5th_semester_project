import { ConfigurationId } from './ConfigurationId';
import { Sku } from '../product/Sku';
import { PizzaSizeName } from './PizzaSizeName';
import { Money } from '../common/Money';
import { StockQuantity } from '../stock/StockQuantity';

export interface ComponentSizeConfigurationProps {
	id: ConfigurationId;
	componentSku: Sku;
	pizzaSize: PizzaSizeName;
	price: Money;
	stockUnitsConsumed: StockQuantity;
}

export class ComponentSizeConfiguration {
	private constructor(private readonly props: ComponentSizeConfigurationProps) {}

	static create(props: ComponentSizeConfigurationProps): ComponentSizeConfiguration { return new ComponentSizeConfiguration({ ...props }); }

	changePrice(price: Money): void { this.props.price = price; }
	changeConsumption(stockUnitsConsumed: StockQuantity): void { this.props.stockUnitsConsumed = stockUnitsConsumed; }

	get id(): ConfigurationId { return this.props.id; }
	get componentSku(): Sku { return this.props.componentSku; }
	get pizzaSize(): PizzaSizeName { return this.props.pizzaSize; }
	get price(): Money { return this.props.price; }
	get stockUnitsConsumed(): StockQuantity { return this.props.stockUnitsConsumed; }
}
