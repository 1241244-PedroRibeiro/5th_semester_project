import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation, Unique } from 'typeorm';
import { PizzaSizeEntity } from './PizzaSizeEntity';
import { ProductEntity } from './ProductEntity';

@Entity('component_size_configurations')
@Unique('uq_product_size', ['product_sku', 'pizza_size'])
@Check('component_size_configurations_price_check', `price >= 0`)
@Check('component_size_configurations_stock_units_consumed_check', `stock_units_consumed >= 0`)
@Index('idx_configurations_size', ['pizza_size'])
export class ComponentSizeConfigurationEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column('varchar')
	product_sku!: string;

	@Column('varchar')
	pizza_size!: string;

	@Column('numeric')
	price!: string;

	@Column('varchar')
	price_currency!: string;

	@Column('integer')
	stock_units_consumed!: number;

	@ManyToOne(() => ProductEntity, value => value.configurations, { onDelete: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'product_sku', referencedColumnName: 'sku', foreignKeyConstraintName: 'component_size_configurations_product_sku_fkey' })
	product!: Relation<ProductEntity>;

	@ManyToOne(() => PizzaSizeEntity, value => value.configurations, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'pizza_size', referencedColumnName: 'name', foreignKeyConstraintName: 'component_size_configurations_pizza_size_fkey' })
	size!: Relation<PizzaSizeEntity>;
}
