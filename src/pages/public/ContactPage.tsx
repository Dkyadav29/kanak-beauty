import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, MapPin, Phone, Clock3 } from 'lucide-react';
import { Button, FormField, InlineAlert, Input, SectionHeading, Textarea } from '@/components/ui';

const schema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  email: z.string().email('Enter a valid email address'),
  mobile: z.string().min(10, 'Enter a valid mobile number'),
  message: z.string().min(10, 'Tell us a little more (at least 10 characters)'),
});
type FormValues = z.infer<typeof schema>;

const ContactPage = () => {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // No contact endpoint exists in the backend contract yet; see docs/API_CONTRACTS.md (POST /contact).
  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 400));
    setSent(true);
    reset();
  };

  return (
    <div className="container-x grid gap-12 py-12 lg:grid-cols-[1fr_1.2fr] lg:py-16">
      <div>
        <SectionHeading eyebrow="Contact us" title="Talk to an admissions advisor" description="Have a question about a course, schedule or payment? Send us a message and the academy team will get back to you." />
        <ul className="mt-8 space-y-4 text-sm text-charcoal-700">
          {[
            { icon: Mail, label: 'Email', value: 'hello@kanakacademy.example' },
            { icon: Phone, label: 'Phone / WhatsApp', value: '+91 00000 00000' },
            { icon: MapPin, label: 'Studio', value: 'Academy address to be configured' },
            { icon: Clock3, label: 'Hours', value: 'Mon to Sat, 10:00 to 19:00' },
          ].map((i) => (
            <li key={i.label} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <i.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">{i.label}</p>
                <p>{i.value}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="card p-6 sm:p-8">
        {sent ? (
          <InlineAlert tone="success" className="mb-4">
            Thank you. The contact inbox is not connected yet, so please reach us directly using the email or phone number shown on this page.
          </InlineAlert>
        ) : null}
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2" noValidate>
          <FormField label="Full name" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" autoComplete="name" invalid={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
          </FormField>
          <FormField label="Mobile number" htmlFor="mobile" error={errors.mobile?.message} required className="sm:col-span-2">
            <Input id="mobile" type="tel" autoComplete="tel" invalid={!!errors.mobile} {...register('mobile')} />
          </FormField>
          <FormField label="Message" htmlFor="message" error={errors.message?.message} required className="sm:col-span-2">
            <Textarea id="message" rows={5} invalid={!!errors.message} {...register('message')} />
          </FormField>
          <div className="sm:col-span-2">
            <Button type="submit" loading={isSubmitting} size="lg">
              Send message
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactPage;
