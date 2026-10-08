export interface PaymentService {
  charge(orderId: string, amount: number, paymentToken: string): Promise<{ status: 'APPROVED' | 'REJECTED' }>;
}
