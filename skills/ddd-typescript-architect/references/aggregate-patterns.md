Load when: writing or reviewing an Aggregate Root with internal entities, create/restore, DomainDeps, inter-aggregate coordination, or aggregate size.

# Aggregate Patterns

Rules: `AGG-1` to `AGG-10` in `hard-rules.md`. Kernel types (`AggregateRoot`, `DomainDeps`, `systemDeps`, `Clock`) are in `base-classes.md`.

## Multi-entity example: CustomerAccount

The root has a global identity VO and a private constructor. `create` validates and emits events; `restore` rebuilds from persisted state and emits nothing.

```typescript
type CustomerAccountEvent = CustomerAccountCreated | BankAccountOpened;

type CustomerAccountSnapshot = {
  id: string;
  isDeleted: boolean;
  isLocked: boolean;
  accounts: BankAccountSnapshot[];
};

class CustomerAccount extends AggregateRoot<CustomerAccountId, CustomerAccountEvent> {
  private constructor(
    id: CustomerAccountId, // global identity
    private accounts: BankAccount[],
    private isDeleted: boolean,
    private isLocked: boolean,
  ) {
    super(id);
  }

  static create(id: CustomerAccountId, deps: DomainDeps = systemDeps): CustomerAccount {
    const customerAccount = new CustomerAccount(id, [], false, false);
    customerAccount.addDomainEvent(new CustomerAccountCreated({ accountId: id.value }, deps.clock.now()));
    return customerAccount;
  }

  static restore(snapshot: CustomerAccountSnapshot): CustomerAccount {
    return new CustomerAccount(
      new CustomerAccountId(snapshot.id),
      snapshot.accounts.map(BankAccount.restore),
      snapshot.isDeleted,
      snapshot.isLocked,
    );
  }

  ibanForCurrency(currency: Currency): Iban {
    const account = this.accounts.find((a) => a.isForCurrency(currency));
    if (!account) throw new DomainBusinessError('This account does not support this currency');
    return account.iban;
  }

  markAsDeleted(): void {
    if (this.accounts.some((a) => a.hasMoney)) throw new DomainBusinessError('There is still money on a bank account');
    this.isDeleted = true;
  }

  openAccountForCurrency(currency: Currency, deps: DomainDeps = systemDeps): void {
    if (this.accounts.some((a) => a.isForCurrency(currency))) {
      throw new DomainBusinessError('There is already a bank account for that currency');
    }
    const account = BankAccount.open(new BankAccountId(deps.idGenerator.generate()), currency);
    this.accounts = [...this.accounts, account];
    this.addDomainEvent(new BankAccountOpened({ accountId: this.id.value, currency: currency.value }, deps.clock.now()));
  }

  addMoney(amount: Money): void {
    if (this.isDeleted) throw new DomainBusinessError('Account is deleted');
    if (this.isLocked) throw new DomainBusinessError('Account is locked');
    this.accounts = this.accounts.map((a) => (a.isForCurrency(amount.value.currency) ? a.addMoney(amount) : a));
  }

  toPrimitives(): CustomerAccountSnapshot {
    return {
      id: this.id.value,
      isDeleted: this.isDeleted,
      isLocked: this.isLocked,
      accounts: this.accounts.map((a) => a.toPrimitives()),
    };
  }
}

// Internal Entity: local identity VO, never referenced outside CustomerAccount, not exported from the Module
class BankAccount extends Entity<BankAccountId> {
  private constructor(
    id: BankAccountId,
    readonly iban: Iban,
    private readonly currency: Currency,
    private balance: Money,
  ) {
    super(id);
  }

  static open(id: BankAccountId, currency: Currency): BankAccount {
    return new BankAccount(id, Iban.generateFor(id), currency, new Money(0, currency));
  }

  static restore(snapshot: BankAccountSnapshot): BankAccount {
    const currency = new Currency(snapshot.currency);
    return new BankAccount(
      new BankAccountId(snapshot.id),
      new Iban(snapshot.iban),
      currency,
      new Money(snapshot.balance, currency),
    );
  }

  get hasMoney(): boolean {
    return this.balance.value.amount > 0;
  }

  isForCurrency(currency: Currency): boolean {
    return this.currency.isEqual(currency);
  }

  addMoney(amount: Money): BankAccount {
    return new BankAccount(this.id, this.iban, this.currency, this.balance.add(amount));
  }

  toPrimitives(): BankAccountSnapshot {
    return { id: this.id.value, iban: this.iban.value, currency: this.currency.value, balance: this.balance.value.amount };
  }
}
```

## Identity contract

```typescript
// External code ONLY sees the Aggregate Root identity
const customerId: string = customerAccount.id.value; // OK

// Internal BankAccount ids are not reachable: `accounts` is private and no getter returns it
// customerAccount.accounts[0].id // WRONG: local identity leak
```

## Repository contract

The aggregate is persisted and deleted as a unit. The port throws a typed error when the aggregate is missing; the adapter loads with `restore`, never `create`.

```typescript
// domain/port/customer-account.repository.ts
abstract class CustomerAccountRepositoryPort {
  abstract findById(id: CustomerAccountId): Promise<CustomerAccount>; // throws CustomerAccountNotFoundError
  abstract exists(id: CustomerAccountId): Promise<boolean>;
  abstract save(aggregate: CustomerAccount): Promise<void>;   // the entire graph
  abstract delete(id: CustomerAccountId): Promise<void>;      // the entire graph
}
```

Port style rationale and fakes: `domain-service-and-testing.md`.

## DomainDeps in a factory

The `DomainDeps` definition and the default `systemDeps` are in `base-classes.md`. Tests inject fakes, no DI container needed:

```typescript
const agreement = Agreement.create(id, {
  clock: { now: () => new Date('2024-01-01T00:00:00Z') },
  idGenerator: { generate: () => 'fixed-id' },
});
```

## pullDomainEvents

One call, after `save`, then publish. The canonical Application Service flow, the outbox caveat and versioning are in `domain-event-patterns.md`.

## Inter-aggregate coordination via snapshot

Never pass an Aggregate Root into another. Expose a minimum read-only snapshot and reference the other aggregate by its id VO.

```typescript
// Agreement exposes only what the consumer needs
class Agreement extends AggregateRoot<AgreementId, AgreementEvent> {
  toConsentableSnapshot(): ConsentableSnapshot {
    return { id: this.id.value, status: this.status, version: this.version.value };
  }
}

// UserConsent consumes the snapshot and holds only the AgreementId
class UserConsent extends AggregateRoot<UserConsentId, UserConsentEvent> {
  static recordFor(snapshot: ConsentableSnapshot, userId: UserId, deps: DomainDeps = systemDeps): UserConsent {
    const agreementId = new AgreementId(snapshot.id);
    const consent = new UserConsent(new UserConsentId(deps.idGenerator.generate()), userId, agreementId);
    consent.addDomainEvent(new ConsentRecorded({ userId: userId.value, agreementId: agreementId.value }, deps.clock.now()));
    return consent;
  }
}

// The Application Service orchestrates: neither root knows the other
const consent = UserConsent.recordFor(agreement.toConsentableSnapshot(), userId);
```

## Size check

An aggregate with 10+ methods or 5+ internal Entities probably has a boundary that is too large. If two internal Entities do not need to change together in the same transaction, they belong in separate Aggregates. Two Entities that are always loaded but rarely modified together are a second signal. Both are WARNINGs (`AP-23`, `AP-24`).
