import { type OrderRepository } from './order.repository';
import { type PaymentService } from './payment.service';
export interface ProcessOrderInput { orderId: string; paymentToken: string }
export class ProcessOrder {
  constructor(private readonly repository: OrderRepository, private readonly payments: PaymentService) {}
  async run(input: ProcessOrderInput): Promise<void> { void this.repository; void this.payments; void input; }
}
