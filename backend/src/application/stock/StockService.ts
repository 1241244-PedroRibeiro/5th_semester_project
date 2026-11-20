import { CategoryName } from '../../domain/product/product-category/CategoryName';
import { Result } from '../../domain/common/Result';
import { StockQuantity } from '../../domain/stock/StockQuantity';
import { Sku } from '../../domain/product/Sku';
import { IStockRepository } from './IStockRepository';
import { StockAdjustmentDTO, StockItemResponseDTO, StockSearchDTO } from './StockDTOs';
export class StockService {
	constructor(private readonly stockRepo: IStockRepository) {}
	async getAllStock(filters: StockSearchDTO = {}): Promise<Result<StockItemResponseDTO[]>> { return Result.ok(await this.stockRepo.findAll({ ...filters, categoryName: filters.categoryName ? CategoryName.create(filters.categoryName) : undefined })); }
	async getStockByProductSku(raw: string): Promise<Result<StockItemResponseDTO>> {
		const item = await this.stockRepo.findByProductSku(Sku.create(raw)); return item ? Result.ok(item) : Result.fail('Stock record not found or product is not stock-controlled');
	}
	async adjustStock(raw: string, dto: StockAdjustmentDTO): Promise<Result<StockItemResponseDTO>> {
		if (!dto || !['INCREASE', 'DECREASE'].includes(dto.adjustmentType)) return Result.fail('Invalid adjustment type');
		if (!Number.isSafeInteger(dto.amount) || dto.amount < 1) return Result.fail('Amount must be a positive integer');
		if (dto.reason !== undefined && typeof dto.reason !== 'string') return Result.fail('Reason must be a string');
		try {
			const quantity = StockQuantity.create(dto.amount);
			const result = await this.stockRepo.withLockedItem(Sku.create(raw), item => {
				if (dto.adjustmentType === 'INCREASE') item.replenish(quantity, dto.reason ?? '');
				else {
					if (!item.hasSufficientStock(quantity)) throw new Error('Insufficient stock');
					item.consume(quantity, dto.reason ?? '');
				}
			});
			return result ? Result.ok(result) : Result.fail('Stock record not found or product is not stock-controlled');
		} catch (error) { return Result.fail(error instanceof Error ? error.message : 'Unable to adjust stock'); }
	}
}
