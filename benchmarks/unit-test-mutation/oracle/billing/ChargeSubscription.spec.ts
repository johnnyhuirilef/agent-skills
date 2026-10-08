import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChargeSubscription } from '../../src/billing/ChargeSubscription.js';
import type { ChargeRequest } from '../../src/billing/ports.js';
import { Subscription, type SubscriptionStatus } from '../../src/billing/Subscription.js';
import { CardDeclinedError, ChargeFailedError, GatewayTimeoutError } from '../../src/shared/errors.js';

const PERIOD_START = new Date('2026-03-01T00:00:00.000Z');
const PREVIOUS_CHARGE = new Date('2026-02-01T09:00:00.000Z');
const NOW = new Date('2026-03-01T10:00:00.000Z');
const START_MS = Date.parse('2030-01-01T00:00:00.000Z');

type Outcome = string | Error;

function subscription(status: SubscriptionStatus = 'ACTIVE') {
  return new Subscription('sub-1', 4999, status, PERIOD_START, PREVIOUS_CHARGE);
}

function setup(stored: Subscription, outcomes: Outcome[], options: { firstSaveError?: Error } = {}) {
  const saved: Subscription[] = [];
  const charges: { request: ChargeRequest; atMs: number }[] = [];
  let saveCalls = 0;
  let attempt = 0;

  const subscriptions = {
    async findById(id: string) {
      return id === stored.id ? stored : null;
    },
    async save(s: Subscription) {
      saveCalls++;
      if (saveCalls === 1 && options.firstSaveError) throw options.firstSaveError;
      saved.push(s);
    },
  };
  const gateway = {
    async charge(request: ChargeRequest) {
      charges.push({ request, atMs: Date.now() - START_MS });
      const outcome = outcomes[attempt++] ?? new Error('unexpected extra charge');
      if (outcome instanceof Error) throw outcome;
      return { transactionId: outcome };
    },
  };
  const clock = { now: () => NOW };

  const useCase = new ChargeSubscription(subscriptions, gateway, clock);
  const run = async () => {
    const settled = useCase.run({ subscriptionId: stored.id }).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );
    await vi.runAllTimersAsync();
    return settled;
  };
  return { run, saved, charges };
}

describe('ChargeSubscription (hard-tier oracle)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START_MS);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries timeouts after exactly 1000, 2000 and 4000 ms', async () => {
    const { run, charges } = setup(subscription(), [
      new GatewayTimeoutError(),
      new GatewayTimeoutError(),
      new GatewayTimeoutError(),
      'tx-4',
    ]);

    const result = await run();

    expect(result).toEqual({ ok: true, value: { transactionId: 'tx-4' } });
    expect(charges.map((c) => c.atMs)).toEqual([0, 1000, 3000, 7000]);
  });

  it('sends the idempotency key as <subscriptionId>:<periodStart ISO>', async () => {
    const { run, charges } = setup(subscription(), ['tx-1']);

    await run();

    expect(charges.map((c) => c.request)).toEqual([
      { subscriptionId: 'sub-1', amountCents: 4999, idempotencyKey: 'sub-1:2026-03-01T00:00:00.000Z' },
    ]);
  });

  it('wraps the last timeout as the cause after the final attempt', async () => {
    const timeouts = [1, 2, 3, 4].map(() => new GatewayTimeoutError());
    const { run, charges } = setup(subscription(), timeouts);

    const result = await run();

    expect(charges).toHaveLength(4);
    expect(result.ok).toBe(false);
    const error = (result as { error: unknown }).error;
    expect(error).toBeInstanceOf(ChargeFailedError);
    expect((error as Error).cause).toBe(timeouts[3]);
  });

  it('uses the non-retryable error that ended the retries as the cause', async () => {
    const declined = new CardDeclinedError();
    const { run, charges } = setup(subscription(), [new GatewayTimeoutError(), declined]);

    const result = await run();

    expect(charges).toHaveLength(2);
    expect(result.ok).toBe(false);
    expect(((result as { error: unknown }).error as Error).cause).toBe(declined);
  });

  it('marks a failed charge PAST_DUE and keeps the previous lastChargedAt', async () => {
    const { run, saved } = setup(subscription(), [new CardDeclinedError()]);

    await run();

    expect(saved).toEqual([new Subscription('sub-1', 4999, 'PAST_DUE', PERIOD_START, PREVIOUS_CHARGE)]);
  });

  it('charges a PAST_DUE subscription and reactivates it', async () => {
    const { run, saved } = setup(subscription('PAST_DUE'), ['tx-1']);

    const result = await run();

    expect(result).toEqual({ ok: true, value: { transactionId: 'tx-1' } });
    expect(saved).toEqual([new Subscription('sub-1', 4999, 'ACTIVE', PERIOD_START, NOW)]);
  });

  it('fails the charge when the successful result cannot be persisted', async () => {
    const saveError = new Error('db down');
    const { run, saved } = setup(subscription(), ['tx-1'], { firstSaveError: saveError });

    const result = await run();

    expect(result.ok).toBe(false);
    const error = (result as { error: unknown }).error;
    expect(error).toBeInstanceOf(ChargeFailedError);
    expect((error as Error).cause).toBe(saveError);
    expect(saved.map((s) => s.status)).toEqual(['PAST_DUE']);
  });
});
