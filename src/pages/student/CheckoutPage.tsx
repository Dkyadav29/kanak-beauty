import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, CreditCard, Gift, Lock, ShieldCheck, Wallet, XCircle } from 'lucide-react';
import { useCourse, useCourseBatches } from '@/hooks/useCatalog';
import { useCompleteSandboxCheckout, useCreateOrder, useEnrollments, usePolicyStatus, useReferralSummary, useStudentPayment, useVerifyRazorpay } from '@/hooks/useStudent';
import { BatchPicker, NoBatchNotice } from '@/components/shared/BatchPicker';
import { PaymentScheduleTable } from '@/components/shared/PaymentScheduleTable';
import { useAuth } from '@/features/auth/AuthContext';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { openRazorpay } from '@/lib/razorpay';
import { env } from '@/config/env';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { CreateOrderResponse, PaymentPlanType } from '@/types';
import { courseDurationLabel, formatAmount, paymentOptionSummary, sortedPaymentOptions } from '@/lib/coursePricing';
import { PriceTag } from '@/components/shared/CourseCard';
import { Button, ErrorState, ImageWithFallback, InlineAlert, LinkButton, LoadingSkeleton, PageHeader, Select, Spinner, StatusBadge } from '@/components/ui';

/**
 * Checkout flow:
 *   1. Create an order (backend creates a PENDING payment).
 *   2. Hand off to the gateway. Razorpay: the Checkout popup collects the payment and its
 *      signed result is sent to the backend for verification. Sandbox: the outcome is chosen
 *      here with success/failure buttons.
 *   3. Poll the payment record. Access is granted only when the backend reports "paid",
 *      which happens after it verifies the payment with the gateway (signed checkout result
 *      or signed webhook), never from this screen.
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
  const verifyRazorpay = useVerifyRazorpay();
  const [order, setOrder] = useState<CreateOrderResponse | null>(null);
  const [opening, setOpening] = useState(false);
  // Set once Razorpay reports success: from then on we only wait for the backend to confirm.
  const [confirming, setConfirming] = useState(false);
  const paidInCheckout = useRef(false);
  const [method, setMethod] = useState('UPI');
  const [error, setError] = useState<string | null>(null);
  const [applyWalletCredit, setApplyWalletCredit] = useState(true);
  const referral = useReferralSummary();
  const payment = useStudentPayment(order?.paymentId, { poll: true });
  // ?installment=<id> pays the next installment of a started plan; ?plan= preselects an option.
  const [searchParams] = useSearchParams();
  const installmentId = searchParams.get('installment') ?? undefined;
  const [plan, setPlan] = useState<PaymentPlanType | null>((searchParams.get('plan') as PaymentPlanType | null) ?? null);
  // The student must pick a batch explicitly; nothing is preselected.
  const [batchId, setBatchId] = useState<string | null>(null);
  const batches = useCourseBatches(installmentId ? undefined : courseId);
  const policyStatus = usePolicyStatus(isAuthenticated);
  const [acceptTerms, setAcceptTerms] = useState(false);

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
  const activeEnrollment = enrollments.data?.find((e) => e.courseId === c.id && e.enrollment.accessStatus === 'active');
  // Paying a later installment happens while already enrolled, so it skips the "already enrolled" screen.
  const alreadyEnrolled = !!activeEnrollment && !installmentId;
  const alreadyCompleted = !!activeEnrollment?.isCompleted;
  const options = sortedPaymentOptions(c.pricing?.paymentOptions ?? []);
  const selectedPlan: PaymentPlanType | undefined = options.find((o) => o.type === plan)?.type ?? options[0]?.type;
  const walletApplies = !installmentId && selectedPlan === 'full';
  const selectedOption = options.find((o) => o.type === selectedPlan);
  const batchRequired = !installmentId && !!batches.data?.batchRequired;
  const openBatches = (batches.data?.batches ?? []).filter((b) => b.isOpen);
  const selectedBatch = batches.data?.batches.find((b) => b.id === batchId && b.isOpen) ?? null;
  const termsPending = (policyStatus.data?.pending.length ?? 0) > 0;
  const canProceed = (installmentId || (!!selectedPlan && !batches.isLoading && (!batchRequired || !!selectedBatch))) && (!termsPending || acceptTerms);

  const start = async () => {
    setError(null);
    setConfirming(false);
    try {
      const res = await createOrder.mutateAsync(
        installmentId
          ? { courseId: c.id, installmentId, acceptTerms: termsPending ? acceptTerms : undefined }
          : {
              courseId: c.id,
              paymentPlan: selectedPlan,
              batchId: selectedBatch?.id,
              applyWalletCredit: walletApplies && applyWalletCredit,
              acceptTerms: termsPending ? acceptTerms : undefined,
            },
      );
      setOrder(res);
      // Fully covered by discounts/credit: already paid and enrolled, nothing to collect.
      if (res.status === 'paid') void enrollments.refetch();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ALREADY_ENROLLED') void enrollments.refetch();
      // The batch filled up or closed meanwhile: refresh the list so the student can pick another.
      if (e instanceof ApiError && ['BATCH_FULL', 'ENROLLMENT_CLOSED', 'BATCH_CLOSED', 'NO_OPEN_BATCH', 'BATCH_REQUIRED'].includes(e.code)) {
        setBatchId(null);
        void batches.refetch();
      }
      if (e instanceof ApiError && e.code === 'TERMS_NOT_ACCEPTED') void policyStatus.refetch();
      setError(getErrorMessage(e));
    }
  };

  const payWithRazorpay = async () => {
    const g = order?.gateway;
    if (!order || !g?.keyId || !g.razorpayOrderId || g.amountMinor == null) return;
    setError(null);
    setOpening(true);
    paidInCheckout.current = false;
    try {
      await openRazorpay(
        {
          key: g.keyId,
          order_id: g.razorpayOrderId,
          amount: g.amountMinor,
          currency: order.currency,
          name: g.name ?? 'Kanak Beauty Academy',
          description: order.installment ? `${c.title} · installment ${order.installment.sequence}` : c.title,
          prefill: { name: user?.name, email: user?.email, contact: user?.mobile },
          notes: { orderId: order.orderId },
          theme: { color: '#c2456b' },
          handler: (res) => {
            paidInCheckout.current = true;
            setConfirming(true);
            verifyRazorpay
              .mutateAsync({ razorpayOrderId: res.razorpay_order_id, razorpayPaymentId: res.razorpay_payment_id, razorpaySignature: res.razorpay_signature })
              // The webhook still settles the payment if this call fails, so keep polling either way.
              .catch((e) => setError(`${getErrorMessage(e)} If money was deducted, your access will activate automatically within a few minutes.`))
              .finally(() => void payment.refetch());
          },
          modal: {
            confirm_close: true,
            ondismiss: () => {
              if (!paidInCheckout.current) setError('Payment window closed. You have not been charged; you can try again.');
            },
          },
        },
        (failure) => setError(failure.error.description || 'The payment failed. You can retry in the payment window.'),
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setOpening(false);
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
  const isRazorpay = order?.gateway.provider === 'razorpay';

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
                <CheckCircle2 className="h-4 w-4" /> {alreadyCompleted ? 'You have already completed this course. No need to buy it again.' : 'You already have access to this course.'}
              </InlineAlert>
              <LinkButton to={`/student/courses/${c.id}/learn`} className="mt-4">
                {alreadyCompleted ? 'Revisit course' : 'Continue learning'}
              </LinkButton>
            </div>
          ) : status === 'paid' ? (
            <div className="card p-8 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <h2 className="mt-4 font-display text-3xl font-semibold">Payment confirmed</h2>
              <p className="mt-2 text-charcoal-500">
                {order?.installment && order.installment.sequence > 1
                  ? `Order ${payment.data?.orderId} is paid. Installment ${order.installment.sequence} of your plan is settled; a receipt is in your payment history.`
                  : `Order ${payment.data?.orderId} is paid and your enrollment is active. A receipt is available in your payment history.`}
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
                {order.installment && order.plan ? (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-charcoal-500">Plan total ({order.plan.installments.length} payments)</dt>
                      <dd>{formatAmount(order.plan.totalAmount, order.currency)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-charcoal-500">{order.installment.kind === 'deposit' ? 'Deposit' : `Installment ${order.installment.sequence} of ${order.plan.installments.length}`}</dt>
                      <dd>{formatAmount(order.installment.amount, order.currency)}</dd>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <dt className="text-charcoal-500">Course price</dt>
                    <dd>{formatCurrency(order.listPrice, order.currency)}</dd>
                  </div>
                )}
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
                  <dt>Amount payable now</dt>
                  <dd>{formatAmount(order.amount, order.currency)}</dd>
                </div>
              </dl>
              {status === 'pending' && (simulate.isSuccess || confirming) ? (
                <div className="mt-6 flex items-center gap-3 rounded-xl bg-ivory-100 p-4 text-sm text-charcoal-700">
                  <Spinner /> Payment received. Confirming with the payment provider and activating your course…
                </div>
              ) : isRazorpay ? (
                <div className="mt-6">
                  <Button size="lg" onClick={() => void payWithRazorpay()} loading={opening} leftIcon={<CreditCard className="h-4 w-4" />}>
                    Pay {formatAmount(order.amount, order.currency)}
                  </Button>
                  <p className="mt-3 text-xs text-charcoal-500">UPI, cards, net banking and wallets via Razorpay. Your course unlocks automatically once the payment succeeds.</p>
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
                      Pay {formatAmount(order.amount, order.currency)}
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
              {!installmentId && batchRequired ? (
                <section className="mt-5" aria-labelledby="step-batch">
                  <h3 id="step-batch" className="text-sm font-semibold text-charcoal-900">
                    1. Choose your batch
                  </h3>
                  <p className="mb-2 text-xs text-charcoal-500">Your start date, class schedule and course access follow the batch you choose.</p>
                  {batches.isLoading ? (
                    <LoadingSkeleton variant="list" count={2} />
                  ) : batches.error ? (
                    <ErrorState error={batches.error} onRetry={() => void batches.refetch()} compact />
                  ) : openBatches.length > 0 ? (
                    <BatchPicker batches={batches.data?.batches ?? []} value={batchId} onChange={setBatchId} />
                  ) : (
                    <NoBatchNotice courseIdOrSlug={c.slug} email={user?.email} />
                  )}
                </section>
              ) : null}
              {installmentId ? (
                <InlineAlert tone="info" className="mt-5">
                  You are paying the next installment of your plan for this course. The amount is the one you agreed to when you enrolled.
                </InlineAlert>
              ) : options.length > 0 ? (
                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold text-charcoal-900">{batchRequired ? '2. ' : ''}Choose how to pay</legend>
                  <div className="mt-2 space-y-2">
                    {options.map((o) => (
                      <label key={o.type} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${selectedPlan === o.type ? 'border-rose-400 bg-rose-50/60' : 'border-ivory-300 hover:border-rose-200'}`}>
                        <input type="radio" name="paymentPlan" className="mt-1 h-4 w-4 accent-rose-600" checked={selectedPlan === o.type} onChange={() => setPlan(o.type)} />
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="font-semibold text-charcoal-900">{o.label}</span>
                            <span className="font-semibold">{formatAmount(o.totalAmount, c.currency)}</span>
                          </span>
                          <span className="block text-charcoal-700">{paymentOptionSummary(o, c.currency)}</span>
                          {o.additionalFee > 0 ? <span className="block text-xs text-charcoal-500">Includes a {formatAmount(o.additionalFee, c.currency)} plan fee</span> : null}
                          {o.type !== 'full' && selectedPlan === o.type ? (
                            <span className="mt-1 block text-xs text-charcoal-500">
                              You pay {formatAmount(o.schedule[0].amount, c.currency)} now; course access starts once it is confirmed. Remaining installments are paid from Payment History when due (never charged automatically).
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <InlineAlert tone="warning" className="mt-5">
                  Online payment is not available for this course right now. Please contact the academy.
                </InlineAlert>
              )}
              {!installmentId && selectedOption && selectedOption.type !== 'full' ? (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-charcoal-900">Payment schedule</p>
                  <PaymentScheduleTable option={selectedOption} currency={c.currency} />
                  <p className="mt-2 text-xs text-charcoal-500">Dates are estimates: the schedule starts on the day your first payment is confirmed. Each installment is paid by you from Payment History; nothing is charged automatically.</p>
                </div>
              ) : null}
              {walletApplies && referral.data && referral.data.stats.walletBalance > 0 ? (
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
              {termsPending ? (
                <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-rose-600" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                  <span className="text-charcoal-700">
                    I have read and accept the{' '}
                    <Link to="/terms" target="_blank" className="font-semibold text-rose-700 hover:underline">
                      Terms and Conditions
                    </Link>{' '}
                    (including payment and installment obligations) and the{' '}
                    <Link to="/privacy" target="_blank" className="font-semibold text-rose-700 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
              ) : null}
              <Button className="mt-6 w-full sm:w-auto" size="lg" onClick={() => void start()} loading={createOrder.isPending} disabled={!canProceed} leftIcon={<CreditCard className="h-4 w-4" />}>
                Proceed to payment
              </Button>
              <p className="mt-3 text-xs text-charcoal-500">
                By continuing you agree to the{' '}
                <Link to="/refund-policy" className="font-semibold text-rose-700 hover:underline">
                  refund policy
                </Link>
                .{batchRequired && !selectedBatch && openBatches.length > 0 ? ' Choose a batch to continue.' : ''}
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
              {c.trainer ? `${c.trainer.name} · ` : ''}{courseDurationLabel(c)}
            </p>
            {selectedBatch ? (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
                <span className="font-semibold">{selectedBatch.name}</span> · starts {formatDate(selectedBatch.startDate)}
              </p>
            ) : null}
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
