import { PaymentMethod } from '../constants/payment-methods';
import { OrderStatus } from '../constants/order-status';

export interface Order {
  id: string;
  tenantId: string;
  userId: string;
  cashierId?: string;
  status: OrderStatus;
  subtotal: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentDetails?: PaymentDetails;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

export interface PaymentDetails {
  amountReceived?: number;
  change?: number;
  cardLast4?: string;
  referenceNumber?: string;
}

export interface OrderWithItems extends Order {
  items: OrderItemWithProduct[];
  user?: { id: string; name: string };
  cashier?: { id: string; name: string };
}

export interface OrderItemWithProduct extends OrderItem {
  product: { id: string; name: string; code?: string };
}
