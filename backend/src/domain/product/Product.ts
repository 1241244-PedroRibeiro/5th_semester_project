import { Sku } from './Sku';
import { ProductName } from './ProductName';
import { ProductFlags } from './ProductFlags';
import { CategoryName } from './product-category/CategoryName';
import { AllergenName } from '../allergen/AllergenName';
import { ComponentTypeName } from '../pizza/pizza-component-type/valueObjects';
import { Money } from '../common/Money';
import { DomainError } from '../common/DomainError';

export interface ProductProps {
    sku: Sku;
    name: ProductName;
    description: string;
    category: CategoryName;
    flags: ProductFlags;
    componentType?: ComponentTypeName;
    directSellingPrice?: Money | null;
    stockUnitsPerSale?: number | null;
    active: boolean;
    allergens: Set<AllergenName>;
}

type StoredProductProps = Omit<
    ProductProps,
    'directSellingPrice' | 'stockUnitsPerSale'
> & {
    directSellingPrice: Money | null;
    stockUnitsPerSale: number | null;
};

export class Product {
    private constructor(
        private readonly props: StoredProductProps,
    ) {}

    static create(props: ProductProps): Product {
        if (!props.flags.isConsistent()) {
            throw new DomainError(
                'A product must be sellable, a pizza component, or both',
            );
        }

        if (props.flags.pizzaComponent && !props.componentType) {
            throw new DomainError(
                'A pizza component must have exactly one component type',
            );
        }

        if (!props.flags.pizzaComponent && props.componentType) {
            throw new DomainError(
                'A non-component product cannot have a component type',
            );
        }

        const directSellingPrice = props.directSellingPrice ?? null;

        if (props.flags.sellable && directSellingPrice === null) {
            throw new DomainError(
                'A sellable product must have a direct selling price',
            );
        }

        if (
            directSellingPrice !== null &&
            !(directSellingPrice instanceof Money)
        ) {
            throw new DomainError(
                'Direct selling price must be a valid Money value',
            );
        }

        const stockUnitsPerSale = props.stockUnitsPerSale ?? null;

        const allergens = new Map(
            [...props.allergens].map(allergen => [
                allergen.value,
                allergen,
            ]),
        );

        return new Product({
            ...props,
            directSellingPrice,
            stockUnitsPerSale,
            allergens: new Set(allergens.values()),
        });
    }

    get sku(): Sku {
        return this.props.sku;
    }

    get name(): ProductName {
        return this.props.name;
    }

    get description(): string {
        return this.props.description;
    }

    get category(): CategoryName {
        return this.props.category;
    }

    get flags(): ProductFlags {
        return this.props.flags;
    }

    get componentType(): ComponentTypeName | undefined {
        return this.props.componentType;
    }

    get directSellingPrice(): Money | null {
        return this.props.directSellingPrice;
    }

    get stockUnitsPerSale(): number | null {
        return this.props.stockUnitsPerSale;
    }

    get active(): boolean {
        return this.props.active;
    }

    get allergens(): Set<AllergenName> {
        return new Set(this.props.allergens);
    }

    changeCategory(category: CategoryName): void {
        this.props.category = category;
    }

    addAllergen(allergen: AllergenName): void {
        const alreadyExists = [...this.props.allergens].some(
            entry => entry.equals(allergen),
        );

        if (!alreadyExists) {
            this.props.allergens.add(allergen);
        }
    }

    removeAllergen(allergen: AllergenName): void {
        for (const entry of this.props.allergens) {
            if (entry.equals(allergen)) {
                this.props.allergens.delete(entry);
            }
        }
    }

    setDirectSellingPrice(price: Money | null): void {
        if (this.props.flags.sellable && price === null) {
            throw new DomainError(
                'A sellable product must have a direct selling price',
            );
        }

        if (price !== null && !(price instanceof Money)) {
            throw new DomainError(
                'Direct selling price must be Money or null',
            );
        }

        this.props.directSellingPrice = price;
    }

    designateAsPizzaComponent(
        componentType: ComponentTypeName,
    ): void {
        this.props.componentType = componentType;

        this.props.flags = new ProductFlags(
            this.props.flags.sellable,
            true,
            this.props.flags.stockControlled,
        );
    }

    activate(): void {
        this.props.active = true;
    }

    deactivate(): void {
        this.props.active = false;
    }

    updateDetails(
        name: ProductName,
        description: string,
        category: CategoryName,
        flags: ProductFlags,
        componentType?: ComponentTypeName,
        directSellingPrice?: Money | null,
        stockUnitsPerSale?: number | null,
    ): void {
        if (!flags.isConsistent()) {
            throw new DomainError(
                'A product must be sellable, a pizza component, or both',
            );
        }

        if (flags.pizzaComponent && !componentType) {
            throw new DomainError(
                'Pizza components must be associated with a component type.',
            );
        }

        if (!flags.pizzaComponent && componentType) {
            throw new DomainError(
                'Non-component products cannot have a component type.',
            );
        }


        const nextDirectSellingPrice =
            directSellingPrice !== undefined
                ? directSellingPrice
                : this.props.directSellingPrice;

        if (
            flags.sellable &&
            nextDirectSellingPrice === null
        ) {
            throw new DomainError(
                'A sellable product must have a direct selling price',
            );
        }

        if (
            nextDirectSellingPrice !== null &&
            !(nextDirectSellingPrice instanceof Money)
        ) {
            throw new DomainError(
                'Direct selling price must be a valid Money value',
            );
        }

        const nextStockUnitsPerSale =
            stockUnitsPerSale !== undefined
                ? stockUnitsPerSale
                : this.props.stockUnitsPerSale;

        this.props.name = name;
        this.props.description = description;
        this.props.category = category;
        this.props.flags = flags;
        this.props.componentType = componentType;
        this.props.directSellingPrice = nextDirectSellingPrice;
        this.props.stockUnitsPerSale = nextStockUnitsPerSale;
    }
}