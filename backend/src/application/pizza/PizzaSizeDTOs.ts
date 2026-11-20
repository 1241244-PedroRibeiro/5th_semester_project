export interface CreatePizzaSizeDTO {
	name: string;
}

export interface UpdatePizzaSizeDTO {
	name: string;
	active?: boolean;
}

export interface PizzaSizeResponseDTO {
	name: string;
	active: boolean;
}
