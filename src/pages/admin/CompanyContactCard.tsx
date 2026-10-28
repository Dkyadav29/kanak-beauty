import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useLogoMutations } from '@/hooks/useAdmin';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import type { SiteContact, SiteSettings } from '@/types';
import { Button, Card, CardBody, CardFooter, CardHeader, FormField, Input, Textarea, useToast } from '@/components/ui';

const phone = z.string().trim().regex(/^(\+?[0-9 ()-]{7,20})?$/, 'Enter a valid number, e.g. +91 62072 83072');
const schema = z.object({
  companyName: z.string().trim().max(120),
  address: z.string().trim().max(500, 'At most 500 characters'),
  phone,
  whatsapp: phone,
  email: z.string().trim().email('Enter a valid email').or(z.literal('')),
  businessHours: z.string().trim().max(160),
  mapUrl: z.string().trim().url('Enter a valid link, e.g. a Google Maps share link').or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;
const FIELDS = Object.keys(schema.shape) as Array<keyof FormValues>;

const toValues = (s?: SiteSettings): FormValues => ({
  companyName: s?.companyName ?? '',
  address: s?.address ?? '',
  phone: s?.phone ?? '',
  whatsapp: s?.whatsapp ?? '',
  email: s?.email ?? '',
  businessHours: s?.businessHours ?? '',
  mapUrl: s?.mapUrl ?? '',
});

/** Company address and contact details shown in the website footer and on the Contact page. */
export const CompanyContactCard = ({ site }: { site?: SiteSettings }) => {
  const toast = useToast();
  const { updateContact } = useLogoMutations();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(site) });

  useEffect(() => {
    if (site && !isDirty) reset(toValues(site));
  }, [site, isDirty, reset]);

  const submit = async (values: FormValues) => {
    try {
      const saved = await updateContact.mutateAsync(values as SiteContact);
      reset(toValues(saved));
      toast.success('Contact details saved', 'The footer and Contact page now show the new details.');
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        Object.entries(e.details).forEach(([field, msgs]) => {
          if (FIELDS.includes(field as keyof FormValues)) setError(field as keyof FormValues, { message: msgs[0] });
        });
      }
      toast.error('Could not save', getErrorMessage(e));
    }
  };

  return (
    <Card>
      <CardHeader title="Company contact details" description="Shown in the website footer and on the Contact page. Leave a field blank to hide it." />
      <form onSubmit={handleSubmit(submit)} noValidate>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <FormField label="Company name" htmlFor="co-name" error={errors.companyName?.message}>
            <Input id="co-name" {...register('companyName')} placeholder="Kanak Beauty Service" />
          </FormField>
          <FormField label="Email" htmlFor="co-email" error={errors.email?.message}>
            <Input id="co-email" type="email" invalid={!!errors.email} {...register('email')} />
          </FormField>
          <FormField label="Address" htmlFor="co-address" error={errors.address?.message} hint="Full studio address; line breaks are kept" className="sm:col-span-2">
            <Textarea id="co-address" rows={3} invalid={!!errors.address} {...register('address')} placeholder={'2nd Floor, Plot 14, Boring Road\nPatna, Bihar 800001'} />
          </FormField>
          <FormField label="Phone" htmlFor="co-phone" error={errors.phone?.message}>
            <Input id="co-phone" type="tel" invalid={!!errors.phone} {...register('phone')} />
          </FormField>
          <FormField label="WhatsApp" htmlFor="co-wa" error={errors.whatsapp?.message} hint="Same as phone is fine">
            <Input id="co-wa" type="tel" invalid={!!errors.whatsapp} {...register('whatsapp')} />
          </FormField>
          <FormField label="Business hours" htmlFor="co-hours" error={errors.businessHours?.message}>
            <Input id="co-hours" {...register('businessHours')} placeholder="Mon to Sat, 10:00 to 19:00" />
          </FormField>
          <FormField label="Google Maps link" htmlFor="co-map" error={errors.mapUrl?.message} hint="Optional; the address becomes a map link">
            <Input id="co-map" type="url" invalid={!!errors.mapUrl} {...register('mapUrl')} placeholder="https://maps.app.goo.gl/…" />
          </FormField>
        </CardBody>
        <CardFooter>
          {isDirty ? <span className="mr-auto text-xs text-charcoal-500">Unsaved changes</span> : null}
          <Button type="submit" loading={isSubmitting} disabled={!isDirty} leftIcon={<Save className="h-4 w-4" />}>
            Save contact details
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
