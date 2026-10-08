export interface RefundEvent { type: 'ORDER_REFUNDED'; orderId: string; amount: number }
export interface AuditLogger { record(event: RefundEvent): Promise<void> }
