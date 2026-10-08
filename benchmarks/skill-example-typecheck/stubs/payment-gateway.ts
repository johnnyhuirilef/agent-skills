export interface PaymentGateway {
  refund(orderId: string, amount: number, reason: string): Promise<{ status: 'REFUNDED' | 'PENDING' }>;
}
