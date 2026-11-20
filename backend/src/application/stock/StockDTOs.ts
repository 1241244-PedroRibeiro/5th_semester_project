export type StockOperation = 'INCREASE' | 'DECREASE';

export interface StockAdjustmentDTO {
	adjustmentType: StockOperation;
	amount: number;
	reason?: string;
}

export interface StockItemResponseDTO {
	productSku: string;
	productName: string;
	currentUnits: number;
	updatedAt: string;
}

export interface StockSearchDTO {
	search?: string;
	categoryName?: string;
	lowStock?: boolean;
	active?: boolean;
}
