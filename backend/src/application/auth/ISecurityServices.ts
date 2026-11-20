import { User } from '../../domain/user/User';
import { UserStatus } from '../../domain/user/UserStatus';

export interface IPasswordHasher {
	hash(plainText: string): Promise<string>;
	compare(plainText: string, hashed: string): Promise<boolean>;
}

export interface ITokenService {
	generateToken(user: User): Promise<string>;
	generateSession?(user: User): Promise<{ token: string; refreshToken: string }>;
	refreshSession?(refreshToken: string): Promise<{ token: string; refreshToken: string } | null>;
	verifyToken(token: string): Promise<{ username: string; roles: string[]; status: UserStatus } | null>;
}
