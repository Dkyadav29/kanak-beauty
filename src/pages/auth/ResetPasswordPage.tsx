import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/services';
import { getErrorMessage } from '@/lib/api/errors';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button, FormField, InlineAlert, Input } from '@/components/ui';

const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type FormValues = z.infer<typeof schema>;

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await authService.resetPassword({ token, password: values.password });
      navigate('/login', { replace: true, state: { message: 'Password reset. Please sign in.' } });
    } catch (e) {
      setServerError(getErrorMessage(e));
    }
  };

  if (!token) {
    return (
      <AuthCard title="Invalid reset link" description="This link is missing its token.">
        <Link to="/forgot-password" className="font-semibold text-rose-700 hover:underline">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" description="Your new password must be at least 8 characters with a letter and a number.">
      {serverError ? (
        <InlineAlert tone="danger" className="mb-4">
          {serverError}{' '}
          <Link to="/forgot-password" className="font-semibold underline">
            Request a new link
          </Link>
        </InlineAlert>
      ) : null}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField label="New password" htmlFor="password" error={errors.password?.message} required>
          <Input id="password" type="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
        </FormField>
        <FormField label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
          <Input id="confirmPassword" type="password" autoComplete="new-password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </FormField>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Reset password
        </Button>
      </form>
    </AuthCard>
  );
};

export default ResetPasswordPage;
