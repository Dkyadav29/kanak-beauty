import type { PolicySlug } from '@/types';

/**
 * Starting text for the legal pages. Shown on the website until an admin publishes a version
 * (Admin > Policies), and used to pre-fill the editor. Format: "## " headings, "- " bullets,
 * blank lines between paragraphs. Must be reviewed by the academy's legal advisor before launch.
 */
export const POLICY_DEFAULTS: Record<PolicySlug, { title: string; intro: string; content: string }> = {
  terms: {
    title: 'Terms and Conditions',
    intro: 'These terms govern your use of the Kanak Beauty Service website and learning platform.',
    content: `## 1. Accounts and security
You must provide accurate information when registering and keep your login credentials confidential. You are responsible for all activity under your account. Tell us immediately if you suspect unauthorised use.

## 2. Enrollment and course access
- You choose an upcoming batch when you enroll. Your schedule, start date and course access follow that batch.
- Access is granted only after our payment provider confirms your payment to our servers.
- Access is personal and non-transferable. Sharing logins, recordings or course materials is prohibited.

## 3. Payments and installment obligations
- Course fees, discounts and installment amounts are calculated by our system and shown before you pay.
- If you choose an installment plan, you agree to pay every installment by its due date. Installments are never charged automatically; you pay each one from your Payment History.
- The fee agreed when you enroll does not change if the course price changes later.
- Overdue installments may lead to access being paused until the balance is paid.

## 4. Refunds and cancellations
Refunds and cancellations are handled under our Refund and Cancellation Policy.

## 5. Course completion and certificates
Certificates are issued only when the course's completion requirements are met (for example all required lessons, minimum live attendance and any assessment). Certificates may be revoked if issued in error or obtained through misconduct.

## 6. Acceptable use
- Behave respectfully in live sessions and community spaces.
- Do not attempt to access other users' data or disrupt the platform.
- The academy may suspend access for abusive behaviour or misuse; any refund is handled under the Refund Policy.

## 7. Changes to these terms
We may update these terms. When we do, you will be asked to accept the new version before your next registration or payment.`,
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'How we collect, use and protect your personal information.',
    content: `## What we collect
- Your name, email address and mobile number.
- Your enrollments, selected batch, learning progress, attendance and certificates.
- Payment records such as amounts, order numbers and installment status. Card and bank details are processed by our payment provider; we never store them.

## How we use it
- To deliver your courses, live classes and recordings.
- To send class reminders, payment receipts and installment due notices.
- To issue and verify certificates.
- To improve the academy. Marketing messages are optional.

## Data protection
Your data is stored on secured servers with access limited to authorised staff. Passwords are stored encrypted and payments are verified directly with the payment provider.

## Your rights
You may request a copy of your data, or ask for its correction or deletion, by contacting the academy. Certificate and payment records may be retained where the law or certificate verification requires it.

## Policy acceptance
We record which version of this policy and the Terms you accepted, and when, so we can show what you agreed to.`,
  },
  refund: {
    title: 'Refund and Cancellation Policy',
    intro: 'Our approach to cancellations, refunds and batch changes.',
    content: `## Recorded courses
Refund requests are considered within 7 days of purchase provided less than 20% of the course content has been accessed.

## Live and hybrid batches
Full refund if you withdraw at least 7 days before your batch start date. Partial refunds or a transfer to a later batch may be offered after that at the academy's discretion.

## Installment plans
- Installments already paid are refunded under the same rules as full payments.
- Cancelling a plan stops all future installments; no further payments are due.
- If the first installment is refunded, course access ends.

## Cancellations by the academy
If a batch is cancelled, you may choose a full refund or a transfer to the next available batch.

## Processing
Approved refunds are returned to the original payment method within 7 to 10 working days. Course access is withdrawn when a refund is processed.`,
  },
};
