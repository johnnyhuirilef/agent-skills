export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

export class Subscription {
  constructor(
    readonly id: string,
    readonly amountCents: number,
    readonly status: SubscriptionStatus,
    readonly periodStart: Date,
    readonly lastChargedAt: Date | null,
  ) {}

  withStatus(status: SubscriptionStatus): Subscription {
    return new Subscription(this.id, this.amountCents, status, this.periodStart, this.lastChargedAt);
  }

  withLastChargedAt(lastChargedAt: Date): Subscription {
    return new Subscription(this.id, this.amountCents, this.status, this.periodStart, lastChargedAt);
  }
}
