import React from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import {
  Globe, LayoutDashboard, FileJson, LayoutGrid, GraduationCap, Wallet, Trophy, Award,
  Images, Star, FileText, HelpCircle, List, PenLine, Megaphone, CalendarDays, Inbox,
  Settings2, Eye,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useSeo } from '../../../components/public/useSeo';

interface Tab {
  label: string;
  href: string;
  icon: React.ElementType;
  end?: boolean;
}

const PUBLIC_TABS: Tab[] = [
  { label: 'Overview', href: '/admin/website', icon: LayoutDashboard, end: true },
  { label: 'CMS Editor', href: '/admin/website/content', icon: FileJson },
  { label: 'Homepage sections', href: '/admin/website/homepage', icon: LayoutGrid },
  { label: 'Admissions', href: '/admin/website/admissions', icon: GraduationCap },
  { label: 'Fees', href: '/admin/website/fees', icon: Wallet },
  { label: 'Achievements', href: '/admin/website/achievements', icon: Trophy },
  { label: 'Results', href: '/admin/website/results', icon: Award },
  { label: 'Gallery', href: '/admin/website/gallery', icon: Images },
  { label: 'Reviews', href: '/admin/website/reviews', icon: Star },
  { label: 'Blog', href: '/admin/website/blog', icon: FileText },
  { label: 'FAQs', href: '/admin/website/faqs', icon: HelpCircle },
  { label: 'Story pages', href: '/admin/website/pages', icon: PenLine },
  { label: 'Navigation', href: '/admin/website/navigation', icon: List },
  { label: 'Custom pages', href: '/admin/website/custom-pages', icon: Globe },
];

const ADMIN_TABS: Tab[] = [
  { label: 'Events', href: '/admin/website/events', icon: CalendarDays },
  { label: 'Notices', href: '/admin/website/notices', icon: Megaphone },
  { label: 'Enquiries', href: '/admin/website/enquiries', icon: Inbox },
  { label: 'Site settings', href: '/admin/website/site-settings', icon: Settings2 },
  { label: 'Preview center', href: '/admin/website/preview', icon: Eye },
  { label: 'Media library', href: '/admin/website/media', icon: Images },
];

const TabBar: React.FC<{ tabs: Tab[]; group: string }> = ({ tabs, group }) => {
  const location = useLocation();
  return (
    <div className="border-b border-gray-200">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 pt-3 px-1">{group}</p>
      <nav className="flex gap-1 overflow-x-auto pb-0">
        {tabs.map((tab) => {
          const active = tab.end ? location.pathname === tab.href : location.pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
              )}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export const WebsiteLayout: React.FC = () => {
  useSeo({ title: 'Website Management', robots: 'noindex,nofollow' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-7 w-7 text-blue-600" /> Website Management
          </h1>
          <p className="text-muted-foreground mt-2">Manage the full public website: content, pages, navigation, custom pages and site previews.</p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors shrink-0"
        >
          <Eye className="h-4 w-4" /> View live site
        </a>
      </div>

      <TabBar tabs={PUBLIC_TABS} group="Public site" />
      <TabBar tabs={ADMIN_TABS} group="Website administration" />

      <Outlet />
    </div>
  );
};
