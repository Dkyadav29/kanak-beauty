import type { ISODateString } from './common';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
export type RefundStatus = 'none' | 'requested' | 'refunded';

export interface PaymentTransaction {
  id: string;
  orderId: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  currency: string;
  /** Course price before Refer & Earn discount and wallet credit. */
  listPrice: number;
  referralDiscount: number;
  walletCreditApplied: number;
  status: PaymentStatus;
  refundStatus: RefundStatus;
  method: string | null;
  gatewayReference: string | null;
  invoiceAvailable: boolean;
  createdAt: ISODateString;
  paidAt: ISODateString | null;
  failureReason: string | null;
}

export interface CreateOrderRequest {
  courseId: string;
  /** Apply available Refer & Earn wallet credit to this order. */
  applyWalletCredit?: boolean;
}

export interface CreateOrderResponse {
  orderId: string;
  paymentId: string;
  /** Final payable amount after discounts and credits. */
  amount: number;
  currency: string;
  listPrice: number;
  /** Refer & Earn first-purchase discount for referred students. */
  referralDiscount: number;
  /** Wallet credit redeemed against this order. */
  walletCreditApplied: number;
  /** Gateway checkout parameters returned by the backend (never contains secrets). */
  gateway: {
    provider: string;
    checkoutToken: string;
  };
}

export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus | 'all';
  from?: string;
  to?: string;
}
