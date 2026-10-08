Load when: writing or reviewing a Domain Service, declaring a port (abstract class vs interface), or writing InMemory fakes and deterministic tests.

# Domain Service, Ports and Testing

Rules: `DS-1` to `DS-8`, `REP-1` to `REP-9` in `hard-rules.md`.

## Stateless Domain Service

A Domain Service orchestrates invariants too complex for one Entity or VO, or whose natural home is ambiguous. Its only fields are `readonly` stateless collaborators.

```typescript
// domain/port/exchange-rate.port.ts
abstract class ExchangeRatePort {
  abstract findRate(from: Currency, to: Currency): Promise<ExchangeRate>; // throws ExchangeRateNotAvailableError
}

// domain/service/exchange.service.ts
class ExchangeService {
  constructor(private readonly ratePort: ExchangeRatePort) {}

  async convert(to: Currency, from: Money): Promise<Money> {
    // compute and RETURN: never store on `this`
    const rate = await this.ratePort.findRate(from.value.currency, to);
    return from.convertAt(rate);
  }
}
```

Every method the service calls (`findRate`) exists on the declared port (`DS-7`).

Not stateless (each is a BLOCKER, see `anti-patterns.md`): a `private lastRate: ExchangeRate` field, a `private cache = new Map()`, a `this.result = ...` write between calls.

## Port style: abstract class vs interface

In NestJS/DI-container projects use `abstract class`: it is a runtime value and doubles as the injection token. Otherwise `interface` plus a Symbol token is equally valid. Follow the project's existing style everywhere. The domain declares the contract; infrastructure implements it.

```typescript
// infrastructure/adapter/open-exchange-rates.adapter.ts
class OpenExchangeRatesAdapter extends ExchangeRatePort {
  async findRate(from: Currency, to: Currency): Promise<ExchangeRate> {
    /* call the provider; wrap provider failures in ExternalServiceError */
  }
}
```

With an `interface` port the adapter uses `implements` and the DI binding needs an explicit token.

## InMemory fakes

Fast, deterministic fakes of repository ports. They live in `application/testing/`, are wired explicitly by tests, and no provider switches to them via an environment variable.

```typescript
// application/testing/in-memory-agreement.repository.ts
class InMemoryAgreementRepository extends AgreementRepositoryPort {
  private readonly store = new Map<string, Agreement>();

  async findById(id: AgreementId): Promise<Agreement> {
    const agreement = this.store.get(id.value);
    if (!agreement) throw new AgreementNotFoundError(id.value);
    return agreement;
  }

  async exists(id: AgreementId): Promise<boolean> {
    return this.store.has(id.value);
  }

  async save(agreement: Agreement): Promise<void> {
    this.store.set(agreement.id.value, agreement);
  }

  async delete(id: AgreementId): Promise<void> {
    this.store.delete(id.value);
  }

  // Test-only helper, not part of the port contract
  all(): Agreement[] {
    return [...this.store.values()];
  }
}
```

## Deterministic time and ids in tests

```typescript
const fixedClock = (iso: string): Clock => ({ now: () => new Date(iso) });
const sequentialIds = (...ids: string[]): IdGenerator => {
  const queue = [...ids];
  return { generate: () => queue.shift() ?? 'id-exhausted' };
};

const deps: DomainDeps = { clock: fixedClock('2024-01-01T00:00:00Z'), idGenerator: sequentialIds('a1', 'a2') };
const agreement = Agreement.create(new AgreementId('a1'), deps);

expect(agreement.pullDomainEvents()[0].occurredAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
```
