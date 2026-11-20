import { User } from '../../domain/user/User';
import { Username } from '../../domain/user/Username';
import { Email } from '../../domain/common/Email';
import { Page, PageRequest } from '../../domain/common/Pagination';
import { UserFilter } from '../user/UserFilter';
import { ExternalIdpSubject } from '../../domain/user/ExternalIdpSubject';
import { UserRole } from '../user/UserRoles';
export { USER_REPOSITORY } from './AuthDTOs';

export interface IUserRepository {
	findFiltered(filter: UserFilter, page: PageRequest): Promise<Page<User>>;
	findByUsername(username: Username): Promise<User | null>;
	findByEmail(email: Email): Promise<User | null>;
	/** Persists the complete aggregate, including optional address and phone number. */
	findByExternalIdpSubject(subject: ExternalIdpSubject): Promise<User | null>;
	save(user: User): Promise<void>;
	saveWithRoleChangeLog?(user: User, entry: {
		actorUsername: string;
		targetUsername: string;
		previousRoles: UserRole[];
		newRoles: UserRole[];
		reason: string | null;
	}): Promise<void>;
	insert(user: User): Promise<void>;
	exists(email: Email): Promise<boolean>;
	countActiveManagers?(): Promise<number>;
	hasCustomer?(username: Username): Promise<boolean>;
}
