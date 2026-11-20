import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { AllergenEntity } from './AllergenEntity';
import { ProductEntity } from './ProductEntity';

@Entity('product_allergens')
@Index('idx_product_allergens_allergen', ['allergen_name'])
export class ProductAllergenEntity {
	@PrimaryColumn('varchar')
	product_sku!: string;

	@PrimaryColumn('varchar')
	allergen_name!: string;

	@ManyToOne(() => ProductEntity, value => value.allergenAssignments, { onDelete: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'product_sku', referencedColumnName: 'sku', foreignKeyConstraintName: 'product_allergens_product_sku_fkey' })
	product!: Relation<ProductEntity>;

	@ManyToOne(() => AllergenEntity, value => value.productAssignments, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'allergen_name', referencedColumnName: 'name', foreignKeyConstraintName: 'product_allergens_allergen_name_fkey' })
	allergen!: Relation<AllergenEntity>;
}
