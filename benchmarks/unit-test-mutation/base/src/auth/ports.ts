import type { ResetToken } from './ResetToken.js';
import type { User } from './User.js';

export interface ResetTokenRepository {
  findByToken(token: string): Promise<ResetToken | null>;
  save(token: ResetToken): Promise<void>;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
}
