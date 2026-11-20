
//* --------------------- Constants --------------------- *//

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

/** Failure messages shared by the service and the controller. */
export const AuthFailure = {
	EmailTaken: 'User with this email already exists',
	InvalidCredentials: 'Invalid email or password',
	AccountDeactivated: 'User account is deactivated',
	WeakPassword: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character',
} as const;


//* --------------------- DTOs --------------------- *//

export interface InviteUserDTO {
	email: string;
	roleName: string;
	activationMode?: 'LOCAL_ACCOUNT_ACTIVATION' | 'EXTERNAL_IDP_MATCH';
}

export interface InviteRegisterUserDTO {
	firstName: string;
	lastName: string;
	email: string;
	roleName : string;
	activationMode?: 'LOCAL_ACCOUNT_ACTIVATION' | 'EXTERNAL_IDP_MATCH';
}

export interface RegisterUserDTO {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
}

export interface LoginDTO {
	email: string;
	password: string;
}

export interface ResendActivationDTO {
	email: string;
}

export interface ActivateAccountDTO {
	token: string;
	password: string;
}

export interface AuthResponseDTO {
	token: string;
	refreshToken?: string;
	user: {
		username: string;
		firstName: string;
		lastName: string;
		createdAt: string;
		updatedAt: string;
		email: string;
		roles: string[];
		status: string;
	};
}

export interface RefreshTokenDTO {
	refreshToken: string;
}
