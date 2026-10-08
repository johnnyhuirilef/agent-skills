import { describe, expect, it } from 'vitest';
import { Account, type AccountStatus } from '../../src/transfer/Account.js';
import type { TransactionLogEntry } from '../../src/transfer/ports.js';
import { TransferFunds } from '../../src/transfer/TransferFunds.js';
import { AccountFrozenError, CurrencyMismatchError, ValidationError } from '../../src/shared/errors.js';

const NOW = new Date('2026-05-01T12:00:00.000Z');

function account(id: string, balanceCents: number, opts: { currency?: string; status?: AccountStatus } = {}) {
  return new Account(id, `owner-${id}`, balanceCents, opts.currency ?? 'USD', opts.status ?? 'ACTIVE');
}

interface SetupOptions {
  failSaveCall?: number;
  log?: (entry: TransactionLogEntry) => Promise<void>;
}

function setup(accounts: Account[], options: SetupOptions = {}) {
  const store = new Map(accounts.map((a) => [a.id, a]));
  const saves: string[] = [];
  const logged: TransactionLogEntry[] = [];
  const saveError = new Error('db down');

  const repo = {
    async findById(id: string) {
      return store.get(id) ?? null;
    },
    async save(a: Account) {
      saves.push(a.id);
      if (saves.length === options.failSaveCall) throw saveError;
      store.set(a.id, a);
    },
  };
  const logger = {
    log:
      options.log ??
      (async (entry: TransactionLogEntry) => {
        logged.push(entry);
      }),
  };
  const clock = { now: () => NOW };
  const balance = (id: string) => store.get(id)?.balanceCents;

  return { useCase: new TransferFunds(repo, logger, clock), saves, logged, saveError, balance };
}

describe('TransferFunds (hard-tier oracle)', () => {
  it('rethrows a failed credit after restoring the source account', async () => {
    const { useCase, saveError, saves, balance } = setup([account('A', 1000), account('B', 500)], {
      failSaveCall: 2,
    });

    await expect(useCase.run({ fromId: 'A', toId: 'B', amountCents: 300 })).rejects.toBe(saveError);

    expect(saves).toEqual(['A', 'B', 'A']);
    expect(balance('A')).toBe(1000);
    expect(balance('B')).toBe(500);
  });

  it('waits for the transaction log before resolving', async () => {
    let releaseLog!: () => void;
    const { useCase } = setup([account('A', 1000), account('B', 500)], {
      log: () => new Promise<void>((resolve) => (releaseLog = resolve)),
    });

    let settled = false;
    const pending = useCase.run({ fromId: 'A', toId: 'B', amountCents: 300 }).then((r) => {
      settled = true;
      return r;
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(settled).toBe(false);

    releaseLog();
    await expect(pending).resolves.toEqual({ fromBalanceCents: 700, toBalanceCents: 800 });
  });

  it('logs the transferred amount, direction and clock time', async () => {
    const { useCase, logged } = setup([account('A', 1000), account('B', 500)]);

    await useCase.run({ fromId: 'A', toId: 'B', amountCents: 300 });

    expect(logged).toEqual([{ type: 'TRANSFER', fromId: 'A', toId: 'B', amountCents: 300, at: NOW }]);
  });

  it('allows a transfer into a frozen destination account', async () => {
    const { useCase, balance } = setup([account('A', 1000), account('B', 500, { status: 'FROZEN' })]);

    await expect(useCase.run({ fromId: 'A', toId: 'B', amountCents: 300 })).resolves.toEqual({
      fromBalanceCents: 700,
      toBalanceCents: 800,
    });
    expect(balance('B')).toBe(800);
  });

  it('rejects a non-integer amount without saving anything', async () => {
    const { useCase, saves } = setup([account('A', 1000), account('B', 500)]);

    await expect(useCase.run({ fromId: 'A', toId: 'B', amountCents: 1.5 })).rejects.toBeInstanceOf(ValidationError);
    expect(saves).toEqual([]);
  });

  it('treats ids that differ only in case as different accounts', async () => {
    const { useCase } = setup([account('acc-1', 1000), account('ACC-1', 500)]);

    await expect(useCase.run({ fromId: 'acc-1', toId: 'ACC-1', amountCents: 100 })).resolves.toEqual({
      fromBalanceCents: 900,
      toBalanceCents: 600,
    });
  });

  it('rejects an empty source id as a validation error', async () => {
    const { useCase } = setup([account('A', 1000), account('B', 500)]);

    await expect(useCase.run({ fromId: '', toId: 'B', amountCents: 100 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('reports a currency mismatch before a frozen source', async () => {
    const { useCase } = setup([
      account('A', 1000, { status: 'FROZEN' }),
      account('B', 500, { currency: 'EUR' }),
    ]);

    const error = await useCase.run({ fromId: 'A', toId: 'B', amountCents: 100 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CurrencyMismatchError);
    expect(error).not.toBeInstanceOf(AccountFrozenError);
  });
});
