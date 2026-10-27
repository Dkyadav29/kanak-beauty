import { useEffect, useState } from 'react';
import { Eye, Send } from 'lucide-react';
import { PolicyText } from '@/components/shared/PolicyText';
import { usePolicyHistory, usePublishPolicy } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/api/errors';
import { POLICY_DEFAULTS } from '@/lib/policyDefaults';
import { formatDateTime } from '@/lib/utils';
import type { PolicySlug } from '@/types';
import { Badge, Button, Card, CardBody, CardFooter, CardHeader, ConfirmationDialog, FormField, InlineAlert, Input, LoadingSkeleton, PageHeader, Tabs, Textarea, useToast } from '@/components/ui';

const TABS: Array<{ value: PolicySlug; label: string }> = [
  { value: 'terms', label: 'Terms and Conditions' },
  { value: 'privacy', label: 'Privacy Policy' },
  { value: 'refund', label: 'Refund Policy' },
];

const PolicyEditor = ({ slug }: { slug: PolicySlug }) => {
  const toast = useToast();
  const history = usePolicyHistory(slug);
  const publish = usePublishPolicy();
  const current = history.data?.[0];
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState(false);

  // Start from the live version, or the default wording when nothing is published yet.
  useEffect(() => {
    if (history.isLoading) return;
    setTitle(current?.title ?? POLICY_DEFAULTS[slug].title);
    setSummary(current?.summary ?? POLICY_DEFAULTS[slug].intro);
    setContent(current?.content ?? POLICY_DEFAULTS[slug].content);
  }, [slug, current, history.isLoading]);

  const unchanged = !!current && title === current.title && summary === current.summary && content === current.content;
  const invalid = title.trim().length < 3 || content.trim().length < 50;
  const requiresAcceptance = slug !== 'refund';

  const doPublish = async () => {
    try {
      const p = await publish.mutateAsync({ slug, payload: { title: title.trim(), summary: summary.trim(), content: content.trim() } });
      toast.success(`Version ${p.version} published`, requiresAcceptance ? 'Users will be asked to accept it at their next registration or payment.' : 'The new text is live.');
    } catch (e) {
      toast.error('Could not publish', getErrorMessage(e));
    } finally {
      setConfirm(false);
    }
  };

  if (history.isLoading) return <LoadingSkeleton variant="page" />;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader
          title={current ? `Editing (live: version ${current.version})` : 'Not published yet'}
          description="Use ## for headings and - for bullet points. Publishing creates a new version; earlier versions are kept for the acceptance records."
          action={
            <Button variant="ghost" size="sm" onClick={() => setPreview((v) => !v)} leftIcon={<Eye className="h-4 w-4" />}>
              {preview ? 'Edit' : 'Preview'}
            </Button>
          }
        />
        <CardBody className="space-y-4">
          {!current ? <InlineAlert tone="warning">The website currently shows draft wording. Review it with your legal advisor, then publish.</InlineAlert> : null}
          {preview ? (
            <div className="rounded-2xl border border-ivory-300 p-5">
              <h2 className="font-display text-3xl font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-charcoal-500">{summary}</p>
              <div className="mt-5">
                <PolicyText content={content} />
              </div>
            </div>
          ) : (
            <>
              <FormField label="Title" htmlFor="pol-title" required>
                <Input id="pol-title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
              </FormField>
              <FormField label="Summary" htmlFor="pol-summary" hint="Shown under the title">
                <Input id="pol-summary" value={summary} maxLength={240} onChange={(e) => setSummary(e.target.value)} />
              </FormField>
              <FormField label="Content" htmlFor="pol-content" required hint="At least 50 characters">
                <Textarea id="pol-content" rows={22} className="font-mono text-sm" value={content} onChange={(e) => setContent(e.target.value)} />
              </FormField>
            </>
          )}
        </CardBody>
        <CardFooter>
          {unchanged ? <span className="mr-auto text-xs text-charcoal-500">No changes since the live version</span> : null}
          <Button onClick={() => setConfirm(true)} disabled={invalid || unchanged} leftIcon={<Send className="h-4 w-4" />}>
            Publish new version
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader title="Version history" />
        <CardBody>
          {history.data && history.data.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {history.data.map((v, i) => (
                <li key={v.id} className="flex items-start justify-between gap-2">
                  <span>
                    <span className="font-medium">Version {v.version}</span>
                    <span className="block text-xs text-charcoal-500">
                      {formatDateTime(v.publishedAt)}
                      {v.publishedByName ? ` · ${v.publishedByName}` : ''}
                    </span>
                  </span>
                  {i === 0 ? <Badge tone="success">Live</Badge> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-charcoal-500">No versions published yet.</p>
          )}
        </CardBody>
      </Card>
      <ConfirmationDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void doPublish()}
        title={`Publish version ${(current?.version ?? 0) + 1}?`}
        description={requiresAcceptance ? 'It goes live immediately. Every user will have to accept it at their next registration or checkout.' : 'It goes live immediately.'}
        confirmLabel="Publish"
        loading={publish.isPending}
      />
    </div>
  );
};

const AdminPoliciesPage = () => {
  const [tab, setTab] = useState<PolicySlug>('terms');
  return (
    <div>
      <PageHeader title="Policies" description="Edit and publish the Terms and Conditions, Privacy Policy and Refund Policy shown on the website, at registration and at checkout." />
      <Tabs items={TABS} value={tab} onChange={(v) => setTab(v as PolicySlug)} className="mb-6 w-fit max-w-full" />
      <PolicyEditor key={tab} slug={tab} />
    </div>
  );
};

export default AdminPoliciesPage;
