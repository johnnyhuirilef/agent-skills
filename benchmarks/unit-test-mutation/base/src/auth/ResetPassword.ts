import type { Clock } from '../shared/clock.js';
import { InvalidTokenError, ValidationError } from '../shared/errors.js';
import type { PasswordHasher, ResetTokenRepository, UserRepository } from './ports.js';

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

const MIN_PASSWORD_LENGTH = 12;
const TOKEN_TTL_MS = 30 * 60 * 1000;

export class ResetPassword {
  constructor(
    private readonly tokens: ResetTokenRepository,
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  async run({ token, newPassword }: ResetPasswordInput): Promise<void> {
    if (typeof token !== 'string' || token.length === 0) {
      throw new ValidationError('Token is required');
    }
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const resetToken = await this.tokens.findByToken(token);
    if (!resetToken) throw new InvalidTokenError();

    const now = this.clock.now();
    if (now.getTime() >= resetToken.issuedAt.getTime() + TOKEN_TTL_MS) throw new InvalidTokenError();
    if (resetToken.usedAt !== null) throw new InvalidTokenError();

    const user = await this.users.findById(resetToken.userId);
    if (!user) throw new InvalidTokenError();

    const passwordHash = await this.hasher.hash(newPassword);
    await this.users.save({ ...user, passwordHash });
    await this.tokens.save({ ...resetToken, usedAt: this.clock.now() });
  }
}
