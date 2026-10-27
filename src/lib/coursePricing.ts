import type { CourseSummary, DurationUnit, PaymentOption, PaymentPlanType } from '@/types';

/**
 * Display helpers for backend-computed course pricing. Nothing here decides an amount:
 * prices and installments come from the API (`course.pricing`), which the backend also
 * charges at checkout.
 */

/** Like formatCurrency, but keeps paise when present (installments can be e.g. ₹14,999.50). */
export const formatAmount = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount);

const UNIT_LABEL: Record<DurationUnit, [string, string]> = { days: ['day', 'days'], weeks: ['week', 'weeks'], months: ['month', 'months'] };

export const formatDurationValue = (value: number, unit: DurationUnit) => `${value} ${UNIT_LABEL[unit][value === 1 ? 0 : 1]}`;

/** "10 days", "6 months"; falls back to weeks for responses from before duration units existed. */
export const courseDurationLabel = (course: Pick<CourseSummary, 'durationWeeks'> & Partial<Pick<CourseSummary, 'durationValue' | 'durationUnit'>>) =>
  course.durationValue && course.durationUnit ? formatDurationValue(course.durationValue, course.durationUnit) : formatDurationValue(course.durationWeeks, 'weeks');

const PER: Record<DurationUnit, string> = { days: 'day', weeks: 'week', months: 'month' };

export const PLAN_ORDER: PaymentPlanType[] = ['full', 'monthly', 'daily', 'custom'];

/** Short, exact summary of a payment option, e.g. "6 × ₹5,000 / month" or "₹5,000 now + 5 × ₹5,100". */
export const paymentOptionSummary = (option: PaymentOption, currency = 'INR') => {
  if (option.type === 'full') return `${formatAmount(option.totalAmount, currency)} one-time`;
  const regular = option.schedule.filter((s) => s.kind === 'installment');
  const per = option.frequency ? ` / ${PER[option.frequency]}` : '';
  const uneven = regular.length > 1 && regular[0].amount !== option.installmentAmount;
  const repeat = uneven
    ? `${formatAmount(regular[0].amount, currency)} + ${regular.length - 1} × ${formatAmount(option.installmentAmount, currency)}${per}`
    : `${regular.length} × ${formatAmount(option.installmentAmount, currency)}${per}`;
  return option.depositAmount > 0 ? `${formatAmount(option.depositAmount, currency)} now + ${repeat}` : repeat;
};

export const sortedPaymentOptions = (options: PaymentOption[]) => [...options].sort((a, b) => PLAN_ORDER.indexOf(a.type) - PLAN_ORDER.indexOf(b.type));
