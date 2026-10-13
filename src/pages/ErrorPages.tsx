import { Link } from 'react-router-dom';
import { ShieldAlert, Compass, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { homeRouteForRole } from '@/lib/permissions';
import { LinkButton } from '@/components/ui';

const Shell = ({ icon, code, title, description, children }: { icon: React.ReactNode; code: string; title: string; description: string; children: React.ReactNode }) => (
  <div className="container-x flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600">{icon}</div>
    <p className="eyebrow">{code}</p>
    <h1 className="mt-2 font-display text-4xl font-semibold text-charcoal-900 sm:text-5xl">{title}</h1>
    <p className="mt-3 max-w-md text-charcoal-500">{description}</p>
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>
  </div>
);

export const ForbiddenPage = () => {
  const { user } = useAuth();
  return (
    <Shell icon={<ShieldAlert className="h-8 w-8" />} code="Error 403" title="Access restricted" description="You do not have permission to view this page. If you believe this is a mistake, please contact the academy team.">
      <LinkButton to={user ? homeRouteForRole(user.role) : '/'} leftIcon={<ArrowLeft className="h-4 w-4" />}>
        {user ? 'Back to my dashboard' : 'Back to home'}
      </LinkButton>
    </Shell>
  );
};

export const NotFoundPage = () => (
  <Shell icon={<Compass className="h-8 w-8" />} code="Error 404" title="Page not found" description="The page you are looking for does not exist or has been moved.">
    <LinkButton to="/">Go to homepage</LinkButton>
    <Link to="/courses" className="text-sm font-semibold text-rose-700 hover:underline">
      Explore courses
    </Link>
  </Shell>
);
