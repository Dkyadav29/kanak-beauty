import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { homeRouteForRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Avatar, Button, LinkButton, Logo } from '@/components/ui';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/courses', label: 'Explore Courses' },
  { to: '/live-classes', label: 'Live Classes' },
  { to: '/about', label: 'About Academy' },
  { to: '/success-stories', label: 'Success Stories' },
  { to: '/contact', label: 'Contact Us' },
];

export const PublicNavbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn('rounded-full px-3.5 py-2 text-sm font-medium transition-colors', isActive ? 'bg-rose-50 text-rose-700' : 'text-charcoal-700 hover:bg-ivory-200 hover:text-charcoal-900');

  return (
    <header className={cn('sticky top-0 z-40 border-b transition-all', scrolled ? 'border-ivory-300 bg-ivory-100/90 backdrop-blur-md' : 'border-transparent bg-ivory-100')}>
      <div className="container-x flex h-[72px] items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {isAuthenticated && user ? (
            <>
              <LinkButton to={homeRouteForRole(user.role)} variant="secondary" size="sm" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                My Dashboard
              </LinkButton>
              <Button variant="ghost" size="sm" onClick={() => void signOut()} leftIcon={<LogOut className="h-4 w-4" />}>
                Logout
              </Button>
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            </>
          ) : (
            <>
              <LinkButton to="/login" variant="ghost" size="sm">
                Login
              </LinkButton>
              <LinkButton to="/register" variant="primary" size="sm">
                Join Academy
              </LinkButton>
            </>
          )}
        </div>
        <button type="button" className="rounded-full p-2 text-charcoal-800 hover:bg-ivory-200 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle navigation menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.nav id="mobile-nav" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-ivory-300 bg-ivory-100 lg:hidden" aria-label="Mobile">
            <div className="container-x flex flex-col gap-1 py-4">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn('rounded-xl px-4 py-3 text-base font-medium', isActive ? 'bg-rose-50 text-rose-700' : 'text-charcoal-800 hover:bg-ivory-200')}>
                  {l.label}
                </NavLink>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-ivory-300 pt-4">
                {isAuthenticated && user ? (
                  <>
                    <LinkButton to={homeRouteForRole(user.role)} variant="secondary">
                      My Dashboard
                    </LinkButton>
                    <Button variant="outline" onClick={() => void signOut()}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="rounded-xl px-4 py-3 text-center text-base font-semibold text-charcoal-800 hover:bg-ivory-200">
                      Login
                    </Link>
                    <LinkButton to="/register">Join Academy</LinkButton>
                  </>
                )}
              </div>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
};
