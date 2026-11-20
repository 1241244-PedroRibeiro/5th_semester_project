import { Inject, Injectable } from '@nestjs/common';
import { IProductRepository, PRODUCT_REPOSITORY } from './IProductRepository';
import { IPredefinedPizzaRepository, PREDEFINED_PIZZA_REPOSITORY } from '../pizza/IPredefinedPizzaRepository';
import { COMPONENT_SIZE_CONFIGURATION_REPOSITORY, IComponentSizeConfigurationRepository } from '../pizza/IComponentSizeConfigurationRepository';
import { IStockRepository } from '../stock/IStockRepository';

export interface ProductExportDTO {
    exportedAt: string;
    products: Array<{
        sku: string;
        name: string;
        categoryName: string;
        isSellable: boolean;
        isPizzaComponent: boolean;
        isStockControlled: boolean;
        componentTypeName: string | null;
        stockUnitsPerSale: number | null;
        currentStock: number;
        isActive: boolean;
    }>;
    boms: Array<{
        pizzaSku: string;
        recipeName: string;
        availableSizes: string[];
        lines: Array<{ componentSku: string; defaultQuantity: number }>;
    }>;
    componentSizeConfigurations: Array<{
        componentSku: string;
        pizzaSize: string;
        stockUnitsConsumed: number;
    }>;
}

@Injectable()
export class ProductExportService {
    constructor(
        @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
        @Inject(PREDEFINED_PIZZA_REPOSITORY) private readonly pizzas: IPredefinedPizzaRepository,
        @Inject('IStockRepository') private readonly stock: IStockRepository,
        @Inject(COMPONENT_SIZE_CONFIGURATION_REPOSITORY) private readonly configurations: IComponentSizeConfigurationRepository,
    ) {}

    async export(): Promise<ProductExportDTO> {
        const [products, pizzas, stockItems, configurations] = await Promise.all([
            this.products.findAll(),
            this.pizzas.findAll(),
            this.stock.findAll(),
            this.configurations.findAll(),
        ]);
        const stockBySku = new Map(stockItems.map((item) => [item.productSku, item.currentUnits]));

        return {
            exportedAt: new Date().toISOString(),
            products: products.map((product) => ({
                sku: product.sku.value,
                name: product.name.value,
                categoryName: product.category.value,
                isSellable: product.flags.sellable,
                isPizzaComponent: product.flags.pizzaComponent,
                isStockControlled: product.flags.stockControlled,
                componentTypeName: product.componentType?.value ?? null,
                stockUnitsPerSale: product.stockUnitsPerSale,
                currentStock: stockBySku.get(product.sku.value) ?? 0,
                isActive: product.active,
            })),
            boms: await Promise.all(
                [...new Map(pizzas.map((pizza) => [pizza.id.pizzaSku.value, pizza])).values()]
                    .map(async (pizza) => ({
                        pizzaSku: pizza.id.pizzaSku.value,
                        recipeName: pizza.recipeName,
                        availableSizes: (await this.pizzas.findSupportedSizes(pizza.id.pizzaSku))
                            .map((size) => size.value),
                        lines: [...pizza.recipe].map((line) => ({
                            componentSku: line.componentSku.value,
                            defaultQuantity: line.defaultQuantity,
                        })),
                    })),
            ),
            componentSizeConfigurations: configurations.map(({ configuration }) => ({
                componentSku: configuration.componentSku.value,
                pizzaSize: configuration.pizzaSize.value,
                stockUnitsConsumed: configuration.stockUnitsConsumed.units,
            })),
        };
    }
}
