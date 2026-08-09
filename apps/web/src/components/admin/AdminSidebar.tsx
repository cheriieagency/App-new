'use client';

import Link from 'next/link';
import {
  BarChart3,
  CalendarDays,
  Image as ImageIcon,
  Inbox,
  Link2,
  Mail,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react';
import WorkspaceSelector from '@/components/planner/WorkspaceSelector';
import CreateWorkspaceModal from '@/components/planner/CreateWorkspaceModal';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAdminNav, type AdminSection } from '@/components/admin/AdminNavContext';
import { useState } from 'react';

type NavItem = {
  key: AdminSection;
  label: string;
  icon: React.ElementType;
  href?: string;
};

const NAV: NavItem[] = [
  { key: 'calendar', label: 'Calendar / Planner', icon: CalendarDays, href: '/planner' },
  { key: 'media', label: 'Media Library', icon: ImageIcon },
  { key: 'inbox', label: 'Social Inbox', icon: Inbox },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'biobuilder', label: 'Bio Builder', icon: Link2 },
  { key: 'community', label: 'Community', icon: Users },
  { key: 'email', label: 'Email CRM', icon: Mail },
  { key: 'settings', label: 'Settings', icon: Settings },
];

function channelLabel(channels: string[] | undefined) {
  if (!channels?.length) return 'Social Set';
  return channels
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join(' + ');
}

export default function AdminSidebar() {
  const { section, setSection } = useAdminNav();
  const {
    brandWorkspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    refreshWorkspaces,
  } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-64 flex-col border-r border-zinc-200/80 bg-[#f7f8fa] text-[#1f2430]">
        {/* Active Brand / Social Set */}
        <div className="px-3 pt-3 pb-2 border-b border-zinc-200/70 space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 px-1">
            Active Social Set
          </p>
          <WorkspaceSelector
            workspaces={brandWorkspaces}
            activeId={activeWorkspaceId}
            onSelect={(ws) => setActiveWorkspaceId(ws.id)}
            onCreateNew={() => setCreateOpen(true)}
          />
          <p className="px-1 text-[11px] font-semibold text-zinc-500 truncate">
            {activeWorkspace.handle} · {channelLabel(activeWorkspace.channels)}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1" aria-label="Admin categories">
          {NAV.map(({ key, label, icon: Icon, href }) => {
            const active = section === key;
            const className = `w-full flex items-center gap-3 h-11 min-h-[44px] rounded-xl px-3 transition-colors ${
              active
                ? 'bg-white text-[#1f2430] shadow-sm border border-zinc-200/80'
                : 'text-zinc-500 hover:bg-white/70 hover:text-[#1f2430]'
            }`;

            const inner = (
              <>
                <Icon size={18} className="flex-shrink-0" aria-hidden />
                <span className="text-xs font-extrabold truncate text-left">{label}</span>
              </>
            );

            if (href) {
              return (
                <Link
                  key={key}
                  href={href}
                  onClick={() => setSection(key)}
                  className={className}
                  aria-current={active ? 'page' : undefined}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={className}
                aria-current={active ? 'page' : undefined}
              >
                {inner}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-200/70">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 h-11 min-h-[44px] px-3 rounded-xl text-xs font-extrabold text-zinc-500 hover:bg-white hover:text-[#1f2430] transition-colors"
          >
            <MessageSquare size={15} /> Member view
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav — show short category names under icons */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-around h-16 px-1 overflow-x-auto">
          {NAV.filter((n) =>
            ['analytics', 'biobuilder', 'community', 'settings', 'email'].includes(n.key)
          ).map(({ key, label, icon: Icon, href }) => {
            const active = section === key;
            const short =
              key === 'biobuilder'
                ? 'Bio'
                : key === 'community'
                  ? 'Community'
                  : label.split(' ')[0];
            const cls = `flex flex-col items-center justify-center min-w-[64px] min-h-[44px] gap-0.5 px-1 ${
              active ? 'text-[#1f2430]' : 'text-zinc-400'
            }`;
            if (href) {
              return (
                <Link key={key} href={href} className={cls} aria-label={label}>
                  <Icon size={18} />
                  <span className="text-[10px] font-bold truncate max-w-[72px]">{short}</span>
                </Link>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={cls}
                aria-label={label}
              >
                <Icon size={18} />
                <span className="text-[10px] font-bold truncate max-w-[72px]">{short}</span>
              </button>
            );
          })}
        </div>
      </nav>

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
