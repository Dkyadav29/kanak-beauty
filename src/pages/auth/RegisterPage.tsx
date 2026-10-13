import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gift } from 'lucide-react';
import { authService } from '@/services';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { useValidateReferral } from '@/hooks/useCatalog';
import { formatCurrency } from '@/lib/utils';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button, Checkbox, FormField, InlineAlert, Input } from '@/components/ui';

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email address'),
    mobile: z.string().regex(/^\+?[0-9 ]{10,15}$/, 'Enter a valid mobile number'),
    password: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
    confirmPassword: z.string(),
    referralCode: z.string().max(40).optional(),
    terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms to continue' }) }),
  })
  .refine((v) => v.password === v.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type FormValues = z.infer<typeof schema>;

const RegisterPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { referralCode: params.get('ref')?.toUpperCase() ?? '' } });
  const referralCode = (watch('referralCode') ?? '').trim();
  const referral = useValidateReferral(referralCode || undefined);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await authService.register({
        name: values.name,
        email: values.email,
        mobile: values.mobile,
        password: values.password,
        referralCode: values.referralCode?.trim() ? values.referralCode.trim().toUpperCase() : undefined,
      });
      if (res.verificationRequired) {
        navigate('/verify-email', { state: { email: res.email }, replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        Object.entries(e.details).forEach(([field, msgs]) => setError(field as keyof FormValues, { message: msgs[0] }));
      }
      setServerError(getErrorMessage(e));
    }
  };

  return (
    <AuthCard
      title="Create your account"
      description="Join Kanak Beauty Academy to enroll in courses and track your learning."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-rose-700 hover:underline">
            Sign in
          </Link>
        </>
      }
      aside="Registration takes a minute. We will send a verification code to your email."
    >
      {serverError ? (
        <InlineAlert tone="danger" className="mb-4">
          {serverError}
        </InlineAlert>
      ) : null}
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2" noValidate>
        <FormField label="Full name" htmlFor="name" error={errors.name?.message} required className="sm:col-span-2">
          <Input id="name" autoComplete="name" invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField label="Email address" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label="Mobile number" htmlFor="mobile" error={errors.mobile?.message} required>
          <Input id="mobile" type="tel" autoComplete="tel" placeholder="+91 98765 43210" invalid={!!errors.mobile} {...register('mobile')} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters with a letter and a number" required>
          <Input id="password" type="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
        </FormField>
        <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
          <Input id="confirmPassword" type="password" autoComplete="new-password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </FormField>
        <FormField
          label="Referral code (optional)"
          htmlFor="referralCode"
          error={errors.referralCode?.message ?? (referralCode && referral.data && !referral.data.valid ? 'This referral code is not valid.' : undefined)}
          hint={
            referralCode && referral.data?.valid ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Gift className="h-3.5 w-3.5" /> Invited by {referral.data.referrerFirstName}: you get {formatCurrency(referral.data.refereeDiscountAmount, referral.data.currency)} off your first course.
              </span>
            ) : (
              'Have a friend at Kanak? Enter their Refer & Earn code.'
            )
          }
          className="sm:col-span-2"
        >
          <Input id="referralCode" autoComplete="off" placeholder="e.g. PRIYA-1037" className="font-mono uppercase" invalid={!!referralCode && referral.data?.valid === false} {...register('referralCode')} />
        </FormField>
        <div className="sm:col-span-2">
          <Checkbox
            id="terms"
            label={
              <>
                I agree to the{' '}
                <Link to="/terms" className="font-semibold text-rose-700 hover:underline">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="font-semibold text-rose-700 hover:underline">
                  Privacy Policy
                </Link>
              </>
            }
            {...register('terms')}
          />
          {errors.terms ? (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
              {errors.terms.message}
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Create account
          </Button>
        </div>
      </form>
    </AuthCard>
  );
};

export default RegisterPage;
