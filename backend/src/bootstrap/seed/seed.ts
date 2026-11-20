import { UserStatus } from '../../domain/user/UserStatus';
import { UserRole } from '../../application/user/UserRoles';
import { seedCatalogue } from './seed-catalogue';
import { found, PIZZA_SIZES, unwrap } from './seed-helpers';
import type { SeedServices } from './seed-services';

/**
 * Local-development fixtures, created exclusively through the application services so that every
 * row passes domain validation and produces the same audit records as a real request would.
 * Existing non-fixture data is retained. Reserved local fixture accounts are reconciled to their
 * declared roles and statuses on every run so a previously partial seed can repair itself.
 */
export async function seedDatabase(services: SeedServices): Promise<void> {
	await seedAccounts(services);
	await seedTaxonomy(services);
	await seedCatalogue(services);
}

/** Shared development password for the active fixture accounts. Never use outside local development. */
export const FIXTURE_PASSWORD = 'Manager123!';
const ADMINISTRATOR_EMAIL = 'administrator@laprizza.test';

interface AccountFixture { local: string; role: UserRole; status: UserStatus; }

// The administrator comes first: it is the actor recorded for every other fixture's roles and status.
const ACCOUNTS: AccountFixture[] = [
	{ local: 'administrator', role: UserRole.ADMINISTRATOR, status: UserStatus.ACTIVE },
	{ local: 'employee', role: UserRole.EMPLOYEE, status: UserStatus.ACTIVE },
	{ local: 'manager', role: UserRole.MANAGER, status: UserStatus.ACTIVE },
	{ local: 'deactivated-manager', role: UserRole.MANAGER, status: UserStatus.DEACTIVATED },
	{ local: 'pending-manager', role: UserRole.MANAGER, status: UserStatus.PENDING_REGISTRATION },
	{ local: 'customer', role: UserRole.CUSTOMER, status: UserStatus.ACTIVE },
	{ local: 'deactivated-customer', role: UserRole.CUSTOMER, status: UserStatus.DEACTIVATED },
	{ local: 'pending-customer', role: UserRole.CUSTOMER, status: UserStatus.PENDING_REGISTRATION },
];

const LAST_NAMES: Record<UserRole, string> = {
	[UserRole.ADMINISTRATOR]: 'Administrator',
	[UserRole.MANAGER]: 'Manager',
	[UserRole.EMPLOYEE]: 'Staff',
	[UserRole.CUSTOMER]: 'Customer',
};

async function seedAccounts({ auth, users }: SeedServices): Promise<void> {
	const usernames = await usernamesByEmail(users);
	let actor = usernames.get(ADMINISTRATOR_EMAIL);

	// Create/restore every fixture first. The administrator is the first fixture so it can
	// serve as the audit actor for invitations created later in this pass.
	for (const { local, role, status } of ACCOUNTS) {
		const email = `${local}@laprizza.test`;
		const firstName = 'Bruno', lastName = LAST_NAMES[role];
		let username = usernames.get(email);

		if (!username) {
			if (status === UserStatus.PENDING_REGISTRATION) {
				// An invitation is the only supported way to create a pending account.
				const invited = await auth.invite({ email, roleName: role }, requireActor(actor));
				username = invited.username;
			} else {
				const registered = await auth.register({ firstName, lastName, email, password: FIXTURE_PASSWORD });
				username = registered.user.username;
			}
			usernames.set(email, username);
		}

		if (role === UserRole.ADMINISTRATOR)
			actor ??= username;

		let account = await users.getUser(username);
		if (account.status === UserStatus.PENDING_REGISTRATION && status !== UserStatus.PENDING_REGISTRATION) {
			await auth.register({ firstName, lastName, email, password: FIXTURE_PASSWORD });
		}
	}

	// Assign manager roles before removing any stale staff role from other fixtures. This
	// keeps the domain's last-active-manager invariant valid while repairing old seed state.
	const staffFixtures = [
		...ACCOUNTS.filter(fixture => fixture.role === UserRole.MANAGER),
		...ACCOUNTS.filter(fixture => fixture.role !== UserRole.MANAGER && fixture.role !== UserRole.CUSTOMER),
	];
	for (const { local, role } of staffFixtures) {
		const username = usernames.get(`${local}@laprizza.test`)!;
		let account = await users.getUser(username);
		if (account.status === UserStatus.DEACTIVATED) {
			await users.reactivateUser(username, requireActor(actor));
			account = await users.getUser(username);
		}
		const desiredRoles: UserRole[] = [role];
		if (desiredRoles.some(value => !account.roles.includes(value)) || account.roles.some(value => !desiredRoles.includes(value)))
			await users.setRoles(username, { roles: desiredRoles, reason: 'Reconcile local development fixture' }, requireActor(actor));
	}

	// Apply statuses only after all manager roles are assigned. This allows the deactivated-manager
	// fixture to be deactivated without violating the domain rule that at least one manager stays active.
	for (const { local, status } of ACCOUNTS) {
		const username = usernames.get(`${local}@laprizza.test`);
		if (!username) throw new Error(`Seed failed to resolve fixture account '${local}'`);
		const account = await users.getUser(username);
		if (status === UserStatus.DEACTIVATED && account.status !== UserStatus.DEACTIVATED)
			await users.deactivateUser(username, requireActor(actor));
		else if (status === UserStatus.ACTIVE && account.status === UserStatus.DEACTIVATED)
			await users.reactivateUser(username, requireActor(actor));
		else if (status === UserStatus.PENDING_REGISTRATION && account.status !== UserStatus.PENDING_REGISTRATION)
			throw new Error(`Fixture '${local}' must remain pending registration, but is '${account.status}'`);
	}
}

function requireActor(actor: string | undefined): string {
	if (!actor)
		throw new Error(`Seed requires the ${ADMINISTRATOR_EMAIL} account to assign roles and statuses`);
	return actor;
}

async function usernamesByEmail(users: SeedServices['users']): Promise<Map<string, string>> {
	const result = new Map<string, string>();

	for (let page = 1, totalPages = 1; page <= totalPages; page++)
	{
		const current = await users.getAllUsers(page, 100);
		for (const user of current.items)
			result.set(user.email.toLowerCase(), user.username);
		totalPages = current.totalPages;
	}
	return result;
}

const COMPONENT_TYPES = [
	{ name: 'Base Dough', assemblyOrder: 1, minCardinality: 1, maxCardinality: 1 },
	{ name: 'Base Sauce', assemblyOrder: 2, minCardinality: 0, maxCardinality: 1 },
	{ name: 'Cheese', assemblyOrder: 3, minCardinality: 0, maxCardinality: 1 },
	{ name: 'Topping', assemblyOrder: 4, minCardinality: 0, maxCardinality: null },
];
const CATEGORIES = [
	{ name: 'Pizzas', description: 'Pizzas artesanais e pré-definidas' },
	{ name: 'Beverages', description: 'Bebidas refrigeradas e águas' },
	{ name: 'Ingredients', description: 'Ingredientes e componentes de pizza' },
	{ name: 'Sides', description: 'Freshly baked sides to share' },
	{ name: 'Desserts', description: 'Homemade desserts' },
];
const ALLERGENS = [
	{ name: 'Gluten', description: 'Cereais contendo glúten' },
	{ name: 'Lactose', description: 'Leite e derivados incluindo lactose' },
	{ name: 'Crustaceans', description: 'Crustáceos e produtos à base de crustáceos' },
];

async function seedTaxonomy({ componentTypes, sizes, categories, allergens }: SeedServices): Promise<void> {
	for (const type of COMPONENT_TYPES)
		if (!await found(() => componentTypes.getComponentTypeByName(type.name)))
			await componentTypes.createComponentType(type);
	for (const name of PIZZA_SIZES)
		if ((await sizes.getPizzaSizeByName(name)).isFailure)
			unwrap(`Pizza size ${name}`, await sizes.createPizzaSize({ name }));
	for (const category of CATEGORIES)
		if ((await categories.getCategoryByName(category.name)).isFailure)
			unwrap(`Category ${category.name}`, await categories.createCategory(category));
	for (const allergen of ALLERGENS)
		if ((await allergens.getAllergenByName(allergen.name)).isFailure)
			unwrap(`Allergen ${allergen.name}`, await allergens.createAllergen(allergen));
}
