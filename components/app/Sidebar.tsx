'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Briefcase, FileText, Shield, FilePlus2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/profiles', label: 'Profiles', icon: Users },
  { href: '/opportunities', label: 'Opportunities', icon: Briefcase },
  { href: '/templates', label: 'Templates', icon: FilePlus2 },
  { href: '/rulesets', label: 'Rulesets', icon: Shield },
  { href: '/cv', label: 'CVs', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 border-r border-border bg-sidebar flex flex-col z-40">
      <div className="px-4 py-5 border-b border-border">
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">CVCraft</span>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {/* Primary action */}
        <Link
          href="/generate"
          prefetch={false}
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors mb-2',
            pathname === '/generate' || pathname.startsWith('/generate/')
              ? 'bg-primary/15 text-primary'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          )}
        >
          <Sparkles size={16} className="shrink-0" />
          Generate CV
        </Link>

        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground">Prototype</p>
      </div>
    </aside>
  );
}
