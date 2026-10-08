import type { Account } from './Account.js';

export interface AccountRepository {
  findById(id: string): Promise<Account | null>;
  save(account: Account): Promise<void>;
}

export interface TransactionLogEntry {
  type: 'TRANSFER';
  fromId: string;
  toId: string;
  amountCents: number;
  at: Date;
}

export interface TransactionLogger {
  log(entry: TransactionLogEntry): Promise<void>;
}
