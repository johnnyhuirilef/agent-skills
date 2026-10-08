import { Factory } from 'fishery';
import { type OrderPrimitives } from './order';
export const OrderFactory = Factory.define<OrderPrimitives>(({ sequence }) => ({
  id: `id-${sequence}`, orderNumber: sequence, amount: 1000, currency: 'USD', status: 'CREATED',
  billing: { id: 'b', date: '2025-01-15T10:00:00.000Z', transactionNumber: 1 }, items: [],
  customer: { documentNumber: '1', email: 'a@b.c' }, user: { email: 'a@b.c', fullName: 'A' },
  createdAt: new Date('2025-01-15T10:00:00Z'), updatedAt: new Date('2025-01-15T10:00:00Z'),
}));
