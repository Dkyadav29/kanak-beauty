import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, CreditCard, Gift, Lock, ShieldCheck, Wallet, XCircle } from 'lucide-react';
import { useCourse } from '@/hooks/useCatalog';
import { useCompleteSandboxCheckout, useCreateOrder, useEnrollments, useReferralSummary, useStudentPayment } from '@/hooks/useStudent';
import { useAuth } from '@/features/auth/AuthContext';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { env } from '@/config/env';
import { formatCurrency } from '@/lib/utils';
import type { CreateOrderResponse } from '@/types';
import { PriceTag } from '@/components/shared/CourseCard';
import { Button, ErrorState, ImageWithFallback, InlineAlert, LinkButton, LoadingSkeleton, PageHeader, Select, Spinner, StatusBadge } from '@/components/ui';

/**
 * Checkout flow:
 *   1. Create an order (backend creates a PENDING payment).
 *   2. Hand off to the gateway (sandbox: the outcome is chosen here with success/failure buttons).
 *   3. Poll the payment record. Access is granted only when the backend reports "paid",
 *      which happens via the verified gateway webhook, never from this screen.
 */
const CheckoutPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isReady, user } = useAuth();
  const course = useCourse(courseId);
  const enrollments = useEnrollments();
  const createOrder = useCreateOrder();
  const simulate = useCompleteSandboxCheckout();
  const [order, setOrder] = useState<CreateOrderResponse | null>(null);
  const [method, setMethod] = useState('UPI');
  const [error, setError] = useState<string | null>(null);
  const [applyWalletCredit, setApplyWalletCredit] = useState(true);
  const referral = useReferralSummary();
  const payment = useStudentPayment(order?.paymentId, { poll: true });

  if (!isReady) return <LoadingSkeleton variant="page" />;
  if (!isAuthenticated) {
    navigate('/login', { replace: true, state: { from: location.pathname } });
    return null;
  }
  if (user?.role !== 'student') {
    return <InlineAlert tone="warning">Only student accounts can purchase courses.</InlineAlert>;
  }
  if (course.isLoading) return <LoadingSkeleton variant="page" />;
  if (course.error || !course.data) return <ErrorState error={course.error} onRetry={() => void course.refetch()} />;
  const c = course.data;
  const alreadyEnrolled = enrollments.data?.some((e) => e.courseId === c.id && e.enrollment.accessStatus === 'active');

  const start = async () => {
    setError(null);
    try {
      const res = await createOrder.mutateAsync({ courseId: c.id, applyWalletCredit });
      setOrder(res);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ALREADY_ENROLLED') void enrollments.refetch();
      setError(getErrorMessage(e));
    }
  };

  const pay = async (outcome: 'success' | 'failure') => {
    if (!order) return;
    setError(null);
    try {
      await simulate.mutateAsync({ checkoutToken: order.gateway.checkoutToken, outcome, method });
      void payment.refetch();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const status = payment.data?.status;

  return (
    <div className="mx-auto max-w-4xl">
      <Link to={`/courses/${c.slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-500 hover:text-rose-700">
        <ArrowLeft className="h-4 w-4" /> Back to course
      </Link>
      <PageHeader title="Secure checkout" description="Complete your enrollment. Your course access is activated as soon as the payment is confirmed." />

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {alreadyEnrolled ? (
            <div className="card p-6">
              <InlineAlert tone="success" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> You already have access to this course.
              </InlineAlert>
              <LinkButton to={`/student/courses/${c.id}/learn`} className="mt-4">
                Continue learning
              </LinkButton>
            </div>
          ) : status === 'paid' ? (
            <div className="card p-8 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <h2 className="mt-4 font-display text-3xl font-semibold">Payment confirmed</h2>
              <p className="mt-2 text-charcoal-500">
                Order {payment.data?.orderId} is paid and your enrollment is active. A receipt is available in your payment history.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <LinkButton to={`/student/courses/${c.id}/learn`}>Start learning</LinkButton>
                <LinkButton to="/student/payments" variant="outline">
                  View receipt
                </LinkButton>
              </div>
            </div>
          ) : status === 'failed' ? (
            <div className="card p-8 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                <XCircle className="h-8 w-8" />
              </span>
              <h2 className="mt-4 font-display text-3xl font-semibold">Payment failed</h2>
              <p className="mt-2 text-charcoal-500">{payment.data?.failureReason ?? 'The payment was not completed.'} No access has been granted and you have not been charged.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button
                  onClick={() => {
                    setOrder(null);
                    void start();
                  }}
                >
                  Try again
                </Button>
                <LinkButton to="/student/payments" variant="outline">
                  Payment history
                </LinkButton>
              </div>
            </div>
          ) : order ? (
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">Payment</h2>
                <StatusBadge status={status ?? 'pending'} />
              </div>
              <p className="mt-1 text-sm text-charcoal-500">
                Order <span className="font-mono">{order.orderId}</span>
              </p>
              <dl className="mt-4 space-y-1.5 rounded-xl bg-ivory-100 p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-charcoal-500">Course price</dt>
                  <dd>{formatCurrency(order.listPrice, order.currency)}</dd>
                </div>
                {order.referralDiscount > 0 ? (
                  <div className="flex justify-between text-emerald-700">
                    <dt className="flex items-center gap-1.5">
                      <Gift className="h-3.5 w-3.5" /> Referral welcome discount
                    </dt>
                    <dd>− {formatCurrency(order.referralDiscount, order.currency)}</dd>
                  </div>
                ) : null}
                {order.walletCreditApplied > 0 ? (
                  <div className="flex justify-between text-emerald-700">
                    <dt className="flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5" /> Wallet credit applied
                    </dt>
                    <dd>− {formatCurrency(order.walletCreditApplied, order.currency)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-ivory-300 pt-1.5 font-semibold text-charcoal-900">
                  <dt>Amount payable</dt>
                  <dd>{formatCurrency(order.amount, order.currency)}</dd>
                </div>
              </dl>
              {status === 'pending' && simulate.isSuccess ? (
                <div className="mt-6 flex items-center gap-3 rounded-xl bg-ivory-100 p-4 text-sm text-charcoal-700">
                  <Spinner /> Waiting for the payment provider to confirm…
                </div>
              ) : (
                <>
                  <InlineAlert tone="warning" className="mt-5">
                    {env.paymentSandbox ? (
                      <>
                        <strong>Sandbox gateway.</strong> No real money moves. Choose an outcome and the backend processes it exactly like the provider's signed webhook.
                      </>
                    ) : (
                      'Redirecting to the payment provider…'
                    )}
                  </InlineAlert>
                  <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <label className="text-sm font-medium">
                      Payment method
                      <Select className="mt-1.5" value={method} onChange={(e) => setMethod(e.target.value)}>
                        <option>UPI</option>
                        <option>Card</option>
                        <option>Net Banking</option>
                      </Select>
                    </label>
                    <Button onClick={() => void pay('success')} loading={simulate.isPending} leftIcon={<CreditCard className="h-4 w-4" />}>
                      Pay {formatCurrency(order.amount, order.currency)}
                    </Button>
                    {env.paymentSandbox ? (
                      <Button variant="outline" onClick={() => void pay('failure')} disabled={simulate.isPending}>
                        Simulate failure
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="card p-6">
              <h2 className="font-display text-2xl font-semibold">Order summary</h2>
              <ul className="mt-4 space-y-2 text-sm text-charcoal-700">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Payment is processed by a PCI-compliant gateway. Card details never touch our servers.
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-600" /> Access is granted only after the provider confirms the payment to our backend.
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" /> Duplicate orders for the same course are prevented automatically.
                </li>
              </ul>
              {referral.data && referral.data.stats.walletBalance > 0 ? (
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-gold-200 bg-gold-50 p-4">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-rose-600" checked={applyWalletCredit} onChange={(e) => setApplyWalletCredit(e.target.checked)} />
                  <span className="text-sm">
                    <span className="flex items-center gap-1.5 font-semibold text-charcoal-900">
                      <Wallet className="h-4 w-4 text-gold-700" /> Apply Refer & Earn wallet credit
                    </span>
                    <span className="block text-charcoal-700">
                      You have {formatCurrency(referral.data.stats.walletBalance, referral.data.program.currency)} available. Up to {formatCurrency(referral.data.program.maxCreditPerOrder, referral.data.program.currency)} can be applied to this order; the exact amount is confirmed by the backend when the order is created.
                    </span>
                  </span>
                </label>
              ) : null}
              <Button className="mt-6 w-full sm:w-auto" size="lg" onClick={() => void start()} loading={createOrder.isPending} leftIcon={<CreditCard className="h-4 w-4" />}>
                Proceed to payment
              </Button>
              <p className="mt-3 text-xs text-charcoal-500">
                By continuing you agree to the{' '}
                <Link to="/refund-policy" className="font-semibold text-rose-700 hover:underline">
                  refund policy
                </Link>
                .
              </p>
            </div>
          )}
          {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
        </div>

        <aside className="card self-start overflow-hidden">
          <ImageWithFallback src={c.thumbnailUrl} alt={c.title} className="aspect-[16/10] w-full object-cover" fallbackLabel={c.title} />
          <div className="p-5">
            <h3 className="font-display text-xl font-semibold leading-snug">{c.title}</h3>
            <p className="mt-1 text-sm text-charcoal-500">
              {c.trainer.name} · {c.durationWeeks} weeks
            </p>
            <div className="mt-4 border-t border-ivory-200 pt-4">
              <PriceTag price={c.price} discountPrice={c.discountPrice} currency={c.currency} />
              <p className="mt-1 text-xs text-charcoal-500">Billed to {user?.email}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CheckoutPage;
