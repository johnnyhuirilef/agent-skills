# Value Object Patterns

## Composition — VO containing another VO

```typescript
class Currency {
  constructor(
    private readonly code: string,
    private readonly name: string,
    private readonly htmlCode: string,
  ) {
    if (!code || code.length !== 3) throw new Error('Invalid currency code');
  }

  isEqual(other: Currency): boolean {
    return this.code === other.code;
  }
}

class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: Currency,
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative');
  }

  add(other: Money): Money {
    if (!this.currency.isEqual(other.currency)) throw new Error('Currency mismatch');
    return new Money(this.amount + other.amount, this.currency);
  }

  deduct(other: Money): Money {
    if (!this.currency.isEqual(other.currency)) throw new Error('Currency mismatch');
    if (other.amount > this.amount) throw new Error('Insufficient funds');
    return new Money(this.amount - other.amount, this.currency);
  }

  isEqual(other: Money): boolean {
    return this.amount === other.amount && this.currency.isEqual(other.currency);
  }
}
```

## VO carrying its own validation (Address example)

```typescript
class Address {
  constructor(
    private readonly street: string,
    private readonly city: string,
    private readonly postalCode: string,
    private readonly country: string,
  ) {
    if (!street.trim()) throw new Error('Street is required');
    if (!city.trim()) throw new Error('City is required');
    if (!/^\d{5}$/.test(postalCode)) throw new Error('Invalid postal code');
  }

  isEqual(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.postalCode === other.postalCode &&
      this.country === other.country
    );
  }
}
```

## When to use VO vs primitive

Use a Value Object when:
- Two or more primitives always travel together (amount + currency, lat + lon)
- A primitive has its own validation rules (email format, postal code regex)
- A primitive has domain-specific operations (Money.add, Percentage.of)
- You find yourself duplicating validation logic for the same primitive type

---

## ToPrimitives — serialization utility type

Recursively unwraps `ValueObject<T>.value` to produce a plain-object type. Use for DTOs, event payloads, and persistence mappers:

```typescript
type ToPrimitives<T> = T extends ValueObject<infer V>
  ? ToPrimitives<V>
  : T extends object
  ? { [K in keyof T]: ToPrimitives<T[K]> }
  : T;

// Example
type MoneyPrimitive = ToPrimitives<Money>;
// → { amount: number; currency: { code: string; name: string; htmlCode: string } }

// In DAO toDomain():
class MoneyDAO {
  amount: number;
  currencyCode: string;

  toDomain(): Money {
    return new Money(this.amount, Currency.fromCode(this.currencyCode));
  }
}
```

---

## ContextObject — grouping related VOs into a named cluster

Use when multiple Value Objects only make sense together as a named concept:

```typescript
// Signature of the generic base
abstract class ContextObject<T extends Record<string, ValueObject<unknown>>> {
  constructor(protected readonly values: T) {}

  get<K extends keyof T>(key: K): T[K] {
    return this.values[key];
  }
}

// Concrete usage — ProductIdentity requires all three
class ProductIdentity extends ContextObject<{
  sku: Sku;
  ean: Ean;
  storeCode: StoreCode;
}> {
  static of(sku: Sku, ean: Ean, storeCode: StoreCode): ProductIdentity {
    return new ProductIdentity({ sku, ean, storeCode });
  }
}

const identity = ProductIdentity.of(sku, ean, storeCode);
identity.get('sku'); // typed as Sku
```

---

## Validation helper pattern (generic)

Centralize validation logic outside the VO constructor. The helper uses whatever validation mechanism fits your project — no library is prescribed:

```typescript
// Option A: pure TypeScript guards
function validateEmail(value: string): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new DomainValidationError(`"${value}" is not a valid email`);
  return value;
}

class Email extends ValueObject<string> {
  constructor(value: string) {
    super(validateEmail(value));
  }
}

// Option B: schema validation (any library — Zod, Yup, Joi, etc.)
// The VO doesn't import the library; the helper does
function validateWithSchema<T>(name: string, schema: Schema<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new DomainValidationError(`${name}: ${result.error.message}`);
  return result.data;
}
```

The key principle: **validation knowledge lives in one place**, not scattered across callers. The VO constructor delegates to the helper and stays clean.
