import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { AlertOctagon } from 'lucide-react';
import { LinkButton } from '@/components/ui';
import { NotFoundPage } from '@/pages/ErrorPages';

/** Route-level error boundary. Never renders stack traces or internal details. */
export const RootErrorBoundary = () => {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  if (import.meta.env.DEV) console.error(error);
  return (
    <div className="container-x flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600">
        <AlertOctagon className="h-8 w-8" />
      </div>
      <p className="eyebrow">Unexpected error</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-charcoal-900">Something went wrong</h1>
      <p className="mt-3 max-w-md text-charcoal-500">We could not load this page. Please refresh, or return to the homepage and try again.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <LinkButton to="/">Go to homepage</LinkButton>
        <Link to="/contact" className="text-sm font-semibold text-rose-700 hover:underline">
          Contact support
        </Link>
      </div>
    </div>
  );
};
