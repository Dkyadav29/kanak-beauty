import { apiClient } from '@/lib/api/client';
import type { CreateOrderRequest, CreateOrderResponse, PaymentStatus, PaymentTransaction, RazorpayVerifyRequest } from '@/types';

export const paymentService = {
  /** Step 1: create a pending order on the backend. */
  createOrder: async (payload: CreateOrderRequest) => (await apiClient.post<CreateOrderResponse>('/payments/orders', payload)).data,

  /**
   * Sandbox gateway only (backend PAYMENT_GATEWAY=sandbox). Simulates the hosted
   * checkout outcome; the backend then runs its normal webhook processing. With a
   * real provider the hosted checkout collects payment and notifies the backend
   * via a signed webhook, and this endpoint does not exist.
   */
  completeSandboxCheckout: async (payload: { checkoutToken: string; outcome: 'success' | 'failure'; method: string }) =>
    (await apiClient.post<{ status: PaymentStatus }>('/payments/sandbox/complete', payload)).data,

  /**
   * Razorpay only (backend PAYMENT_GATEWAY=razorpay). Hands the checkout's signed result to
   * the backend, which verifies it with Razorpay and grants course access when captured. The
   * Razorpay webhook settles the same payment independently if this call never happens.
   */
  verifyRazorpay: async (payload: RazorpayVerifyRequest) => (await apiClient.post<PaymentTransaction>('/payments/razorpay/verify', payload)).data,
};
