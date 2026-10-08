import { type Result } from 'neverthrow';
import { type InvalidOrderStateError, type OrderNotFoundError } from './errors';
import { type OrderStatus } from './order';
export interface ProcessOrderInput { orderId: string; paymentToken: string }
export interface ProcessOrderOutput { orderId: string; status: OrderStatus }
export declare class ProcessOrder {
  run(input: ProcessOrderInput): Promise<Result<ProcessOrderOutput, OrderNotFoundError | InvalidOrderStateError>>;
}
