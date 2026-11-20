import argon2 from 'argon2';
import { IPasswordHasher } from '../../application/auth/ISecurityServices';

export class Argon2Hasher implements IPasswordHasher {
	
	public async hash(plainText: string): Promise<string> {
		return argon2.hash(plainText, {
			type: argon2.argon2id,
			memoryCost: 2 ** 16, // 64 MB (OWASP recommendation)
			timeCost: 3,        // 3 iterações
			parallelism: 1
			});
	}

	public async compare(plainText: string, hashed: string): Promise<boolean> {
		try {
			return await argon2.verify(hashed, plainText);
		} catch {
			return false;
		}
	}
}
