'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ElementType } from 'react';
import {
  BarChart3,
  CalendarDays,
  Image as ImageIcon,
  Inbox,
  Link2,
  Mail,
  Settings,
  Users,
} from 'lucide-react';
import WorkspaceSelector from '@/components/planner/WorkspaceSelector';
import CreateWorkspaceModal from '@/components/planner/CreateWorkspaceModal';
import AdminPlanModal, { useAdminPlan } from '@/components/admin/AdminPlanModal';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAdminNav, type AdminSection } from '@/components/admin/AdminNavContext';
import { ClikdMark } from '@/components/brand/ClikdLogo';

type NavItem = {
  key: AdminSection;
  label: string;
  icon: ElementType;
  href: string;
  badge?: string;
};

/** Clean labels matching the Clikd admin shell reference. */
const NAV: NavItem[] = [
  { key: 'calendar', label: 'Planner', icon: CalendarDays, href: '/planner' },
  { key: 'media', label: 'Media Library', icon: ImageIcon, href: '/admin?tab=media' },
  { key: 'inbox', label: 'Inbox', icon: Inbox, href: '/admin?tab=inbox', badge: '3' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, href: '/admin?tab=analytics' },
  { key: 'biobuilder', label: 'Bio Store', icon: Link2, href: '/admin?tab=biobuilder' },
  { key: 'community', label: 'Community', icon: Users, href: '/admin?tab=community' },
  { key: 'email', label: 'Email CRM', icon: Mail, href: '/admin?tab=email' },
  { key: 'settings', label: 'Settings', icon: Settings, href: '/admin?tab=settings' },
];

function planName(plan: string) {
  if (plan === 'starter') return 'Starter';
  if (plan === 'pro') return 'Pro Plan';
  return 'Pro Plan';
}

function planPrice(plan: string) {
  if (plan === 'starter') return 'Free';
  if (plan === 'pro') return '499 kr/mån';
  return '199 kr/mån';
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const onPlanner = pathname.startsWith('/planner');
  const { section, setSection } = useAdminNav();
  const {
    brandWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    refreshWorkspaces,
  } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const { data: planData } = useAdminPlan();
  const plan = planData?.plan ?? 'creator';

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-64 flex-col justify-between bg-white border-r border-slate-200/80 text-slate-900 h-screen rounded-bl-[28px]">
        <div className="flex flex-col min-h-0 flex-1">
          <div className="px-4 pt-5 pb-4 space-y-4">
            <div className="flex items-center gap-2.5 px-0.5">
              <ClikdMark size={34} className="rounded-[11px] shadow-sm" />
              <p className="font-clikd-wordmark font-extrabold text-[17px] text-slate-900 tracking-tight leading-none">
                clikd<span className="text-[#F472B6]">:</span>
              </p>
            </div>

            <WorkspaceSelector
              compact
              workspaces={brandWorkspaces}
              activeId={activeWorkspaceId}
              onSelect={(ws) => setActiveWorkspaceId(ws.id)}
              onCreateNew={() => setCreateOpen(true)}
            />
          </div>

          <nav
            className="flex-1 overflow-y-auto px-3 pt-2 pb-4 space-y-0.5"
            aria-label="Admin categories"
          >
            {NAV.map(({ key, label, icon: Icon, href, badge }) => {
              const active = key === 'calendar' ? onPlanner || section === 'calendar' : !onPlanner && section === key;
              const className = [
                'w-full flex items-center gap-3 h-11 min-h-[44px] px-3.5 transition-all duration-200',
                active
                  ? 'rounded-2xl bg-[#1a1848] text-white font-semibold shadow-sm'
                  : 'rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium',
              ].join(' ');

              return (
                <Link
                  key={key}
                  href={href}
                  onClick={() => setSection(key)}
                  className={className}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    className="flex-shrink-0 opacity-90"
                    aria-hidden
                  />
                  <span className="text-[13px] truncate text-left flex-1 tracking-tight">
                    {label}
                  </span>
                  {badge && (
                    <span
                      className={`text-[11px] font-semibold min-w-[22px] h-[22px] px-1.5 rounded-full inline-flex items-center justify-center tabular-nums ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-5 pb-5 pt-2">
          <button
            type="button"
            onClick={() => setPlanOpen(true)}
            className="w-full flex items-center justify-between gap-3 min-h-[44px] group"
          >
            <span className="font-mono text-[11px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
              {planName(plan)}
            </span>
            <span className="font-mono text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors tabular-nums">
              {planPrice(plan)}
            </span>
          </button>
        </div>
      </aside>

      <AdminPlanModal open={planOpen} onOpenChange={setPlanOpen} />

      <CreateWorkspaceModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        createUrl="/api/admin/workspaces"
        onCreated={(ws) => {
          refreshWorkspaces();
          setActiveWorkspaceId(ws.id);
        }}
      />
    </>
  );
}
