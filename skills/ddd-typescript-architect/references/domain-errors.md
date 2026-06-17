# Domain Error Patterns

## Base hierarchy

```typescript
// domain/errors/domain.error.ts
abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype); // fix instanceof in transpiled JS
  }
}
```

## Error taxonomy

Each error code follows the format `<category>.<specific-name>`. Group errors by module alongside their domain models — not in a shared `errors/` folder.

| Category | Prefix | When to use |
|----------|--------|-------------|
| Resource | `resource.*` | Entity/Aggregate not found, already exists, soft-deleted |
| Business | `business.*` | State machine violation, business rule broken, invariant failed |
| Concurrency | `concurrency.*` | Optimistic lock conflict, stale version, race condition |
| External | `external.*` | Third-party service unavailable or returned unexpected response |
| Validation | `validation.*` | Invalid format, constraint violation, schema mismatch |
| Auth | `auth.*` | Unauthorized, forbidden, token expired or invalid |
| System | `system.*` | Unexpected errors, infrastructure failure, programming errors |

## Concrete error examples

```typescript
// Resource errors
class AgreementNotFoundError extends DomainError {
  readonly code = 'resource.not-found';
  constructor(id: string) { super(`Agreement ${id} not found`); }
}

class AgreementAlreadyExistsError extends DomainError {
  readonly code = 'resource.already-exists';
  constructor(id: string) { super(`Agreement ${id} already exists`); }
}

// Business errors
class InvalidStateTransitionError extends DomainError {
  readonly code = 'business.invalid-state-transition';
  constructor(from: string, to: string) {
    super(`Cannot transition from ${from} to ${to}`);
  }
}

class InsufficientFundsError extends DomainError {
  readonly code = 'business.insufficient-funds';
  constructor(requested: number, available: number) {
    super(`Requested ${requested} but only ${available} available`);
  }
}

// Concurrency errors
class OptimisticLockError extends DomainError {
  readonly code = 'concurrency.optimistic-lock';
  constructor(id: string) { super(`Stale version for ${id} — reload and retry`); }
}

// Validation errors
class InvalidEmailError extends DomainError {
  readonly code = 'validation.invalid-format';
  constructor(value: string) { super(`"${value}" is not a valid email`); }
}

// Auth errors
class UnauthorizedError extends DomainError {
  readonly code = 'auth.unauthorized';
  constructor() { super('Authentication required'); }
}
```

## Error boundary contract

```
Domain Layer        → throws DomainError subclasses
I/O Ports           → return typed results (Result<T,E>, Either, or similar — project's choice)
Application Layer   → catches DomainError, maps to response shape / HTTP status
Presentation Layer  → receives mapped error, never catches domain errors directly
```

Domain NEVER catches its own errors. It throws; callers handle.

## Application layer error mapping (example)

```typescript
// application/handlers/activate-agreement.handler.ts
async execute(command: ActivateAgreementCommand): Promise<void> {
  try {
    const agreement = await this.repo.findById(command.id);
    agreement.activate();
    await this.repo.save(agreement);
  } catch (error) {
    if (error instanceof AgreementNotFoundError) throw error; // re-throw typed
    if (error instanceof InvalidStateTransitionError) throw error; // re-throw typed
    throw new SystemError('Unexpected failure during activation', { cause: error });
  }
}
```

## Anti-patterns to flag

| Anti-pattern | Severity | Why |
|---|---|---|
| `throw new Error('not found')` from domain | WARNING | No type info — caller can't distinguish error kinds |
| HTTP status codes in DomainError | WARNING | Infrastructure concern leaking into domain |
| Catching domain errors inside domain | BLOCKER | Masks invariant violations |
| Generic `catch (e)` swallowing domain errors | WARNING | Domain contract silently broken |
| Shared `errors/` module for all contexts | WARNING | No cohesion — errors belong near their aggregate |
