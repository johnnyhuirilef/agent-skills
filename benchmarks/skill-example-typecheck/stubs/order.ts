export type OrderStatus = 'CREATED' | 'COMPLETED' | 'PAYMENT_FAILED' | 'CANCELLED';
export type Currency = 'USD' | 'EUR';
export interface OrderPrimitives {
  id: string; orderNumber: number; amount: number; currency: Currency; status: OrderStatus;
  billing: { id: string; date: string; transactionNumber: number };
  items: Array<{ productId: string; quantity: number }>;
  customer: { documentNumber: string; email: string };
  user: { email: string; fullName: string };
  createdAt: Date; updatedAt: Date;
}
export class OrderId { constructor(readonly value: string) {} }
export class Order {
  private constructor(private readonly props: OrderPrimitives) {}
  get id(): OrderId { return new OrderId(this.props.id); }
  get status(): OrderStatus { return this.props.status; }
  static fromPrimitives(p: OrderPrimitives): Order { return new Order(structuredClone(p)); }
  toPrimitives(): OrderPrimitives { return structuredClone(this.props); }
}
