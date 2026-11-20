import { Identifier } from '../../common/Identifier';

export class ComponentTypeName extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): ComponentTypeName { return new ComponentTypeName(value); }
}

export { AssemblyOrder } from '../AssemblyOrder';
