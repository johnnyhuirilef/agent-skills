# Aggregate Patterns

## Base class usage

```typescript
// All Aggregate Roots extend AggregateRoot<Id, EventUnion>
class CustomerAccount extends AggregateRoot<CustomerAccountId, CustomerAccountEvent> {
  private constructor(
    id: CustomerAccountId,      // global identity
    private accounts: BankAccount[],
    private isDeleted: boolean = false,
    private isLocked: boolean = false,
  ) { super(id); }

  static create(id: CustomerAccountId, deps: DomainDeps = {}): CustomerAccount {
    const account = new CustomerAccount(id, []);
    account.addDomainEvent(new CustomerAccountCreated({ accountId: id.value }));
    return account;
  }
```

## CustomerAccount Aggregate (multi-Entity example)

```typescript
// Aggregate Root — Global Identity (private constructor enforces invariants at creation)
class CustomerAccount extends AggregateRoot<CustomerAccountId, CustomerAccountEvent> {
  private constructor(
    id: CustomerAccountId, // global identity
    private accounts: BankAccount[],
    private isDeleted: boolean = false,
    private isLocked: boolean = false,
  ) { super(id); }

  getIBANForCurrency(currency: Currency): string {
    for (const account of this.accounts) {
      if (account.isForCurrency(currency)) return account.iban;
    }
    throw new Error('This account does not support this currency');
  }

  markAsDeleted(): void {
    if (this.accounts.some(a => a.hasMoney)) throw new Error('There are still money on bank account');
    if (this.accounts.some(a => a.inDebt)) throw new Error('Bank account is in debt');
    this.isDeleted = true;
  }

  createAccountForCurrency(currency: Currency): void {
    if (this.accounts.some(a => a.isForCurrency(currency))) {
      throw new Error('There is already a bank account for that currency');
    }
    this.accounts = [...this.accounts, new BankAccount(currency)];
  }

  addMoney(amount: number, currency: Currency): void {
    if (this.isDeleted) throw new Error('Account is deleted');
    if (this.isLocked) throw new Error('Account is locked');
    this.accounts = this.accounts.map(a =>
      a.isForCurrency(currency) ? a.addMoney(amount) : a
    );
  }
}

// Internal Entity — Local Identity (never referenced externally)
class BankAccount {
  constructor(
    private readonly id: string, // local identity — stays inside CustomerAccount
    private readonly currency: Currency,
    private balance: number = 0,
  ) {}

  get hasMoney(): boolean { return this.balance > 0; }
  get inDebt(): boolean { return this.balance < 0; }
  isForCurrency(currency: Currency): boolean { return this.currency.isEqual(currency); }
  get iban(): string { /* compute IBAN */ return ''; }

  addMoney(amount: number): BankAccount {
    return new BankAccount(this.id, this.currency, this.balance + amount);
  }
}
```

## Identity contract

```typescript
// External code ONLY sees the Aggregate Root identity
const customerId: string = customerAccount.id; // OK

// External code MUST NOT reference internal BankAccount IDs
// const bankAccountId = customerAccount.accounts[0].id; // WRONG — local identity leak
```

## Repository contract (Aggregate persisted as a unit)

```typescript
// domain/port/customer-account.repository.ts
// abstract class enables DI by class token (e.g. NestJS); use interface for manual wiring
abstract class CustomerAccountRepositoryPort {
  abstract findById(id: CustomerAccountId): Promise<CustomerAccount>;
  abstract save(aggregate: CustomerAccount): Promise<void>; // saves the entire graph
  abstract delete(id: CustomerAccountId): Promise<void>;   // deletes the entire graph
}
```

## DomainDeps — testability without DI container

```typescript
interface DomainDeps {
  clock?: Clock;         // returns current Date — swap in tests for determinism
  idGenerator?: IdGenerator; // generates IDs — swap in tests for predictability
}

// Static factory uses DomainDeps optionally
class Agreement extends AggregateRoot<AgreementId, AgreementEvent> {
  static create(id: AgreementId, deps: DomainDeps = {}): Agreement {
    const { clock = systemClock } = deps;
    const agreement = new Agreement(id, AgreementStatus.DRAFT);
    agreement.addDomainEvent(
      new AgreementCreated({ agreementId: id.value, createdAt: clock.now().toISOString() })
    );
    return agreement;
  }
}

// In tests — no DI container needed
const fakeClock: Clock = { now: () => new Date('2024-01-01') };
const agreement = Agreement.create(id, { clock: fakeClock });
```

## pullDomainEvents — destructive drain

```typescript
// Application Service pattern
async execute(command: ActivateAgreementCommand): Promise<void> {
  const agreement = await this.repo.findById(command.id);
  agreement.activate();
  await this.repo.save(agreement); // persist first

  const events = agreement.pullDomainEvents(); // ONE call — clears the list
  await this.eventBus.publish(events);          // publish after persist
  // calling pullDomainEvents() again here returns []
}
```

## Inter-aggregate coordination via snapshot

Never pass an Aggregate Root directly to another Aggregate. Expose a minimum read-only snapshot:

```typescript
// Agreement exposes only what the consumer needs
class Agreement {
  toConsentableSnapshot(): ConsentableSnapshot {
    return {
      id: this.id.value,
      status: this.status,
      version: this.version.value,
    };
  }
}

// UserConsent consumes the snapshot — no reference to Agreement
class UserConsent extends AggregateRoot<UserConsentId, UserConsentEvent> {
  static recordFor(snapshot: ConsentableSnapshot, userId: UserId): UserConsent {
    const consent = new UserConsent(UserConsentId.generate(), userId, snapshot.id);
    consent.addDomainEvent(new ConsentRecorded({ userId: userId.value, agreementId: snapshot.id }));
    return consent;
  }
}

// Application Service orchestrates — neither AR knows about the other
const snapshot = agreement.toConsentableSnapshot();
const consent = UserConsent.recordFor(snapshot, userId);
```
