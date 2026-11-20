import { ValueObject } from '../common/ValueObject';
import { Timestamp } from '../common/Timestamp';

export class ConsentPreferences extends ValueObject<{ marketingConsent: boolean; consentTimestamp: Timestamp }> {
	constructor(marketingConsent: boolean, consentTimestamp: Timestamp) { super({ marketingConsent, consentTimestamp }); }
	
	get marketingConsent(): boolean { return this.props.marketingConsent; }
	get consentTimestamp(): Timestamp { return this.props.consentTimestamp; }
}
