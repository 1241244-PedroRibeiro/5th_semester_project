import { Argon2Hasher } from '../../../src/infrastructure/security/Argon2Hasher';

describe('Argon2Hasher (Infrastructure Security)', () => {
  let hasher: Argon2Hasher;

  beforeEach(() => {
    hasher = new Argon2Hasher();
  });

  it('should generate an Argon2id hash and verify matches successfully', async () => {
    const password = 'SuperSecurePassword2026!';
    const hashed = await hasher.hash(password);

    expect(hashed).toBeDefined();
    expect(hashed).toContain('$argon2id$');

    const isValid = await hasher.compare(password, hashed);
    expect(isValid).toBe(true);
  });

  it('should reject comparison for incorrect password', async () => {
    const password = 'CorrectPassword123';
    const hashed = await hasher.hash(password);

    const isMatch = await hasher.compare('WrongPassword', hashed);
    expect(isMatch).toBe(false);
  });
});