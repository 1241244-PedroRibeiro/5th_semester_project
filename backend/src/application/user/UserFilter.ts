import { RoleName } from '../../domain/user/RoleName';
import { UserStatus } from '../../domain/user/UserStatus';

export type UserFilter =
	| { type: 'all' }
	| { type: 'creationDate'; from: Date; to: Date }
	| { type: 'role'; role: RoleName }
	| { type: 'roleSearch'; role: RoleName; search: string }
	| { type: 'status'; status: UserStatus };
