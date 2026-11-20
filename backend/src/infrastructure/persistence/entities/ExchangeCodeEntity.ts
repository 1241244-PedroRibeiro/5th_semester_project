import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'external_exchange_codes' })
export class ExchangeCodeEntity {
	@PrimaryColumn({ name: 'code_hash', type: 'varchar' })
	code_hash!: string;

	@Column({ type: 'varchar' })
	username!: string;

	@Column({ name: 'expires_at', type: 'timestamptz' })
	expires_at!: Date;

	@Column({ name: 'used_at', type: 'timestamptz', nullable: true })
	used_at!: Date | null;
}
