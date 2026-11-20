import type { IPasswordHasher } from '../../src/application/auth/ISecurityServices';

/** Deterministic test double; production uses Argon2Hasher. */
export const passwordHasher: IPasswordHasher = {
	hash: async value => `hashed:${value}`,
	compare: async (value, hash) => hash === `hashed:${value}`,
};
