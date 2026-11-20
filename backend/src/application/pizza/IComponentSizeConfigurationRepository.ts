import { ComponentSizeConfiguration } from '../../domain/pizza/ComponentSizeConfiguration';
import { ConfigurationId } from '../../domain/pizza/ConfigurationId';
import { Sku } from '../../domain/product/Sku';
import { PizzaSizeName } from '../../domain/pizza/PizzaSizeName';
export const COMPONENT_SIZE_CONFIGURATION_REPOSITORY = 'COMPONENT_SIZE_CONFIGURATION_REPOSITORY';
export interface ConfigurationRecord {
	configuration: ComponentSizeConfiguration;
	productName: string;
	stockControlled: boolean;
}
export interface IComponentSizeConfigurationRepository {
	validateReferences(componentSku: Sku, pizzaSize: PizzaSizeName): Promise<boolean>;
	save(configuration: ComponentSizeConfiguration): Promise<void>;
	findById(id: ConfigurationId): Promise<ConfigurationRecord | null>;
	findAll(search?: string, componentSku?: Sku, pizzaSize?: PizzaSizeName): Promise<ConfigurationRecord[]>;
	findByProduct(componentSku: Sku): Promise<ConfigurationRecord[]>;
	delete(id: ConfigurationId): Promise<boolean>;
	isUsedByPredefinedPizza(componentSku: Sku, pizzaSize: PizzaSizeName, ): Promise<boolean>;
}
