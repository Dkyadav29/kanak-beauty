import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/services';
import { getErrorMessage } from '@/lib/api/errors';
import { env } from '@/config/env';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button, FormField, InlineAlert, Input } from '@/components/ui';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type FormValues = z.infer<typeof schema>;

const ForgotPasswordPage = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await authService.forgotPassword(values);
      setMessage(res.message);
      setDevToken(res.devResetToken);
    } catch (e) {
      setServerError(getErrorMessage(e));
    }
  };

  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email you registered with and we will send you a reset link."
      footer={
        <Link to="/login" className="font-semibold text-rose-700 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {message ? (
        <InlineAlert tone="success" className="mb-4">
          {message}
          {env.isDev && devToken ? (
            <p className="mt-2">
              Development: the backend is in DEBUG mode and echoed the reset token.{' '}
              <Link to={`/reset-password?token=${devToken}`} className="font-semibold underline">
                Open the reset link
              </Link>
              .
            </p>
          ) : null}
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
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
};

export default ForgotPasswordPage;
