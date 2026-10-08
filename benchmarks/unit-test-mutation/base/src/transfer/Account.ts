export type AccountStatus = 'ACTIVE' | 'FROZEN';

export class Account {
  constructor(
    readonly id: string,
    readonly ownerId: string,
    readonly balanceCents: number,
    readonly currency: string,
    readonly status: AccountStatus,
  ) {}

  debit(amountCents: number): Account {
    return new Account(this.id, this.ownerId, this.balanceCents - amountCents, this.currency, this.status);
  }

  credit(amountCents: number): Account {
    return new Account(this.id, this.ownerId, this.balanceCents + amountCents, this.currency, this.status);
  }
}
