import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { PageLoader } from '@/components/ui';
import { ScrollToTop } from './ScrollToTop';

export const PublicLayout = () => (
  <div className="flex min-h-screen flex-col">
    <ScrollToTop />
    <PublicNavbar />
    <main className="flex-1">
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </main>
    <PublicFooter />
  </div>
);
