import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { StockItemEntity } from './StockItemEntity';

@Entity('stock_movements')
@Check('stock_movements_type_check', `type IN ('REPLENISHMENT', 'CONSUMPTION', 'ADJUSTMENT')`)
@Check('stock_movements_amount_check', `amount >= 0`)
// Baseline SQL manages this index on product_sku, recorded_at DESC.
@Index('idx_stock_movements_prod_date', { synchronize: false })
export class StockMovementEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column('varchar')
	product_sku!: string;

	@Column('varchar')
	type!: string;

	@Column('integer')
	amount!: number;

	@Column('text')
	reason!: string;

	@Column('timestamptz', { default: () => 'NOW()' })
	recorded_at!: Date;

	@ManyToOne(() => StockItemEntity, value => value.movements, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'product_sku', referencedColumnName: 'product_sku', foreignKeyConstraintName: 'stock_movements_product_sku_fkey' })
	stockItem!: Relation<StockItemEntity>;
}
