/**
 * Loads Razorpay Checkout (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)
 * on first use. The script must come from Razorpay's CDN; card/UPI details are entered in
 * Razorpay's own iframe and never pass through this app.
 */

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailure {
  error: { code: string; description: string; reason?: string };
}

export interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', cb: (response: RazorpayFailure) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;

export const loadRazorpay = (): Promise<void> => {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null; // allow a retry after a network blip
      script.remove();
      reject(new Error('Could not load the payment window. Check your connection and try again.'));
    };
    document.body.appendChild(script);
  });
  return loading;
};

/** Opens the checkout; resolves once it is on screen. Outcomes arrive through the callbacks. */
export const openRazorpay = async (options: RazorpayOptions, onFailure: (response: RazorpayFailure) => void) => {
  await loadRazorpay();
  if (!window.Razorpay) throw new Error('Could not load the payment window. Please try again.');
  const checkout = new window.Razorpay(options);
  checkout.on('payment.failed', onFailure);
  checkout.open();
};
