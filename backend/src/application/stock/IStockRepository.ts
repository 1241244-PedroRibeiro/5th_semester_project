import { CategoryName } from '../../domain/product/product-category/CategoryName';
import { Sku } from '../../domain/product/Sku';
import { StockItem } from '../../domain/stock/StockItem';
import { StockItemResponseDTO, StockSearchDTO } from './StockDTOs';
export interface StockFilter extends Omit<StockSearchDTO, 'categoryName'> { categoryName?: CategoryName; }
export interface IStockRepository {
	findAll(filters?: StockFilter): Promise<StockItemResponseDTO[]>;
	findByProductSku(sku: Sku): Promise<StockItemResponseDTO | null>;
	withLockedItem(sku: Sku, mutate: (item: StockItem) => void): Promise<StockItemResponseDTO | null>;
}
