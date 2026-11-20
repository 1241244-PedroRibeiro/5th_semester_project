import { ProductService } from '../../../src/application/product/ProductService';
import { InMemoryProductRepository } from '../../../src/infrastructure/persistence/repositories/InMemoryProductRepository';
import { CreateProductDTO } from '../../../src/application/product/ProductDTOs';

describe('ProductService with SKU identities', () => {
    let service: ProductService;

    const dto: CreateProductDTO = {
        sku: 'WATER',
        name: 'Water',
        description: 'Drink',
        categoryName: 'Drinks',
        isSellable: true,
        isPizzaComponent: false,
        isStockControlled: true,
        directSellingPrice: 2,
    };

    beforeEach(() => {
        service = new ProductService(new InMemoryProductRepository());
    });

    it.each([0, 2.5])(
        'creates a priced product (%p)',
        async price => {
            const result = (
                await service.createProduct({
                    ...dto,
                    directSellingPrice: price,
                })
            ).getValue();

            expect(result.sku).toBe('WATER');
            expect(result.directSellingPrice).toBe(price);
            expect(result).not.toHaveProperty('code');
        },
    );

    it.each([null, undefined])(
        'creates a non-sellable pizza component without a direct selling price (%p)',
        async price => {
            const result = await service.createProduct({
                ...dto,
                sku: 'MOZZ',
                name: 'Mozzarella',
                isSellable: false,
                isPizzaComponent: true,
                componentTypeName: 'Cheese',
                directSellingPrice: price,
            });

            expect(result.isSuccess).toBe(true);

            const product = result.getValue();

            expect(product.isSellable).toBe(false);
            expect(product.isPizzaComponent).toBe(true);
            expect(product.directSellingPrice).toBeNull();

            expect(
                (await service.getProducts()).getValue(),
            ).toHaveLength(1);
        },
    );

    it('rejects a sellable product without a direct selling price', async () => {
        const result = await service.createProduct({
            ...dto,
            directSellingPrice: null,
        });

        expect(result.isFailure).toBe(true);

        expect(
            (await service.getProducts()).getValue(),
        ).toEqual([]);
    });

    it('rejects duplicate SKUs', async () => {
        await service.createProduct(dto);

        const result = await service.createProduct(dto);

        expect(result.isFailure).toBe(true);
    });

    it('blocks and activates through the root', async () => {
        await service.createProduct(dto);

        expect(
            (await service.blockProduct('WATER')).getValue().active,
        ).toBe(false);

        expect(
            (await service.activateProduct('WATER')).getValue().active,
        ).toBe(true);
    });

    it('associates and filters allergens by name', async () => {
        await service.createProduct(dto);
        await service.associateAllergen('WATER', 'Milk');
        await service.associateAllergen('WATER', 'Milk');

        expect(
            (
                await service.getProducts({
                    allergenName: 'Milk',
                })
            ).getValue()[0].associatedAllergens,
        ).toEqual(['Milk']);

        expect(
            (
                await service.getProducts({
                    categoryName: 'Food',
                })
            ).getValue(),
        ).toEqual([]);
    });

    it('updates product details successfully', async () => {
        await service.createProduct(dto);

        const result = await service.updateProduct('WATER', {
            name: 'Mineral Water',
            description: 'Updated desc',
        });

        expect(result.isSuccess).toBe(true);
        expect(result.getValue().name).toBe('Mineral Water');
        expect(result.getValue().description).toBe('Updated desc');
        expect(result.getValue().directSellingPrice).toBe(2);
    });
});