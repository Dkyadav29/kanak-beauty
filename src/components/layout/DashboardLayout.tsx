import { Suspense, useEffect, useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarClock,
  ChevronLeft,
  CreditCard,
  FileClock,
  Gift,
  GraduationCap,
  History,
  Home,
  Layers,
  LogOut,
  Menu,
  PlaySquare,
  Radio,
  ScrollText,
  Settings2,
  UserCircle2,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';
import type { Permission } from '@/types';
import { Avatar, Button, Logo, PageLoader } from '@/components/ui';
import { ScrollToTop } from './ScrollToTop';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  permission?: Permission;
  end?: boolean;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const STUDENT_NAV: NavGroup[] = [
  {
    items: [
      { to: '/student/dashboard', label: 'Dashboard', icon: Home, end: true },
      { to: '/student/courses', label: 'My Courses', icon: BookOpen, permission: 'courses:read:enrolled' },
      { to: '/student/live-classes', label: 'Live Classes', icon: Radio, permission: 'live:join' },
      { to: '/student/recordings', label: 'Recordings', icon: PlaySquare, permission: 'recordings:watch' },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/student/certificates', label: 'My Certificates', icon: Award, permission: 'certificates:read:self' },
      { to: '/student/refer', label: 'Refer & Earn', icon: Gift, permission: 'referrals:read:self' },
      { to: '/student/payments', label: 'Payment History', icon: CreditCard, permission: 'payments:read:self' },
      { to: '/student/profile', label: 'My Profile', icon: UserCircle2, permission: 'profile:read:self' },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    items: [{ to: '/admin/dashboard', label: 'Overview', icon: BarChart3, permission: 'analytics:read', end: true }],
  },
  {
    title: 'Academy',
    items: [
      { to: '/admin/students', label: 'Students', icon: Users, permission: 'students:read' },
      { to: '/admin/courses', label: 'Courses', icon: GraduationCap, permission: 'courses:manage' },
      { to: '/admin/batches', label: 'Batches', icon: Layers, permission: 'batches:manage' },
      { to: '/admin/live-sessions', label: 'Live Sessions', icon: Video, permission: 'batches:manage' },
      { to: '/admin/batch-history', label: 'Batch History', icon: History, permission: 'batches:manage' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { to: '/admin/enrollments', label: 'Enrollments', icon: CalendarClock, permission: 'enrollments:read' },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard, permission: 'payments:read' },
      { to: '/admin/certificates', label: 'Certificates', icon: ScrollText, permission: 'certificates:manage' },
      { to: '/admin/referrals', label: 'Refer & Earn', icon: Gift, permission: 'referrals:manage' },
    ],
  },
  {
    title: 'Governance',
    items: [{ to: '/admin/audit-logs', label: 'Audit Logs', icon: FileClock, permission: 'audit:read' }],
  },
];

const SidebarNav = ({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) => {
  const { can } = useAuth();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label="Dashboard">
      {groups.map((g, gi) => {
        const items = g.items.filter((i) => !i.permission || can(i.permission));
        if (items.length === 0) return null;
        return (
          <div key={gi}>
            {g.title ? <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal-500">{g.title}</p> : null}
            <ul className="space-y-0.5">
              {items.map((i) => (
                <li key={i.to}>
                  <NavLink
                    to={i.to}
                    end={i.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30' : 'text-charcoal-700 hover:bg-ivory-200 hover:text-charcoal-900')
                    }
                  >
                    <i.icon className="h-[18px] w-[18px] shrink-0" />
                    {i.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
};

const SidebarShell = ({ groups, title, onNavigate }: { groups: NavGroup[]; title: string; onNavigate?: () => void }) => {
  const { user, signOut } = useAuth();
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-[72px] items-center justify-between border-b border-ivory-200 px-5">
        <Logo />
        <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-800">{title}</span>
      </div>
      <SidebarNav groups={groups} onNavigate={onNavigate} />
      <div className="border-t border-ivory-200 p-4">
        {user ? (
          <div className="flex items-center gap-3">
            <Avatar name={user.name} src={user.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-charcoal-900">{user.name}</p>
              <p className="truncate text-xs text-charcoal-500">{user.email}</p>
            </div>
            <button type="button" onClick={() => void signOut()} className="rounded-full p-2 text-charcoal-500 hover:bg-ivory-200 hover:text-rose-700" aria-label="Logout" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const DashboardLayout = ({ variant }: { variant: 'student' | 'admin' }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const groups = variant === 'admin' ? ADMIN_NAV : STUDENT_NAV;
  const title = variant === 'admin' ? 'Admin' : 'Student';

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-ivory-100 lg:grid lg:grid-cols-[272px_1fr]">
      <ScrollToTop />
      <aside className="hidden border-r border-ivory-300 lg:sticky lg:top-0 lg:block lg:h-screen">
        <SidebarShell groups={groups} title={title} />
      </aside>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-charcoal-900/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} aria-hidden />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'tween', duration: 0.2 }} className="absolute inset-y-0 left-0 w-[280px] shadow-lift">
              <SidebarShell groups={groups} title={title} onNavigate={() => setOpen(false)} />
              <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-5 rounded-full bg-white p-2 text-charcoal-700 shadow lg:hidden" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between gap-3 border-b border-ivory-300 bg-ivory-100/90 px-4 backdrop-blur-md sm:px-6 lg:h-[72px] lg:px-8">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-full p-2 text-charcoal-800 hover:bg-ivory-200 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/" className="hidden items-center gap-1.5 text-sm font-medium text-charcoal-500 hover:text-rose-700 sm:flex">
              <ChevronLeft className="h-4 w-4" /> Back to website
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {variant === 'student' ? (
              <Link to="/student/profile" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-ivory-200 sm:flex">
                <Settings2 className="h-4 w-4" /> Settings
              </Link>
            ) : null}
            {user ? (
              <div className="flex items-center gap-2">
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                <span className="hidden text-sm font-medium text-charcoal-800 md:block">{user.name}</span>
              </div>
            ) : null}
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => void signOut()} aria-label="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
