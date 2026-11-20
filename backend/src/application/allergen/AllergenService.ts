import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IAllergenRepository } from './IAllergenRepository';
import { CreateAllergenDTO, UpdateAllergenDTO, AllergenResponseDTO } from './AllergenDTOs';
import { Allergen } from '../../domain/allergen/Allergen';
import { AllergenName } from '../../domain/allergen/AllergenName';
import { Result } from '../../domain/common/Result';

@Injectable()
export class AllergenService {
	constructor(
		@Inject('IAllergenRepository')
		private readonly allergenRepo: IAllergenRepository,
	) {}

	public async createAllergen(dto: CreateAllergenDTO): Promise<Result<AllergenResponseDTO>> {
		const name = AllergenName.create(dto.name);
		if (await this.allergenRepo.findByName(name)) {
			return Result.fail<AllergenResponseDTO>('Allergen name already exists');
		}

		const value = Allergen.create({ name, description: dto.description ?? '' });
		await this.allergenRepo.save(value);
		return Result.ok<AllergenResponseDTO>(this.toDTO(value));
	}

	public async getAllergens(search?: string): Promise<Result<AllergenResponseDTO[]>> {
		const list = await this.allergenRepo.findAll(search);
		return Result.ok<AllergenResponseDTO[]>(list.map((value) => this.toDTO(value)));
	}

	public async getAllergenByName(raw: string): Promise<Result<AllergenResponseDTO>> {
		const value = await this.allergenRepo.findByName(AllergenName.create(raw));
		return value
			? Result.ok<AllergenResponseDTO>(this.toDTO(value))
			: Result.fail<AllergenResponseDTO>('Allergen not found');
	}

	public async updateAllergen(raw: string, dto: UpdateAllergenDTO): Promise<Result<AllergenResponseDTO>> {
		const currentName = AllergenName.create(raw);
		const allergen = await this.allergenRepo.findByName(currentName);
		if (!allergen) {
			return Result.fail<AllergenResponseDTO>('Allergen not found');
		}

		const newName = AllergenName.create(dto.name);

		if (newName.value !== currentName.value) {
			const existing = await this.allergenRepo.findByName(newName);
			if (existing) {
				return Result.fail<AllergenResponseDTO>('Allergen name already exists');
			}

			const isReferenced = await this.allergenRepo.isReferenced(currentName);
			if (isReferenced) {
				return Result.fail<AllergenResponseDTO>(
					'Allergen is referenced by existing business information and cannot be renamed',
				);
			}

			await this.allergenRepo.delete(currentName);
		}

		const updatedAllergen = Allergen.create({
			name: newName,
			description: dto.description ?? '',
		});

		await this.allergenRepo.save(updatedAllergen);
		return Result.ok<AllergenResponseDTO>(this.toDTO(updatedAllergen));
	}

	public async deleteAllergen(raw: string): Promise<Result<void>> {
		const name = AllergenName.create(raw);
		if (!(await this.allergenRepo.findByName(name))) {
			return Result.fail<void>('Allergen not found');
		}
		if (await this.allergenRepo.isReferenced(name)) {
			return Result.fail<void>(
				'Allergen is referenced by existing business information and cannot be deleted',
			);
		}

		await this.allergenRepo.delete(name);
		return Result.ok<void>();
	}

	public async checkAllergens(names: string[]): Promise<string[]> {
		for (const name of names) {
			if (!(await this.allergenRepo.findByName(AllergenName.create(name)))) {
				throw new BadRequestException('Asked to relate an unregistered Allergen!');
			}
		}
		return names;
	}

	private toDTO(value: Allergen): AllergenResponseDTO {
		return {
			name: value.name.value,
			description: value.description,
		};
	}
}