import type { INestApplicationContext } from '@nestjs/common';
import { AuthService } from '../../application/auth/AuthService';
import { ActivationInvitationService } from '../../application/auth/ActivationInvitationService';
import { PASSWORD_HASHER, TOKEN_SERVICE, USER_REPOSITORY } from '../../application/auth/AuthDTOs';
import { AUTH_SESSION_REPOSITORY } from '../../application/auth/IAuthSessionRepository';
import type { IInvitationMailer } from '../../application/auth/IInvitationMailer';
import { AllergenService } from '../../application/allergen/AllergenService';
import { CategoryService } from '../../application/catalogue/CategoryService';
import { ComponentSizeConfigurationService } from '../../application/pizza/ComponentSizeConfigurationService';
import { PizzaComponentTypeService } from '../../application/pizza/PizzaComponentTypeService';
import { PizzaSizeService } from '../../application/pizza/PizzaSizeService';
import { PredefinedPizzaService } from '../../application/pizza/PredefinedPizzaService';
import { ProductService } from '../../application/product/ProductService';
import { StockService } from '../../application/stock/StockService';
import { RolesAssignmentService } from '../../application/user/RolesAssignmentService';
import { StatusAssignmentService } from '../../application/user/StatusAssignmentService';
import { UserService } from '../../application/user/UserService';

/** The application services the development seed is allowed to use. It never touches repositories or tables. */
export interface SeedServices {
	auth: AuthService;
	users: UserService;
	allergens: AllergenService;
	categories: CategoryService;
	componentTypes: PizzaComponentTypeService;
	sizes: PizzaSizeService;
	products: ProductService;
	stock: StockService;
	configurations: ComponentSizeConfigurationService;
	pizzas: PredefinedPizzaService;
}

/** Fixture accounts use reserved `.test` addresses: invitations are recorded as usual but never emailed. */
const silentInvitationMailer: IInvitationMailer = { sendInvitation: async () => undefined };

/** Resolves the services from a booted application (or testing) module, so the seed runs the real wiring. */
export function resolveSeedServices(app: Pick<INestApplicationContext, 'get'>): SeedServices {
	const get = <T>(token: unknown): T => app.get<T>(token as never, { strict: false });
	return {
		// Same dependencies as the registered AuthService, except for the invitation mailer above.
		auth: new AuthService(
			get(USER_REPOSITORY), get(PASSWORD_HASHER), get(TOKEN_SERVICE), get(AUTH_SESSION_REPOSITORY),
			new ActivationInvitationService(get(USER_REPOSITORY), silentInvitationMailer),
			get(StatusAssignmentService), get(RolesAssignmentService),
		),
		users: get(UserService),
		allergens: get('AllergenService'),
		categories: get('CategoryService'),
		componentTypes: get(PizzaComponentTypeService),
		sizes: get(PizzaSizeService),
		products: get(ProductService),
		stock: get('StockService'),
		configurations: get(ComponentSizeConfigurationService),
		pizzas: get(PredefinedPizzaService),
	};
}
