import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn, Relation, Unique } from 'typeorm';
import { ComponentSizeConfigurationEntity } from './ComponentSizeConfigurationEntity';
import { OrderItemEntity } from './OrderItemEntity';
import { PizzaComponentTypeEntity } from './PizzaComponentTypeEntity';
import { PizzaSnapshotComponentEntity } from './PizzaSnapshotComponentEntity';
import { PredefinedPizzaEntity } from './PredefinedPizzaEntity';
import { PredefinedPizzaRecipeEntity } from './PredefinedPizzaRecipeEntity';
import { ProductAllergenEntity } from './ProductAllergenEntity';
import { ProductCategoryEntity } from './ProductCategoryEntity';
import { StockItemEntity } from './StockItemEntity';

@Entity('products')
@Unique('products_name_key', ['name'])
@Check('products_direct_selling_price_check', `direct_selling_price >= 0`)
@Check('direct_price_pair', `(direct_selling_price IS NULL) = (direct_price_currency IS NULL)`)
@Index('idx_products_category', ['category_name'])
@Index('idx_products_component_type', ['component_type_name'])
@Index('idx_products_name_lower', { synchronize: false })
export class ProductEntity {
	@PrimaryColumn('varchar')
	sku!: string;

	@Column('varchar')
	name!: string;

	@Column('text')
	description!: string;

	@Column('varchar')
	category_name!: string;

	@Column('boolean', { default: false })
	is_sellable!: boolean;

	@Column('boolean', { default: false })
	is_pizza_component!: boolean;

	@Column('boolean', { default: false })
	is_stock_controlled!: boolean;

	@Column('varchar', { nullable: true })
	component_type_name!: string | null;

	@Column('numeric', { nullable: true })
	direct_selling_price!: string | null;

	@Column('varchar', { nullable: true })
	direct_price_currency!: string | null;

	@Column('integer', { nullable: true })
	stock_units_per_sale!: number | null;

	@Column('boolean', { default: true })
	is_active!: boolean;

	@ManyToOne(() => ProductCategoryEntity, value => value.products, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'category_name', referencedColumnName: 'name', foreignKeyConstraintName: 'products_category_name_fkey' })
	category!: Relation<ProductCategoryEntity>;

	@ManyToOne(() => PizzaComponentTypeEntity, value => value.products, { onDelete: 'RESTRICT', nullable: true, cascade: false, eager: false })
	@JoinColumn({ name: 'component_type_name', referencedColumnName: 'name', foreignKeyConstraintName: 'products_component_type_name_fkey' })
	componentType!: Relation<PizzaComponentTypeEntity> | null;

	@OneToMany(() => ProductAllergenEntity, value => value.product, { cascade: false, eager: false })
	allergenAssignments!: Relation<ProductAllergenEntity[]>;

	@OneToMany(() => ComponentSizeConfigurationEntity, value => value.product, { cascade: false, eager: false })
	configurations!: Relation<ComponentSizeConfigurationEntity[]>;

	@OneToOne(() => PredefinedPizzaEntity, value => value.product, { cascade: false, eager: false })
	predefinedPizza!: Relation<PredefinedPizzaEntity>;

	@OneToMany(() => PredefinedPizzaRecipeEntity, value => value.component, { cascade: false, eager: false })
	recipeUsages!: Relation<PredefinedPizzaRecipeEntity[]>;

	@OneToOne(() => StockItemEntity, value => value.product, { cascade: false, eager: false })
	stockItem!: Relation<StockItemEntity>;

	@OneToMany(() => OrderItemEntity, value => value.product, { cascade: false, eager: false })
	orderItems!: Relation<OrderItemEntity[]>;

	@OneToMany(() => PizzaSnapshotComponentEntity, value => value.product, { cascade: false, eager: false })
	snapshotComponents!: Relation<PizzaSnapshotComponentEntity[]>;
}