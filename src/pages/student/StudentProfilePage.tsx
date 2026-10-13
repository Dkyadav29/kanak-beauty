import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Award, BookOpen, Camera, CreditCard, KeyRound } from 'lucide-react';
import { useChangePassword, useStudentProfile, useUpdateProfile } from '@/hooks/useStudent';
import { useAuth } from '@/features/auth/AuthContext';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { formatDate, imageFileToDataUrl } from '@/lib/utils';
import type { NotificationPreferences } from '@/types';
import { Avatar, Button, Card, CardBody, CardHeader, ErrorState, FormField, Input, KeyValue, LoadingSkeleton, PageHeader, Switch, Textarea, useToast } from '@/components/ui';

const profileSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  mobile: z.string().regex(/^\+?[0-9 ]{10,15}$/, 'Enter a valid mobile number'),
  dateOfBirth: z.string().optional(),
  address: z.string().max(240, 'Keep the address under 240 characters').optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type PasswordValues = z.infer<typeof passwordSchema>;

const StudentProfilePage = () => {
  const profile = useStudentProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const { refreshUser } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });
  const pwForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    if (profile.data) {
      form.reset({ name: profile.data.name, mobile: profile.data.mobile, dateOfBirth: profile.data.dateOfBirth ?? '', address: profile.data.address ?? '' });
      setPrefs(profile.data.notificationPreferences);
    }
  }, [profile.data, form]);

  if (profile.isLoading) return <LoadingSkeleton variant="page" />;
  if (profile.error || !profile.data) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  const p = profile.data;

  const saveProfile = async (values: ProfileValues) => {
    try {
      await updateProfile.mutateAsync({ name: values.name, mobile: values.mobile, dateOfBirth: values.dateOfBirth || null, address: values.address || null });
      await refreshUser();
      toast.success('Profile updated');
    } catch (e) {
      if (e instanceof ApiError && e.details) Object.entries(e.details).forEach(([f, m]) => form.setError(f as keyof ProfileValues, { message: m[0] }));
      toast.error('Could not update profile', getErrorMessage(e));
    }
  };

  const savePassword = async (values: PasswordValues) => {
    try {
      await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      pwForm.reset();
      toast.success('Password changed');
    } catch (e) {
      if (e instanceof ApiError && e.details) Object.entries(e.details).forEach(([f, m]) => pwForm.setError(f as keyof PasswordValues, { message: m[0] }));
      toast.error('Could not change password', getErrorMessage(e));
    }
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 8_000_000) {
      toast.error('Choose an image under 8 MB');
      return;
    }
    try {
      // The backend stores the avatar as a bounded data URL, so the photo is
      // downscaled client-side to a small square before it is sent.
      const avatarUrl = await imageFileToDataUrl(file, { maxSize: 320, quality: 0.85 });
      await updateProfile.mutateAsync({ avatarUrl });
      await refreshUser();
      toast.success('Profile photo updated');
    } catch (e) {
      toast.error('Could not update photo', getErrorMessage(e));
    }
  };

  const savePrefs = async (next: NotificationPreferences) => {
    setPrefs(next);
    try {
      await updateProfile.mutateAsync({ notificationPreferences: next });
    } catch (e) {
      toast.error('Could not save preferences', getErrorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Manage your personal details, security and notification preferences." />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card className="p-6 text-center">
            <div className="relative mx-auto w-fit">
              <Avatar name={p.name} src={p.avatarUrl} size="xl" />
              <button type="button" onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-700" aria-label="Update profile photo">
                <Camera className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold">{p.name}</h2>
            <p className="text-sm text-charcoal-500">{p.email}</p>
            <p className="mt-1 text-xs text-charcoal-500">Member since {formatDate(p.createdAt)}</p>
            <div className="mt-5 grid gap-2 text-left">
              {[
                { to: '/student/courses', icon: BookOpen, label: 'View enrolled courses' },
                { to: '/student/payments', icon: CreditCard, label: 'View payment history' },
                { to: '/student/certificates', icon: Award, label: 'View earned certificates' },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="flex items-center gap-3 rounded-xl border border-ivory-300 px-3.5 py-2.5 text-sm font-medium hover:border-rose-200 hover:bg-rose-50/40">
                  <l.icon className="h-4 w-4 text-rose-600" /> {l.label}
                </Link>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Account details" />
            <CardBody>
              <KeyValue className="sm:grid-cols-1" items={[{ label: 'Email', value: p.email }, { label: 'Email verified', value: p.emailVerified ? 'Yes' : 'No' }, { label: 'Account created', value: formatDate(p.createdAt) }, { label: 'Role', value: 'Student' }]} />
              <p className="mt-4 text-xs text-charcoal-500">To change your email address, contact the academy. It is verified and tied to your certificates.</p>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Personal information" description="These details appear on your certificates and receipts." />
            <CardBody>
              <form onSubmit={form.handleSubmit(saveProfile)} className="grid gap-5 sm:grid-cols-2" noValidate>
                <FormField label="Full name" htmlFor="name" error={form.formState.errors.name?.message} required>
                  <Input id="name" {...form.register('name')} />
                </FormField>
                <FormField label="Mobile number" htmlFor="mobile" error={form.formState.errors.mobile?.message} required>
                  <Input id="mobile" type="tel" {...form.register('mobile')} />
                </FormField>
                <FormField label="Date of birth" htmlFor="dob" error={form.formState.errors.dateOfBirth?.message}>
                  <Input id="dob" type="date" {...form.register('dateOfBirth')} />
                </FormField>
                <FormField label="Email" htmlFor="emailro">
                  <Input id="emailro" value={p.email} disabled readOnly />
                </FormField>
                <FormField label="Address" htmlFor="address" error={form.formState.errors.address?.message} className="sm:col-span-2">
                  <Textarea id="address" rows={2} {...form.register('address')} />
                </FormField>
                <div className="sm:col-span-2">
                  <Button type="submit" loading={updateProfile.isPending}>
                    Save changes
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Change password" description="Use a strong password you do not use anywhere else." />
            <CardBody>
              <form onSubmit={pwForm.handleSubmit(savePassword)} className="grid gap-5 sm:grid-cols-3" noValidate>
                <FormField label="Current password" htmlFor="currentPassword" error={pwForm.formState.errors.currentPassword?.message} required>
                  <Input id="currentPassword" type="password" autoComplete="current-password" {...pwForm.register('currentPassword')} />
                </FormField>
                <FormField label="New password" htmlFor="newPassword" error={pwForm.formState.errors.newPassword?.message} required>
                  <Input id="newPassword" type="password" autoComplete="new-password" {...pwForm.register('newPassword')} />
                </FormField>
                <FormField label="Confirm new password" htmlFor="confirmPassword" error={pwForm.formState.errors.confirmPassword?.message} required>
                  <Input id="confirmPassword" type="password" autoComplete="new-password" {...pwForm.register('confirmPassword')} />
                </FormField>
                <div className="sm:col-span-3">
                  <Button type="submit" variant="outline" loading={changePassword.isPending} leftIcon={<KeyRound className="h-4 w-4" />}>
                    Update password
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Notification preferences" description="Choose which messages you receive." />
            <CardBody className="grid gap-3 sm:grid-cols-2">
              {prefs
                ? (
                    [
                      ['liveClassReminders', 'Live class reminders', 'Reminders before each scheduled session'],
                      ['courseUpdates', 'Course updates', 'New lessons, recordings and schedule changes'],
                      ['paymentReceipts', 'Payment receipts', 'Receipts and refund confirmations'],
                      ['marketing', 'Offers and news', 'Occasional academy announcements'],
                    ] as Array<[keyof NotificationPreferences, string, string]>
                  ).map(([key, label, description]) => <Switch key={key} id={key} label={label} description={description} checked={prefs[key]} onChange={(v) => void savePrefs({ ...prefs, [key]: v })} />)
                : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;
