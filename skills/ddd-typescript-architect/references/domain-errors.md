Load when: defining or reviewing domain errors, error codes, error mapping, or what ports throw.

# Domain Error Patterns

Rules: `ERR-1` to `ERR-7` and `REP-2` in `hard-rules.md`.

## Base hierarchy (shared kernel)

`DomainError` and the generic errors live in `kernel/domain/domain-error.ts`. Module-specific errors live in `<module>/domain/errors/`.

```typescript
abstract class DomainError extends Error {
  abstract readonly code: string; // e.g. "resource.not-found"

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype); // fix instanceof in transpiled JS
  }
}

// Invalid input or invalid Value Object construction
class DomainValidationError extends DomainError {
  constructor(message: string, readonly code: string = 'validation.invalid-value') {
    super(message);
  }
}

// Broken invariant, state machine violation, business rule
class DomainBusinessError extends DomainError {
  constructor(message: string, readonly code: string = 'business.rule-violated') {
    super(message);
  }
}

// Missing aggregate; thrown by repository ports
class NotFoundError extends DomainError {
  readonly code: string = 'resource.not-found';
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`);
  }
}

// Third-party failure wrapped by an adapter
class ExternalServiceError extends DomainError {
  readonly code: string = 'external.unavailable';
  constructor(service: string, cause: unknown) {
    super(`${service} failed`, { cause });
  }
}

// Unexpected infrastructure failure wrapped by an adapter
class SystemError extends DomainError {
  readonly code: string = 'system.unexpected';
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}
```

Use `DomainValidationError` and `DomainBusinessError` directly for one-off rules. Subclass them when callers must tell cases apart.

## Taxonomy

Each code is `<category>.<specific-name>`. Group module errors next to their models, not in a shared `errors/` module.

| Category | Prefix | When to use |
|----------|--------|-------------|
| Resource | `resource.*` | Not found, already exists, soft-deleted |
| Business | `business.*` | State machine violation, business rule broken, invariant failed |
| Concurrency | `concurrency.*` | Optimistic lock conflict, stale version, race |
| External | `external.*` | Third-party service unavailable or unexpected response |
| Validation | `validation.*` | Invalid format, constraint violation, schema mismatch |
| Auth | `auth.*` | Unauthorized, forbidden, token expired or invalid |
| System | `system.*` | Unexpected infrastructure failure |

## Concrete examples

```typescript
class AgreementNotFoundError extends NotFoundError {
  constructor(id: string) { super('Agreement', id); }
}

class AgreementAlreadyExistsError extends DomainBusinessError {
  constructor(id: string) { super(`Agreement ${id} already exists`, 'resource.already-exists'); }
}

class InvalidStateTransitionError extends DomainBusinessError {
  constructor(from: string, to: string) {
    super(`Cannot transition from ${from} to ${to}`, 'business.invalid-state-transition');
  }
}

class InsufficientFundsError extends DomainBusinessError {
  constructor(requested: number, available: number) {
    super(`Requested ${requested} but only ${available} available`, 'business.insufficient-funds');
  }
}

class OptimisticLockError extends DomainError {
  readonly code = 'concurrency.optimistic-lock';
  constructor(id: string) { super(`Stale version for ${id}: reload and retry`); }
}

class InvalidEmailError extends DomainValidationError {
  constructor(value: string) { super(`"${value}" is not a valid email`, 'validation.invalid-format'); }
}

class UnauthorizedError extends DomainError {
  readonly code = 'auth.unauthorized';
  constructor() { super('Authentication required'); }
}
```

## Error boundary contract

```
Domain Layer        → throws DomainError subclasses
Repository ports    → THROW typed errors too (NotFoundError subclass for a missing aggregate); adapters wrap driver failures in ExternalServiceError or SystemError
Application Layer   → lets DomainError propagate or maps it; never swallows it
Presentation Layer  → receives the mapped error, never catches domain errors directly
```

The domain never catches its own errors. It throws; callers handle.

## Mapping to a response (presentation)

HTTP status belongs here, never in the error classes:

```typescript
// presentation/error-mapper.ts
function toHttpStatus(error: DomainError): number {
  const category = error.code.split('.')[0];
  switch (category) {
    case 'validation': return 400;
    case 'auth': return 401;
    case 'resource': return error instanceof NotFoundError ? 404 : 409;
    case 'business':
    case 'concurrency': return 409;
    case 'external': return 502;
    default: return 500;
  }
}
```

Violations and severities: `anti-patterns.md` (AP-9, AP-28, AP-37, AP-38, AP-39).
