import { InMemoryUserRepository } from '../../../src/infrastructure/persistence/repositories/InMemoryUserRepository';
import { Username } from '../../../src/domain/user/Username';
import { Email } from '../../../src/domain/common/Email';
import { RoleName } from '../../../src/domain/user/RoleName';
import { userFixture } from '../../helpers/domain';
export async function createCatalogueUserRepository(): Promise<InMemoryUserRepository> {
	const repository = new InMemoryUserRepository();
	for (const [username, email, role] of [['manager_l', 'manager@laprizza.com', 'MANAGER'], ['client_l', 'client@laprizza.com', 'CUSTOMER'], ['administrator_l', 'administrator@laprizza.com', 'ADMINISTRATOR'], ['employee_l', 'employee@laprizza.com', 'EMPLOYEE'], ['mixed_l', 'mixed@laprizza.com', 'ADMINISTRATOR']])
		await repository.save(userFixture({ username: Username.create(username), email: Email.create(email).getValue(), roles: new Set([RoleName.create(role), ...(username === 'mixed_l' ? [RoleName.create('MANAGER')] : [])]) }));
	return repository;
}
