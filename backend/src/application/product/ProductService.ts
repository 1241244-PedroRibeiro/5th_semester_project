import { Inject, Injectable } from '@nestjs/common';
import {
    IProductRepository,
    PRODUCT_REPOSITORY,
} from './IProductRepository';
import {
    CreateProductDTO,
    UpdateProductDTO,
    ProductResponseDTO,
    ProductFilterQuery,
} from './ProductDTOs';
import { Product } from '../../domain/product/Product';
import { ProductName } from '../../domain/product/ProductName';
import { ProductFlags } from '../../domain/product/ProductFlags';
import { Sku } from '../../domain/product/Sku';
import { CategoryName } from '../../domain/product/product-category/CategoryName';
import { ComponentTypeName } from '../../domain/pizza/pizza-component-type/valueObjects';
import { AllergenName } from '../../domain/allergen/AllergenName';
import { Money } from '../../domain/common/Money';
import { Result } from '../../domain/common/Result';
import { DomainError } from '../../domain/common/DomainError';

@Injectable()
export class ProductService {
    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepo: IProductRepository,
    ) {}

    private parseMoney(price: number | null | undefined): Money | null {
        if (price == null) return null;
        return Money.create(price);
    }

    async createProduct(
        dto: CreateProductDTO,
    ): Promise<Result<ProductResponseDTO>> {
        try {
            const sku = Sku.create(dto.sku);

            if (await this.productRepo.findBySku(sku)) {
                return Result.fail('Product SKU already exists');
            }

            const flags = new ProductFlags(
                dto.isSellable,
                dto.isPizzaComponent,
                dto.isStockControlled,
            );

            const componentType = dto.componentTypeName
                ? ComponentTypeName.create(dto.componentTypeName)
                : undefined;

            const directPrice = this.parseMoney(dto.directSellingPrice);

            const product = Product.create({
                sku,
                name: ProductName.create(dto.name),
                description: dto.description,
                category: CategoryName.create(dto.categoryName),
                flags,
                componentType,
                directSellingPrice: directPrice,
                active: true,
                allergens: new Set(),
            });

            await this.productRepo.save(product);
            return Result.ok(this.toDTO(product));
        } catch (error) {
            if (error instanceof DomainError) {
                return Result.fail(error.message);
            }
            if (error instanceof Error) {
                return Result.fail(error.message);
            }

            return Result.fail('Unable to create product');
        }
    }

    async getProducts(
        filter?: ProductFilterQuery,
    ): Promise<Result<ProductResponseDTO[]>> {
        const products = await this.productRepo.findAll({
            ...filter,
            categoryName: filter?.categoryName
                ? CategoryName.create(filter.categoryName)
                : undefined,
            allergenName: filter?.allergenName
                ? AllergenName.create(filter.allergenName)
                : undefined,
            componentTypeName: filter?.componentTypeName
                ? ComponentTypeName.create(filter.componentTypeName)
                : undefined,
        });

        return Result.ok(products.map(product => this.toDTO(product)));
    }

    async getProductBySku(
        raw: string,
    ): Promise<Result<ProductResponseDTO>> {
        const product = await this.productRepo.findBySku(Sku.create(raw));

        return product
            ? Result.ok(this.toDTO(product))
            : Result.fail('Product not found');
    }

    async updateProduct(
        raw: string,
        dto: UpdateProductDTO,
    ): Promise<Result<ProductResponseDTO>> {
        try {
            const sku = Sku.create(raw);
            const product = await this.productRepo.findBySku(sku);

            if (!product) {
                return Result.fail('Product not found');
            }

            const name = ProductName.create(dto.name);

            const category = dto.categoryName
                ? CategoryName.create(dto.categoryName)
                : product.category;

            const flags = new ProductFlags(
                dto.isSellable ?? product.flags.sellable,
                dto.isPizzaComponent ?? product.flags.pizzaComponent,
                dto.isStockControlled ?? product.flags.stockControlled,
            );

            const componentType =
                dto.componentTypeName !== undefined
                    ? dto.componentTypeName
                        ? ComponentTypeName.create(dto.componentTypeName)
                        : undefined
                    : product.componentType;

            const directPrice =
                dto.directSellingPrice !== undefined
                    ? this.parseMoney(dto.directSellingPrice)
                    : product.directSellingPrice;

            product.updateDetails(
                name,
                dto.description,
                category,
                flags,
                componentType,
                directPrice,
            );

            await this.productRepo.update(product);
            return Result.ok(this.toDTO(product));
        } catch (error) {
            if (error instanceof DomainError) {
                return Result.fail(error.message);
            }
            if (error instanceof Error) {
                return Result.fail(error.message);
            }

            return Result.fail('Unable to update product');
        }
    }

    async blockProduct(
        raw: string,
    ): Promise<Result<ProductResponseDTO>> {
        const product = await this.productRepo.findBySku(Sku.create(raw));

        if (!product) {
            return Result.fail('Product not found');
        }

        product.deactivate();
        await this.productRepo.update(product);

        return Result.ok(this.toDTO(product));
    }

    async activateProduct(
        raw: string,
    ): Promise<Result<ProductResponseDTO>> {
        const product = await this.productRepo.findBySku(Sku.create(raw));

        if (!product) {
            return Result.fail('Product not found');
        }

        product.activate();
        await this.productRepo.update(product);

        return Result.ok(this.toDTO(product));
    }

    async associateAllergen(
        raw: string,
        name: string,
    ): Promise<Result<ProductResponseDTO>> {
        const product = await this.productRepo.findBySku(Sku.create(raw));

        if (!product) {
            return Result.fail('Product not found');
        }

        product.addAllergen(AllergenName.create(name));
        await this.productRepo.update(product);

        return Result.ok(this.toDTO(product));
    }

    private toDTO(product: Product): ProductResponseDTO {
        return {
            sku: product.sku.value,
            name: product.name.value,
            description: product.description,
            categoryName: product.category.value,
            isSellable: product.flags.sellable,
            isPizzaComponent: product.flags.pizzaComponent,
            isStockControlled: product.flags.stockControlled,
            componentTypeName: product.componentType?.value ?? null,
            directSellingPrice: product.directSellingPrice?.amount ?? null,
            active: product.active,
            associatedAllergens: [...product.allergens].map(
                allergen => allergen.value,
            ),
        };
    }
}