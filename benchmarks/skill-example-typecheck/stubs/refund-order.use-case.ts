import { type AuditLogger } from './audit-logger';
import { type PaymentGateway } from './payment-gateway';
export interface RefundOrderInput { orderId: string; amount: number; reason: string }
export declare class RefundOrder {
  constructor(gateway: PaymentGateway, audit: AuditLogger);
  run(input: RefundOrderInput): Promise<void>;
}
