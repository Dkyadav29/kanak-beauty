import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { ImagePickerField } from '@/components/shared/ImagePickerField';
import { CompanyContactCard } from './CompanyContactCard';
import { useSiteSettings } from '@/hooks/useCatalog';
import { useLogoMutations } from '@/hooks/useAdmin';
import { resolveApiUrl } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';
import { Button, Card, CardBody, CardHeader, ConfirmationDialog, ErrorState, FormField, Input, LoadingSkeleton, Logo, PageHeader, useToast } from '@/components/ui';

/** Admin > Branding: upload, replace or remove the site logo (shown in every header, sidebar and footer). */
const AdminBrandingPage = () => {
  const toast = useToast();
  const site = useSiteSettings();
  const { upload, updateAlt, remove } = useLogoMutations();
  const [alt, setAlt] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (site.data) setAlt(site.data.logoAlt);
  }, [site.data]);

  const onPick = async (file: File) => {
    try {
      await upload.mutateAsync({ file, alt });
      toast.success('Logo updated', 'The new logo is live across the website.');
    } catch (e) {
      toast.error('Could not upload the logo', getErrorMessage(e));
    }
  };

  const onRemove = async () => {
    try {
      await remove.mutateAsync();
      toast.success('Logo removed', 'The built-in Kanak logo is shown again.');
    } catch (e) {
      toast.error('Could not remove the logo', getErrorMessage(e));
    } finally {
      setConfirmRemove(false);
    }
  };

  const saveAlt = async () => {
    try {
      await updateAlt.mutateAsync(alt);
      toast.success('Saved', 'Logo description updated.');
    } catch (e) {
      toast.error('Could not save', getErrorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader title="Branding & Contact" description="Change the website logo and the company address and contact details without touching code." />
      {site.isLoading ? (
        <LoadingSkeleton variant="page" />
      ) : site.error ? (
        <ErrorState error={site.error} onRetry={() => void site.refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader title="Logo" description="PNG, JPG or WebP up to 2 MB. A wide logo on a transparent background works best; it is shown 40 px high and keeps its aspect ratio." />
            <CardBody className="space-y-6">
              <ImagePickerField
                label="Website logo"
                current={site.data?.logoUrl ? resolveApiUrl(site.data.logoUrl) : null}
                onPick={(f) => void onPick(f)}
                onRemove={() => setConfirmRemove(true)}
                onError={(m) => toast.error('Invalid image', m)}
                busy={upload.isPending || remove.isPending}
              />
              <FormField label="Logo description" htmlFor="logo-alt" hint="Read by screen readers, e.g. Kanak Beauty Service">
                <div className="flex gap-2">
                  <Input id="logo-alt" value={alt} maxLength={120} onChange={(e) => setAlt(e.target.value)} />
                  <Button variant="secondary" onClick={() => void saveAlt()} loading={updateAlt.isPending} disabled={alt === (site.data?.logoAlt ?? '')} leftIcon={<Save className="h-4 w-4" />}>
                    Save
                  </Button>
                </div>
              </FormField>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Preview" description="How the logo looks on light and dark backgrounds." />
            <CardBody className="space-y-3">
              <div className="flex items-center rounded-xl border border-ivory-300 bg-white p-4">
                <Logo to="/admin/branding" />
              </div>
              <div className="flex items-center rounded-xl bg-charcoal-900 p-4">
                <Logo to="/admin/branding" dark />
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      {site.data ? (
        <div className="mt-6">
          <CompanyContactCard site={site.data} />
        </div>
      ) : null}
      <ConfirmationDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => void onRemove()}
        title="Remove the logo?"
        description="The website will show the built-in Kanak logo until you upload a new one."
        confirmLabel="Remove"
        variant="danger"
        loading={remove.isPending}
      />
    </div>
  );
};

export default AdminBrandingPage;
