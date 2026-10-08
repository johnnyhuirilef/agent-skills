Load when: writing or reviewing a Value Object, composing VOs, grouping VOs in a ContextObject, building a composite identity, or choosing VO vs primitive.

# Value Object Patterns

Rules: `VO-1` to `VO-9` in `hard-rules.md`. `ValueObject<T>` and `ToPrimitives<T>` are defined in `base-classes.md` (`value` is `public readonly`).

## Validation helper

The constructor passes a helper's result to `super`, keeping validation in one place. The mechanism (plain guards, a schema library) is the project's choice; the VO never imports the library, the helper does.

```typescript
function ensureValidEmail(value: string): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new DomainValidationError(`"${value}" is not a valid email`);
  }
  return value;
}

class Email extends ValueObject<string> {
  constructor(value: string) {
    super(ensureValidEmail(value));
  }
}

// Schema variant: the helper owns the library
function validateWithSchema<T>(name: string, schema: Schema<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new DomainValidationError(`${name}: ${result.error.message}`);
  return result.data;
}
```

## Composition: a VO containing another VO

```typescript
class Currency extends ValueObject<string> {
  constructor(code: string) {
    super(ensureIsoCurrencyCode(code)); // 3 letters, else DomainValidationError
  }
}

class Money extends ValueObject<{ amount: number; currency: Currency }> {
  constructor(amount: number, currency: Currency) {
    super(ensureNonNegativeAmount({ amount, currency }));
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.amount + other.value.amount, this.value.currency);
  }

  deduct(other: Money): Money {
    this.assertSameCurrency(other);
    if (other.value.amount > this.value.amount) {
      throw new InsufficientFundsError(other.value.amount, this.value.amount);
    }
    return new Money(this.value.amount - other.value.amount, this.value.currency);
  }

  private assertSameCurrency(other: Money): void {
    if (!this.value.currency.isEqual(other.value.currency)) {
      throw new DomainBusinessError('Currency mismatch');
    }
  }
}
```

`isEqual` is inherited from `ValueObject` and compares nested VOs by value; do not redeclare it per class.

## Multi-field VO (Address)

```typescript
type AddressProps = { street: string; city: string; postalCode: string; country: string };

function ensureValidAddress(props: AddressProps): AddressProps {
  if (!props.street.trim()) throw new DomainValidationError('Street is required');
  if (!props.city.trim()) throw new DomainValidationError('City is required');
  if (!/^\d{5}$/.test(props.postalCode)) throw new DomainValidationError('Invalid postal code');
  return props;
}

class Address extends ValueObject<AddressProps> {
  constructor(props: AddressProps) {
    super(ensureValidAddress(props));
  }
}
```

## VO vs primitive

Use a Value Object when:
- two or more primitives always travel together (amount + currency, lat + lon)
- a primitive has validation rules (email format, postal code regex)
- a primitive has domain operations (`Money.add`, `Percentage.of`)
- the same validation is being duplicated for one primitive type

## ContextObject: a named cluster of VOs

Use when several VOs only make sense together. It extends `ValueObject`, so equality and `value` work like any other VO.

```typescript
abstract class ContextObject<T extends Record<string, ValueObject<unknown>>> extends ValueObject<T> {
  get<K extends keyof T>(key: K): T[K] {
    return this.value[key];
  }
}

class ProductIdentity extends ContextObject<{ sku: Sku; ean: Ean; storeCode: StoreCode }> {
  static of(sku: Sku, ean: Ean, storeCode: StoreCode): ProductIdentity {
    return new ProductIdentity({ sku, ean, storeCode });
  }
}

const identity = ProductIdentity.of(sku, ean, storeCode);
identity.get('sku'); // typed as Sku
```

## Composite identity

A VO that is an identity formed from several parts:

```typescript
class ProductId extends ValueObject<{ sku: string; ean: string; storeCode: string }> {
  static of(sku: Sku, ean: Ean, storeCode: StoreCode): ProductId {
    return new ProductId({ sku: sku.value, ean: ean.value, storeCode: storeCode.value });
  }
}
```

## Serialization

Use `ToPrimitives<T>` (see `base-classes.md`) to unwrap VOs for DTOs, event payloads and persistence mappers.

```typescript
type MoneyPrimitive = ToPrimitives<Money>; // { amount: number; currency: string }

// DAO mapper
toDomain(): Money {
  return new Money(this.amount, new Currency(this.currencyCode));
}
```

Violations and severities: `anti-patterns.md` (AP-10, AP-11, AP-17, AP-30, AP-32, AP-46).
