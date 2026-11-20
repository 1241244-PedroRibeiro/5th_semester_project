import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import { ProductEntity } from './ProductEntity';

@Entity('product_categories')

export class ProductCategoryEntity {
	@PrimaryColumn('varchar')
	name!: string;

	@Column('text', { default: '' })
	description!: string;

	@OneToMany(() => ProductEntity, value => value.category, { cascade: false, eager: false })
	products!: Relation<ProductEntity[]>;
}
