import { RelateAllergenUserDTO } from './../../../application/allergen/AllergenDTOs';
import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Header, HttpCode, HttpStatus, Inject, Param, Post, Put, Query, UnauthorizedException } from "@nestjs/common";
import { Authenticated, AuthenticatedUser, CurrentUser, Roles, UserStatuses } from "../middlewares/decorators";
import { UserRole } from "../../../application/user/UserRoles";
import { UserStatus } from "../../../domain/user/UserStatus";
import { AllergenService } from '../../../application/allergen/AllergenService';
import { UserService } from '../../../application/user/UserService';
import { SetUserRolesDTO, CustomerSummaryDTO, SetUserAddressDTO, SetUserPhoneNumberDTO, SetUserNameDTO, SetUserEmailDTO, SetUserPasswordDTO, UserContactResponseDTO, UserResponseDTO } from '../../../application/user/UserDTOs';

@Controller(['user', 'users'])
export class UserController{
	constructor(
		@Inject('AllergenService') private readonly allergenService : AllergenService,
		@Inject(UserService) private readonly userService : UserService,
	) {}

	// * ======================== Getters ======================== * //

	@Get('me/contact-details')
	@Authenticated()
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.OK)
	@Header('Cache-Control', 'no-store')
	async getOwnContacts(@CurrentUser() user: AuthenticatedUser): Promise<UserContactResponseDTO> {
		return this.userService.getOwnContacts(user.username);
	}

	@Get(':username/allergens')
	@Roles(UserRole.CUSTOMER, UserRole.MANAGER)
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.OK)
	async getUserDietaryRestrictions( @CurrentUser() user: AuthenticatedUser,
					@Param('username') username: string) {

		if (user.roles.includes(UserRole.CUSTOMER) && username === user.username)
			return this.userService.getUserAllergens(username);
		if (user.roles.includes(UserRole.MANAGER))
			return this.userService.getCustomerAllergens(username);

		throw new ForbiddenException('You can only view your own dietary restrictions.'); // 403 error
	}

	@Get(':username')
	@Roles(UserRole.CUSTOMER, UserRole.MANAGER, UserRole.ADMINISTRATOR)
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.OK)
	async getUser(@CurrentUser() user: AuthenticatedUser,
				@Param('username') username: string): Promise<UserResponseDTO | CustomerSummaryDTO> {
		if (user.roles.includes(UserRole.ADMINISTRATOR)
				|| user.roles.includes(UserRole.CUSTOMER) && username === user.username) {
			return this.userService.getUser(username);
		}
		if (user.roles.includes(UserRole.MANAGER))
			return this.userService.getCustomerSummary(username);

		throw new ForbiddenException('You can only view your own user information.');
	}




	// * ======================== Post ======================== * //

	@Post(':username/allergen')
	@Roles(UserRole.CUSTOMER, UserRole.MANAGER)
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.CREATED)
	async relateAllergen(@CurrentUser() user: AuthenticatedUser,
				@Param('username') username: string,
				@Body() request : RelateAllergenUserDTO) {
		if (!(user.roles.includes(UserRole.CUSTOMER) && username === user.username)
				&& !user.roles.includes(UserRole.MANAGER))
			throw new ForbiddenException('You can only relate your own dietary restrictions.');

		if (request.allergens.length == 0)
				throw new BadRequestException('No allergens selected to relate to the client!'); // ! check if it is intended behaviour
		const allergenIds = await this.allergenService.checkAllergens(request.allergens);
		if (user.roles.includes(UserRole.CUSTOMER) && username === user.username)
			await this.userService.relateUserAllergens(username, allergenIds);
		else
			await this.userService.relateCustomerAllergens(username, allergenIds);
	}

	@Post(':username/reactivate')
	@Roles(UserRole.ADMINISTRATOR)
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.NO_CONTENT)
	async reactivateUser(@CurrentUser() user: AuthenticatedUser, @Param('username') username: string): Promise<void> {
		await this.userService.reactivateUser(username, user.username);
	}

	@Put(':username/roles')
	@Roles(UserRole.MANAGER)
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.OK)
	async setRoles(@CurrentUser() user: AuthenticatedUser, @Param('username') username: string,
		@Body() body: SetUserRolesDTO): Promise<UserResponseDTO> {
		return this.userService.setRoles(username, body, user.username);
	}

	@Get(':username/role-history')
	@Roles(UserRole.MANAGER)
	@UserStatuses(UserStatus.ACTIVE)
	async getRoleHistory(@Param('username') username: string, @Query('page') page: unknown, @Query('pageSize') pageSize: unknown) {
		const read = (value: unknown, fallback: number) => {
			if (value === undefined) return fallback;
			if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) throw new BadRequestException('Pagination values must be positive integers.');
			return Number(value);
		};
		return this.userService.getRoleHistory(username, read(page, 1), read(pageSize, 20));
	}

	@Put('me/name')
	@Authenticated()
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.OK)
	async setName(@CurrentUser() user: AuthenticatedUser, @Body() body: SetUserNameDTO): Promise<UserResponseDTO> {
		return this.userService.setName(user.username, body);
	}

	@Put('me/email')
	@Authenticated()
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.OK)
	async setEmail(@CurrentUser() user: AuthenticatedUser, @Body() body: SetUserEmailDTO): Promise<UserResponseDTO> {
		return this.userService.setEmail(user.username, body);
	}

	@Put('me/password')
	@Authenticated()
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.OK)
	async setPassword(@CurrentUser() user: AuthenticatedUser, @Body() body: SetUserPasswordDTO): Promise<UserResponseDTO> {
		return this.userService.setPassword(user.username, body);
	}

	@Put('me/address')
	@Authenticated()
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.OK)
	async setAddress(@CurrentUser() user: AuthenticatedUser, @Body() body: SetUserAddressDTO): Promise<UserContactResponseDTO> {
		return this.userService.setAddress(user.username, body);
	}

	@Put('me/phone-number')
	@Authenticated()
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.OK)
	async setPhoneNumber(@CurrentUser() user: AuthenticatedUser, @Body() body: SetUserPhoneNumberDTO): Promise<UserContactResponseDTO> {
		return this.userService.setPhoneNumber(user.username, body);
	}



	// * ======================== Delete ======================== * //

	@Delete(':username')
	@Roles(UserRole.CUSTOMER, UserRole.ADMINISTRATOR)
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.OK)
	async deactivateUser(@CurrentUser() user: AuthenticatedUser,
					@Param('username') username: string) {

		if (user.roles.includes(UserRole.ADMINISTRATOR)
				|| user.roles.includes(UserRole.CUSTOMER) && username === user.username) {
			return this.userService.deactivateUser(username, user.username);
		}
		throw new UnauthorizedException('You are not allowed to deactivate/remove this user!'); // 401 error
	}

}
