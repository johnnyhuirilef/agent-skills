import type { Clock } from '../shared/clock.js';
import {
  ChargeFailedError,
  GatewayTimeoutError,
  NotFoundError,
  SubscriptionCancelledError,
  ValidationError,
} from '../shared/errors.js';
import type { PaymentGateway, SubscriptionRepository } from './ports.js';

export interface ChargeSubscriptionInput {
  subscriptionId: string;
}

const RETRY_DELAYS_MS = [1000, 2000, 4000];

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class ChargeSubscription {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly gateway: PaymentGateway,
    private readonly clock: Clock,
  ) {}

  async run({ subscriptionId }: ChargeSubscriptionInput): Promise<{ transactionId: string }> {
    if (typeof subscriptionId !== 'string' || subscriptionId.length === 0) {
      throw new ValidationError('Subscription id is required');
    }

    const subscription = await this.subscriptions.findById(subscriptionId);
    if (!subscription) throw new NotFoundError('Subscription', subscriptionId);
    if (subscription.status === 'CANCELLED') throw new SubscriptionCancelledError(subscriptionId);

    const idempotencyKey = `${subscriptionId}:${subscription.periodStart.toISOString()}`;
    const request = { subscriptionId, amountCents: subscription.amountCents, idempotencyKey };

    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const { transactionId } = await this.gateway.charge(request);
        await this.subscriptions.save(
          subscription.withStatus('ACTIVE').withLastChargedAt(this.clock.now()),
        );
        return { transactionId };
      } catch (error) {
        lastError = error;
        if (!(error instanceof GatewayTimeoutError) || attempt === RETRY_DELAYS_MS.length) break;
        await sleep(RETRY_DELAYS_MS[attempt]!);
      }
    }

    await this.subscriptions.save(subscription.withStatus('PAST_DUE'));
    throw new ChargeFailedError(subscriptionId, { cause: lastError });
  }
}
