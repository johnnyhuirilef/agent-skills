import type { Subscription } from './Subscription.js';

export interface SubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  save(subscription: Subscription): Promise<void>;
}

export interface ChargeRequest {
  subscriptionId: string;
  amountCents: number;
  idempotencyKey: string;
}

export interface PaymentGateway {
  charge(req: ChargeRequest): Promise<{ transactionId: string }>;
}
