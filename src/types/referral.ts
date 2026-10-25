import type { ISODateString } from './common';

export type ReferralStatus = 'signed_up' | 'rewarded' | 'cancelled';
export type RewardStatus = 'credited' | 'redeemed' | 'reversed';

export interface ReferralProgramConfig {
  enabled: boolean;
  /** Credit added to the referrer's wallet when the referred friend's first payment is confirmed. */
  referrerRewardAmount: number;
  /** Discount applied to the referred friend's first course purchase. */
  refereeDiscountAmount: number;
  currency: string;
  /** Maximum wallet credit that can be applied to a single order. */
  maxCreditPerOrder: number;
}

/** fixed = an amount in the programme currency; percent = 0-100. */
export type ReferralValueType = 'fixed' | 'percent';

/**
 * One course's effective Refer & Earn rules (GET /admin/referrals/courses, ReferralSummary.courses).
 * `custom` false = the course follows the programme defaults. The two *Amount fields are what the
 * rules work out to at the current price; the reward is a share of what the friend pays after the discount.
 */
export interface CourseReferralTerms {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  courseStatus: string;
  price: number;
  custom: boolean;
  enabled: boolean;
  referrerRewardType: ReferralValueType;
  referrerRewardValue: number;
  refereeDiscountType: ReferralValueType;
  refereeDiscountValue: number;
  maxCreditPerOrder: number;
  referrerRewardAmount: number;
  refereeDiscountAmount: number;
  currency: string;
}

/** PUT /admin/referrals/courses/{courseId}. Fixed values are whole numbers up to 100000; percentages 0-100. */
export interface CourseReferralSettingInput {
  enabled: boolean;
  referrerRewardType: ReferralValueType;
  referrerRewardValue: number;
  refereeDiscountType: ReferralValueType;
  refereeDiscountValue: number;
  maxCreditPerOrder: number;
}

export interface Referral {
  id: string;
  referrerId: string;
  referralCode: string;
  refereeId: string;
  refereeName: string;
  refereeEmail: string;
  status: ReferralStatus;
  createdAt: ISODateString;
  convertedAt: ISODateString | null;
  rewardAmount: number | null;
  paymentId: string | null;
  courseTitle: string | null;
}

export interface ReferralReward {
  id: string;
  referralId: string | null;
  userId: string;
  /** Positive for credits, negative for redemptions and reversals. */
  amount: number;
  currency: string;
  status: RewardStatus;
  note: string;
  createdAt: ISODateString;
}

export interface ReferralSummary {
  program: ReferralProgramConfig;
  referralCode: string;
  referralLink: string;
  stats: {
    signedUp: number;
    converted: number;
    totalEarned: number;
    walletBalance: number;
  };
  referrals: Referral[];
  rewards: ReferralReward[];
  /** Published courses where Refer & Earn applies, with what a friend saves and you earn on each. */
  courses: CourseReferralTerms[];
}

export interface ReferralCodeValidation {
  valid: boolean;
  referrerFirstName: string | null;
  /** The programme-default discount (or a course's, when validated with a courseId). */
  refereeDiscountAmount: number;
  refereeDiscountType: ReferralValueType;
  refereeDiscountValue: number;
  currency: string;
}

/** Admin view joining referrer and referee. */
export interface ReferralAdminRow extends Referral {
  referrerName: string;
  referrerEmail: string;
}

export interface ReferralAdminStats {
  totalReferrals: number;
  converted: number;
  conversionRate: number;
  rewardsCredited: number;
  rewardsRedeemed: number;
  outstandingBalance: number;
  currency: string;
}

export interface ReferralFilters {
  search?: string;
  status?: ReferralStatus | 'all';
}
