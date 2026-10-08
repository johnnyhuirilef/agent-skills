import type { Clock } from '../shared/clock.js';
import {
  AccountFrozenError,
  CurrencyMismatchError,
  InsufficientFundsError,
  NotFoundError,
  ValidationError,
} from '../shared/errors.js';
import type { AccountRepository, TransactionLogger } from './ports.js';

export interface TransferFundsInput {
  fromId: string;
  toId: string;
  amountCents: number;
}

export interface TransferFundsOutput {
  fromBalanceCents: number;
  toBalanceCents: number;
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export class TransferFunds {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly logger: TransactionLogger,
    private readonly clock: Clock,
  ) {}

  async run({ fromId, toId, amountCents }: TransferFundsInput): Promise<TransferFundsOutput> {
    if (!isNonEmptyString(fromId) || !isNonEmptyString(toId)) {
      throw new ValidationError('Account ids must be non-empty strings');
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new ValidationError('Amount must be a positive integer');
    }
    if (fromId === toId) throw new ValidationError('Cannot transfer to the same account');

    const from = await this.accounts.findById(fromId);
    if (!from) throw new NotFoundError('Account', fromId);
    const to = await this.accounts.findById(toId);
    if (!to) throw new NotFoundError('Account', toId);

    if (from.currency !== to.currency) throw new CurrencyMismatchError(from.currency, to.currency);
    if (from.status === 'FROZEN') throw new AccountFrozenError(from.id);
    if (from.balanceCents < amountCents) throw new InsufficientFundsError(from.id);

    const debited = from.debit(amountCents);
    const credited = to.credit(amountCents);

    await this.accounts.save(debited);
    try {
      await this.accounts.save(credited);
    } catch (error) {
      await this.accounts.save(from);
      throw error;
    }

    try {
      await this.logger.log({ type: 'TRANSFER', fromId, toId, amountCents, at: this.clock.now() });
    } catch {
      // logging failures must not affect the transfer
    }

    return { fromBalanceCents: debited.balanceCents, toBalanceCents: credited.balanceCents };
  }
}
