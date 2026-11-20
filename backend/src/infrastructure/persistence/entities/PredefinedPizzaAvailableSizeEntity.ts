import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { PizzaSizeEntity } from './PizzaSizeEntity';
import { PredefinedPizzaEntity } from './PredefinedPizzaEntity';

@Entity('predefined_pizza_available_sizes')
@Index('idx_predefined_pizza_available_sizes_size', ['pizza_size'])
export class PredefinedPizzaAvailableSizeEntity {
	@PrimaryColumn('varchar')
	pizza_sku!: string;

	@PrimaryColumn('varchar')
	pizza_size!: string;

	@ManyToOne(() => PredefinedPizzaEntity, value => value.availableSizes, { onDelete: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'pizza_sku', referencedColumnName: 'sku', foreignKeyConstraintName: 'predefined_pizza_available_sizes_pizza_sku_fkey' })
	pizza!: Relation<PredefinedPizzaEntity>;

	@ManyToOne(() => PizzaSizeEntity, value => value.availablePizzas, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'pizza_size', referencedColumnName: 'name', foreignKeyConstraintName: 'predefined_pizza_available_sizes_pizza_size_fkey' })
	size!: Relation<PizzaSizeEntity>;
}
