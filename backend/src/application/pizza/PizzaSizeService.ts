import { Inject, Injectable } from '@nestjs/common';
import { IPizzaSizeRepository, PIZZA_SIZE_REPOSITORY } from './IPizzaSizeRepository';
import { CreatePizzaSizeDTO, UpdatePizzaSizeDTO, PizzaSizeResponseDTO } from './PizzaSizeDTOs';
import { PizzaSize } from '../../domain/pizza/PizzaSize';
import { PizzaSizeName } from '../../domain/pizza/PizzaSizeName';
import { Result } from '../../domain/common/Result';

@Injectable()
export class PizzaSizeService {
	constructor(@Inject(PIZZA_SIZE_REPOSITORY) private readonly sizeRepo: IPizzaSizeRepository) {}

	async createPizzaSize(dto: CreatePizzaSizeDTO): Promise<Result<PizzaSizeResponseDTO>> {
		const name = PizzaSizeName.create(dto.name);

		if (await this.sizeRepo.findByName(name))
			return Result.fail('PizzaSize name already exists');
		const value = PizzaSize.create({ name, active: true });

		await this.sizeRepo.save(value);
		return Result.ok(this.toDTO(value));
	}

	async getPizzaSizes(search?: string): Promise<Result<PizzaSizeResponseDTO[]>> {
		return Result.ok((await this.sizeRepo.findAll(search)).map(value => this.toDTO(value)));
	}

	async getPizzaSizeByName(raw: string): Promise<Result<PizzaSizeResponseDTO>> {
		const value = await this.sizeRepo.findByName(PizzaSizeName.create(raw));
		return value ? Result.ok(this.toDTO(value)) : Result.fail('PizzaSize not found');
	}

	async updatePizzaSize(raw: string, dto: UpdatePizzaSizeDTO): Promise<Result<PizzaSizeResponseDTO>> {
		const oldName = PizzaSizeName.create(raw);
		const existingSize = await this.sizeRepo.findByName(oldName);

		if (!existingSize)
			return Result.fail('PizzaSize not found');

		const nameChanged = dto.name && dto.name !== raw;

		if (nameChanged) {
			const newName = PizzaSizeName.create(dto.name!);
			if (await this.sizeRepo.findByName(newName))
				return Result.fail('PizzaSize name already exists');

			if (await this.sizeRepo.isReferenced(oldName)) {
				return Result.fail('PizzaSize is referenced by existing business information and cannot be renamed');
			}

			await this.sizeRepo.delete(oldName);
			existingSize.changeName(newName);
		}

		if (dto.active !== undefined) {
			if (dto.active) existingSize.activate();
			else existingSize.deactivate();
		}

		if (nameChanged) {
			await this.sizeRepo.save(existingSize);
		} else {
			await this.sizeRepo.update(existingSize);
		}

		return Result.ok(this.toDTO(existingSize));
	}

	async deletePizzaSize(raw: string): Promise<Result<void>> {
		const name = PizzaSizeName.create(raw);
		if (!await this.sizeRepo.findByName(name))
			return Result.fail('PizzaSize not found');

		if (await this.sizeRepo.isReferenced(name))
			return Result.fail('PizzaSize is referenced by existing business information and cannot be deleted');

		await this.sizeRepo.delete(name);
		return Result.ok();
	}

	private toDTO(value: PizzaSize): PizzaSizeResponseDTO {
		return { name: value.name.value, active: value.active };
	}
}
