import { describe, expect, it } from 'vitest';
import { ResetPassword } from '../../src/auth/ResetPassword.js';
import type { ResetToken } from '../../src/auth/ResetToken.js';
import type { User } from '../../src/auth/User.js';
import { InvalidTokenError, ValidationError } from '../../src/shared/errors.js';

const TOKEN_TTL_MS = 30 * 60 * 1000;
const ISSUED_AT = new Date('2026-01-01T00:00:00.000Z');
const ONE_MINUTE_LATER = new Date(ISSUED_AT.getTime() + 60_000);
const VALID_PASSWORD = 'correct-horse-battery';

interface SetupOptions {
  token?: Partial<ResetToken>;
  user?: User | null;
  now?: Date;
  userSaveError?: Error;
}

function setup(options: SetupOptions = {}) {
  const storedToken: ResetToken = {
    token: 'tok-abc',
    userId: 'user-1',
    issuedAt: ISSUED_AT,
    usedAt: null,
    ...options.token,
  };
  const storedUser = options.user === undefined ? { id: 'user-1', passwordHash: 'old-hash' } : options.user;
  const calls: string[] = [];
  const lookups: string[] = [];
  const hashed: string[] = [];
  const savedTokens: ResetToken[] = [];
  const savedUsers: User[] = [];

  const tokens = {
    async findByToken(token: string) {
      lookups.push(token);
      return token === storedToken.token ? storedToken : null;
    },
    async save(token: ResetToken) {
      calls.push('tokens.save');
      savedTokens.push(token);
    },
  };
  const users = {
    async findById(id: string) {
      return storedUser && storedUser.id === id ? storedUser : null;
    },
    async save(user: User) {
      calls.push('users.save');
      if (options.userSaveError) throw options.userSaveError;
      savedUsers.push(user);
    },
  };
  const hasher = {
    async hash(plain: string) {
      hashed.push(plain);
      return `hash(${plain})`;
    },
  };
  const now = options.now ?? ONE_MINUTE_LATER;
  const clock = { now: () => now };

  return {
    useCase: new ResetPassword(tokens, users, hasher, clock),
    storedToken,
    calls,
    lookups,
    hashed,
    savedTokens,
    savedUsers,
  };
}

describe('ResetPassword (hard-tier oracle)', () => {
  it('accepts a password of exactly the minimum length', async () => {
    const { useCase, savedUsers } = setup();
    const password = 'a'.repeat(12);

    await useCase.run({ token: 'tok-abc', newPassword: password });

    expect(savedUsers).toEqual([{ id: 'user-1', passwordHash: `hash(${password})` }]);
  });

  it('accepts a token 1 ms before it expires', async () => {
    const { useCase, savedUsers } = setup({ now: new Date(ISSUED_AT.getTime() + TOKEN_TTL_MS - 1) });

    await useCase.run({ token: 'tok-abc', newPassword: VALID_PASSWORD });

    expect(savedUsers).toHaveLength(1);
  });

  it('does not burn the token when saving the new password fails', async () => {
    const failure = new Error('db down');
    const { useCase, calls, savedTokens } = setup({ userSaveError: failure });

    await expect(useCase.run({ token: 'tok-abc', newPassword: VALID_PASSWORD })).rejects.toBe(failure);

    expect(calls).toEqual(['users.save']);
    expect(savedTokens).toEqual([]);
  });

  it('hashes the password exactly as given, whitespace included', async () => {
    const password = '   abcdefghi';
    const { useCase, hashed, savedUsers } = setup();

    await useCase.run({ token: 'tok-abc', newPassword: password });

    expect(hashed).toEqual([password]);
    expect(savedUsers).toEqual([{ id: 'user-1', passwordHash: `hash(${password})` }]);
  });

  it('looks the token up exactly as given, case included', async () => {
    const { useCase, lookups, savedUsers } = setup({ token: { token: 'TOK-Abc' } });

    await useCase.run({ token: 'TOK-Abc', newPassword: VALID_PASSWORD });

    expect(lookups).toEqual(['TOK-Abc']);
    expect(savedUsers).toHaveLength(1);
  });

  it('saves the token with usedAt set and every other field unchanged', async () => {
    const { useCase, storedToken, savedTokens } = setup();

    await useCase.run({ token: 'tok-abc', newPassword: VALID_PASSWORD });

    expect(savedTokens).toEqual([{ ...storedToken, usedAt: ONE_MINUTE_LATER }]);
  });

  it('saves the password before marking the token used', async () => {
    const { useCase, calls } = setup();

    await useCase.run({ token: 'tok-abc', newPassword: VALID_PASSWORD });

    expect(calls).toEqual(['users.save', 'tokens.save']);
  });

  it('reports a token whose user no longer exists as an invalid token', async () => {
    const { useCase } = setup({ user: null });

    await expect(useCase.run({ token: 'tok-abc', newPassword: VALID_PASSWORD })).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
  });

  it('rejects a short password before touching the token repository', async () => {
    const { useCase, lookups } = setup();

    await expect(useCase.run({ token: 'unknown', newPassword: 'short' })).rejects.toBeInstanceOf(ValidationError);

    expect(lookups).toEqual([]);
  });
});
