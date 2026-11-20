export interface CreatePizzaComponentTypeDTO {
	name: string;
	assemblyOrder: number;
	minCardinality: number;
	maxCardinality: number | null;
}
/** Omitted fields retain their values; name, when supplied, must match the resource name. */
export type UpdatePizzaComponentTypeDTO = Partial<CreatePizzaComponentTypeDTO>;
export interface PizzaComponentTypeResponseDTO extends CreatePizzaComponentTypeDTO {}
