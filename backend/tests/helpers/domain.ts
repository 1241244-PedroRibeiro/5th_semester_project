import { User, UserProps } from '../../src/domain/user/User';
import { Username } from '../../src/domain/user/Username';
import { PersonName } from '../../src/domain/common/PersonName';
import { Email } from '../../src/domain/common/Email';
import { Timestamp } from '../../src/domain/common/Timestamp';
import { PasswordHash } from '../../src/domain/user/PasswordHash';
import { RoleName } from '../../src/domain/user/RoleName';
import { UserStatus } from '../../src/domain/user/UserStatus';
import { Product, ProductProps } from '../../src/domain/product/Product';
import { Sku } from '../../src/domain/product/Sku';
import { ProductName } from '../../src/domain/product/ProductName';
import { ProductFlags } from '../../src/domain/product/ProductFlags';
import { CategoryName } from '../../src/domain/product/product-category/CategoryName';
import { PizzaComponentType } from '../../src/domain/pizza/pizza-component-type/PizzaComponentType';
import { ComponentTypeName, AssemblyOrder } from '../../src/domain/pizza/pizza-component-type/valueObjects';
import { Money } from '../../src/domain/common/Money';
import { cardinalityFromStorage } from '../../src/infrastructure/persistence/mappers/CardinalityMap';
export function userFixture(props: Partial<UserProps> = {}): User {
	const now = Timestamp.create(new Date('2020-01-01Z'));
	return User.create({ username: Username.create('test_e'), name: PersonName.create('Test', 'User'), email: Email.create('test@example.com').getValue(), passwordHash: PasswordHash.create('hash').getValue(), status: UserStatus.ACTIVE, roles: new Set([RoleName.create('CUSTOMER')]), dietaryRestrictions: new Set(), createdAt: now, updatedAt: now, ...props });
}
export function productFixture(props: Partial<ProductProps> = {}): Product {
	return Product.create({ sku: Sku.create('CHEESE'), name: ProductName.create('Cheese'), description: 'Component', category: CategoryName.create('Ingredients'), flags: new ProductFlags(false, true, true), componentType: ComponentTypeName.create('Cheese'), directSellingPrice: Money.create(2), active: true, allergens: new Set(), ...props });
}
export function typeFixture(name = 'Cheese', sequence = 1, minimum = 0, maximum: number | null = null): PizzaComponentType {
	return PizzaComponentType.create({ name: ComponentTypeName.create(name), assemblyOrder: AssemblyOrder.create(sequence).getValue(), cardinality: cardinalityFromStorage(minimum, maximum) });
}
