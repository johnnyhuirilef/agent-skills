import { Order, type OrderId, type OrderPrimitives, type OrderStatus } from './order';
import { type OrderRepository } from './order.repository';
export class InMemoryOrderRepository implements OrderRepository {
  private readonly items = new Map<string, OrderPrimitives>();
  async save(order: Order): Promise<void> { this.items.set(order.id.value, order.toPrimitives()); }
  async findById(id: OrderId): Promise<Order | null> { const s = this.items.get(id.value); return s ? Order.fromPrimitives(s) : null; }
  async findByStatus(status: OrderStatus): Promise<Order[]> { return [...this.items.values()].filter((s) => s.status === status).map((s) => Order.fromPrimitives(s)); }
}
