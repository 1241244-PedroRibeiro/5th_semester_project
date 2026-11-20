import { Identifier } from '../common/Identifier';

export class ConfigurationId extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): ConfigurationId { return new ConfigurationId(value); }
}
