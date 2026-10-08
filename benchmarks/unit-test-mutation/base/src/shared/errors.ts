export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} not found: ${id}`);
  }
}

export class CurrencyMismatchError extends DomainError {
  constructor(from: string, to: string) {
    super('CURRENCY_MISMATCH', `Currency mismatch: ${from} vs ${to}`);
  }
}

export class AccountFrozenError extends DomainError {
  constructor(id: string) {
    super('ACCOUNT_FROZEN', `Account is frozen: ${id}`);
  }
}

export class InsufficientFundsError extends DomainError {
  constructor(id: string) {
    super('INSUFFICIENT_FUNDS', `Insufficient funds in account: ${id}`);
  }
}

export class InvalidTokenError extends DomainError {
  constructor() {
    super('INVALID_TOKEN', 'Invalid or expired token');
  }
}

export class SubscriptionCancelledError extends DomainError {
  constructor(id: string) {
    super('SUBSCRIPTION_CANCELLED', `Subscription is cancelled: ${id}`);
  }
}

export class ChargeFailedError extends DomainError {
  constructor(id: string, options?: { cause?: unknown }) {
    super('CHARGE_FAILED', `Charge failed for subscription: ${id}`);
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

export class GatewayTimeoutError extends DomainError {
  constructor() {
    super('GATEWAY_TIMEOUT', 'Payment gateway timed out');
  }
}

export class CardDeclinedError extends DomainError {
  constructor() {
    super('CARD_DECLINED', 'Card was declined');
  }
}
