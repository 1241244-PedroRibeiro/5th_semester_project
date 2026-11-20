import { PizzaComponentType } from './PizzaComponentType';
import { ComponentTypeName } from './valueObjects';
import { Page, PageRequest } from '../../common/Pagination';

/** Runtime token for injecting the repository interface in NestJS. */
export const PIZZA_COMPONENT_TYPE_REPOSITORY = Symbol('PIZZA_COMPONENT_TYPE_REPOSITORY');

export interface PizzaComponentTypeRepository {
	findAll(search?: string): Promise<PizzaComponentType[]>;
	findAllPaginated(page: PageRequest, search?: string): Promise<Page<PizzaComponentType>>;
	delete(id: ComponentTypeName): Promise<void>;
	isReferenced(id: ComponentTypeName): Promise<boolean>;
	save(type: PizzaComponentType): Promise<void>;
	findById(id: ComponentTypeName): Promise<PizzaComponentType | null>;
	findByName(name: ComponentTypeName): Promise<PizzaComponentType | null>;
}
