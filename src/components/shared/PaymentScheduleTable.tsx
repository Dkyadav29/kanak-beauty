import type { PaymentOption } from '@/types';
import { formatAmount } from '@/lib/coursePricing';
import { formatDate } from '@/lib/utils';

/**
 * Backend-computed installment schedule for one payment option. Dates are estimates from today;
 * the real schedule starts on the day the first payment is confirmed.
 */
export const PaymentScheduleTable = ({ option, currency }: { option: PaymentOption; currency: string }) => (
  <div className="overflow-hidden rounded-xl border border-ivory-300">
    <table className="w-full text-sm">
      <caption className="sr-only">Payment schedule</caption>
      <thead className="bg-ivory-100 text-left text-xs uppercase tracking-wider text-charcoal-500">
        <tr>
          <th className="px-3 py-2 font-semibold">#</th>
          <th className="px-3 py-2 font-semibold">Due</th>
          <th className="px-3 py-2 text-right font-semibold">Amount</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ivory-200">
        {option.schedule.map((s, i) => (
          <tr key={s.sequence}>
            <td className="px-3 py-2 text-charcoal-700">{s.kind === 'deposit' ? 'Deposit' : `${option.schedule.filter((x, j) => j <= i && x.kind === 'installment').length}`}</td>
            <td className="px-3 py-2 text-charcoal-700">{i === 0 ? 'Today, at checkout' : s.dueDate ? formatDate(s.dueDate) : `Day ${s.dueInDays + 1}`}</td>
            <td className="px-3 py-2 text-right font-medium">{formatAmount(s.amount, currency)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-ivory-50 font-semibold">
        {option.additionalFee > 0 ? (
          <tr>
            <td className="px-3 py-2" colSpan={2}>
              Includes plan fee
            </td>
            <td className="px-3 py-2 text-right">{formatAmount(option.additionalFee, currency)}</td>
          </tr>
        ) : null}
        <tr>
          <td className="px-3 py-2" colSpan={2}>
            Total payable ({option.installmentCount} payment{option.installmentCount === 1 ? '' : 's'})
          </td>
          <td className="px-3 py-2 text-right">{formatAmount(option.totalAmount, currency)}</td>
        </tr>
      </tfoot>
    </table>
  </div>
);
