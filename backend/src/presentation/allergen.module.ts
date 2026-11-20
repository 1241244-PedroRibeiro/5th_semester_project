import { DataSource } from 'typeorm';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';
import { AllergenController } from './http/controllers/AllergenController';
import { AllergenService } from '../application/allergen/AllergenService';
import { IAllergenRepository } from '../application/allergen/IAllergenRepository';
import { PostgresAllergenRepository } from '../infrastructure/persistence/repositories/PostgresAllergenRepository';
import { Allergen } from '../domain/allergen/Allergen';
import { AllergenName } from '../domain/allergen/AllergenName';
import { AuthModule } from './auth.module';
import { RolesGuard } from './http/middlewares/roles.guard';

class InMemoryAllergenRepository implements IAllergenRepository {
	private readonly store = new Map<string, Allergen>();
	async findByName(name: AllergenName): Promise<Allergen | null> { return this.store.get(name.value) ?? null; }
	async findAll(search = ''): Promise<Allergen[]> { return [...this.store.values()].filter(value => value.name.value.toLowerCase().includes(search.trim().toLowerCase())); }
	async save(value: Allergen): Promise<void> { this.store.set(value.name.value, value); }
	async update(value: Allergen): Promise<void> { await this.save(value); }
	async delete(name: AllergenName): Promise<void> { this.store.delete(name.value); }
	async isReferenced(name: AllergenName): Promise<boolean> { return false; }
}

@Module({
	imports: [PersistenceModule, AuthModule],
	controllers: [AllergenController],
	providers: [
		{
			provide: 'IAllergenRepository',
			inject: [DataSource],
			useFactory: (dataSource: DataSource) => {
				if (process.env.USE_IN_MEMORY_REPO === 'true') {
					return new InMemoryAllergenRepository();
				}
				return new PostgresAllergenRepository(dataSource);
			},
		},
		{
			provide: 'AllergenService',
			useFactory: (repo: IAllergenRepository) => new AllergenService(repo),
			inject: ['IAllergenRepository'],
		},
		RolesGuard,
	],
	exports: ['AllergenService'],
})
export class AllergenModule {}
