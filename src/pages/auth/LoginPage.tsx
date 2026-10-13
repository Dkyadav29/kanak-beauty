import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { authService } from '@/services';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { homeRouteForRole } from '@/lib/permissions';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button, FormField, InlineAlert, Input } from '@/components/ui';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});
type FormValues = z.infer<typeof schema>;

const LoginPage = () => {
  const { signIn, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const from = (location.state as { from?: string } | null)?.from;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setUnverifiedEmail(null);
    try {
      const session = await authService.login(values);
      signIn(session);
      // Students and admins land on their own dashboards; a protected deep link wins if it matches the role.
      const home = homeRouteForRole(session.user.role);
      const target = from && from.startsWith(session.user.role === 'admin' ? '/admin' : '/student') ? from : home;
      navigate(target, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(values.email);
      }
      setServerError(getErrorMessage(e));
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue learning."
      footer={
        <>
          New to Kanak?{' '}
          <Link to="/register" className="font-semibold text-rose-700 hover:underline">
            Create your account
          </Link>
        </>
      }
      aside="Your dashboard, live classes, recordings and certificates are one login away."
    >
      {sessionExpired ? (
        <InlineAlert tone="warning" className="mb-4">
          Your session expired. Please sign in again.
        </InlineAlert>
      ) : null}
      {serverError ? (
        <InlineAlert tone="danger" className="mb-4">
          {serverError}
          {unverifiedEmail ? (
            <>
              {' '}
              <Link to="/verify-email" state={{ email: unverifiedEmail }} className="font-semibold underline">
                Verify now
              </Link>
            </>
          ) : null}
        </InlineAlert>
      ) : null}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField label="Email address" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" leftIcon={<Mail className="h-4 w-4" />} invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <div className="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" leftIcon={<LockKeyhole className="h-4 w-4" />} invalid={!!errors.password} className="pr-11" {...register('password')} />
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute inset-y-0 right-3 flex items-center text-charcoal-500 hover:text-charcoal-800" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-semibold text-rose-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
};

export default LoginPage;
