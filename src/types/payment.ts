import type { ISODateString } from './common';
import type { PaymentPlanType } from './course';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
export type InstallmentStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';
export type PaymentPlanStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface Installment {
  id: string;
  sequence: number;
  kind: 'deposit' | 'installment';
  amount: number;
  dueDate: string;
  status: InstallmentStatus;
  paidAt: ISODateString | null;
  isOverdue: boolean;
}

/** GET /student/payment-plans: the fee and schedule the student agreed to (a snapshot). */
export interface PaymentPlan {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  planType: Exclude<PaymentPlanType, 'full'>;
  status: PaymentPlanStatus;
  currency: string;
  listPrice: number;
  discountAmount: number;
  courseFee: number;
  additionalFee: number;
  totalAmount: number;
  paidAmount: number;
  installments: Installment[];
  nextInstallment: Installment | null;
  activatedAt: ISODateString | null;
  completedAt: ISODateString | null;
  createdAt: ISODateString;
}
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
  installmentId: string | null;
  planType: PaymentPlanType;
  installmentNumber: number | null;
  installmentCount: number | null;
}

export interface CreateOrderRequest {
  courseId: string;
  /** Apply available Refer & Earn wallet credit to this order (full payment only). */
  applyWalletCredit?: boolean;
  /** Payment option to start; the backend prices it. Defaults to full payment. */
  paymentPlan?: PaymentPlanType;
  /** Pay the next installment of a plan the student already started. */
  installmentId?: string;
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
    /** Razorpay only (null for other providers): publishable key id, provider order id, amount in paise, merchant name. */
    keyId: string | null;
    razorpayOrderId: string | null;
    amountMinor: number | null;
    name: string | null;
  };
  /** "paid" straight away when nothing is left to collect (e.g. wallet credit covers the price). */
  status: PaymentStatus;
  paymentPlan: PaymentPlanType;
  /** The installment this order collects; null for a full payment. */
  installment: Installment | null;
  plan: PaymentPlan | null;
}

/** What Razorpay Checkout passes to its success handler; the backend verifies the signature. */
export interface RazorpayVerifyRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus | 'all';
  from?: string;
  to?: string;
}
