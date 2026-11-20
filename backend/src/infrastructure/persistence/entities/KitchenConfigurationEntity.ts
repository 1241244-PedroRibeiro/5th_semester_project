
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('kitchen_configurations')
export class KitchenConfigurationEntity {

    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('varchar', {
        length: 100,
        unique: true,
    })
    name!: string;

    @Column('jsonb')
    json_content!: Record<string, unknown>;

    @Column('boolean', {
        default: false,
    })
    is_active!: boolean;

    @CreateDateColumn({
        type: 'timestamptz',
        default: () => 'NOW()',
    })
    created_at!: Date;

    @UpdateDateColumn({
        type: 'timestamptz',
        default: () => 'NOW()',
    })
    updated_at!: Date;
}
