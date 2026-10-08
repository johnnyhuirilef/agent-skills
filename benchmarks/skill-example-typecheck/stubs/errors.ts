export class OrderNotFoundError extends Error { constructor(orderId: string) { super(`Order ${orderId} not found`); } }
export class InvalidOrderStateError extends Error { constructor(status: string) { super(`Cannot process a ${status} order`); } }
export class ValidationError extends Error {}
