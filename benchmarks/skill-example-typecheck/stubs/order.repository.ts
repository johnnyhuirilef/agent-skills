import { type Order, type OrderId, type OrderStatus } from './order';
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
}
