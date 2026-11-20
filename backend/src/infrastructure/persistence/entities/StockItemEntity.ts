import { Check, Column, Entity, Index, JoinColumn, OneToMany, OneToOne, PrimaryColumn, Relation } from 'typeorm';
import { ProductEntity } from './ProductEntity';
import { StockMovementEntity } from './StockMovementEntity';

@Entity('stock_items')
@Check('stock_items_current_units_check', `current_units >= 0`)
@Index('idx_stock_items_units', ['current_units'])
export class StockItemEntity {
	@PrimaryColumn('varchar')
	product_sku!: string;

	@Column('integer', { default: 0 })
	current_units!: number;

	@Column('timestamptz', { default: () => 'NOW()' })
	created_at!: Date;

	@Column('timestamptz', { default: () => 'NOW()' })
	updated_at!: Date;

	@OneToOne(() => ProductEntity, value => value.stockItem, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'product_sku', referencedColumnName: 'sku', foreignKeyConstraintName: 'stock_items_product_sku_fkey' })
	product!: Relation<ProductEntity>;

	@OneToMany(() => StockMovementEntity, value => value.stockItem, { cascade: false, eager: false })
	movements!: Relation<StockMovementEntity[]>;
}
