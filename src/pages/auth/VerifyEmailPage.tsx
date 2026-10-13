import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { authService } from '@/services';
import { getErrorMessage } from '@/lib/api/errors';
import { homeRouteForRole } from '@/lib/permissions';
import { env } from '@/config/env';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button, FormField, InlineAlert, Input } from '@/components/ui';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});
type FormValues = z.infer<typeof schema>;

const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const presetEmail = (location.state as { email?: string } | null)?.email ?? '';
  const [serverError, setServerError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: presetEmail, otp: '' } });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const session = await authService.verifyOtp(values);
      signIn(session);
      navigate(homeRouteForRole(session.user.role), { replace: true });
    } catch (e) {
      setServerError(getErrorMessage(e));
    }
  };

  const resend = async () => {
    setServerError(null);
    try {
      const res = await authService.resendOtp(getValues('email'));
      setInfo(res.message);
    } catch (e) {
      setServerError(getErrorMessage(e));
    }
  };

  return (
    <AuthCard
      title="Verify your email"
      description="We sent a 6-digit verification code to your email address. Enter it below to activate your account."
      footer={
        <Link to="/login" className="font-semibold text-rose-700 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-rose-800">
        <MailCheck className="h-6 w-6" />
        <p className="text-sm">Check your inbox and spam folder. The code expires in 15 minutes.</p>
      </div>
      {env.isDev ? (
        <InlineAlert tone="info" className="mb-4">
          Development: the backend prints outgoing emails to its console. Copy the 6-digit code from the terminal running <span className="font-mono">manage.py runserver</span>.
        </InlineAlert>
      ) : null}
      {info ? (
        <InlineAlert tone="success" className="mb-4">
          {info}
        </InlineAlert>
      ) : null}
      {serverError ? (
        <InlineAlert tone="danger" className="mb-4">
          {serverError}
        </InlineAlert>
      ) : null}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField label="Email address" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label="Verification code" htmlFor="otp" error={errors.otp?.message} required>
          <Input id="otp" inputMode="numeric" maxLength={6} autoComplete="one-time-code" className="font-mono text-lg tracking-[0.4em]" invalid={!!errors.otp} {...register('otp')} />
        </FormField>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Verify and continue
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => void resend()}>
          Resend code
        </Button>
      </form>
    </AuthCard>
  );
};

export default VerifyEmailPage;
