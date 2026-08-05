import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Star, Inbox, CalendarDays, FileText, Images, HelpCircle, Trophy,
  LayoutGrid, ArrowRight, Activity, Loader2, ShieldAlert,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

interface Stats {
  pendingReviews: number;
  newEnquiries: number;
  featuredUpcomingEvents: number;
  draftBlogPosts: number;
  publishedBlogPosts: number;
  galleryItems: number;
  publishedFaqs: number;
  publishedAchievements: number;
  publishedCustomPages: number;
}

export const WebsiteOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [homepageMode, setHomepageMode] = useState('cms');
  const [maintenance, setMaintenance] = useState(false);
  const [sections, setSections] = useState<{ key: string; enabled: boolean }[]>([]);
  const [activity, setActivity] = useState<{ action: string; details: string | null; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.cmsStats()
      .then((res) => {
        if (res.success) {
          setStats(res.data.counts);
          setHomepageMode(res.data.homepageMode || 'cms');
          setMaintenance(res.data.maintenance);
          setSections(res.data.sections ?? []);
          setActivity(res.data.recentActivity ?? []);
        }
      })
      .catch((e: any) => toast.error(e?.message || 'Failed to load CMS overview'))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Reviews pending moderation', value: stats?.pendingReviews ?? 0, href: '/admin/website/reviews', icon: Star, cls: 'bg-amber-50 text-amber-600' },
    { label: 'New enquiries', value: stats?.newEnquiries ?? 0, href: '/admin/website/enquiries', icon: Inbox, cls: 'bg-blue-50 text-blue-600' },
    { label: 'Featured upcoming events', value: stats?.featuredUpcomingEvents ?? 0, href: '/admin/website/events', icon: CalendarDays, cls: 'bg-violet-50 text-violet-600' },
    { label: 'Draft blog posts', value: stats?.draftBlogPosts ?? 0, href: '/admin/website/blog', icon: FileText, cls: 'bg-gray-100 text-gray-600' },
    { label: 'Published blog posts', value: stats?.publishedBlogPosts ?? 0, href: '/admin/website/blog', icon: FileText, cls: 'bg-green-50 text-green-600' },
    { label: 'Gallery photos live', value: stats?.galleryItems ?? 0, href: '/admin/website/gallery', icon: Images, cls: 'bg-pink-50 text-pink-600' },
    { label: 'Published FAQs', value: stats?.publishedFaqs ?? 0, href: '/admin/website/faqs', icon: HelpCircle, cls: 'bg-teal-50 text-teal-600' },
    { label: 'Published achievements', value: stats?.publishedAchievements ?? 0, href: '/admin/website/achievements', icon: Trophy, cls: 'bg-orange-50 text-orange-600' },
    { label: 'Custom pages live', value: stats?.publishedCustomPages ?? 0, href: '/admin/website/custom-pages', icon: LayoutGrid, cls: 'bg-indigo-50 text-indigo-600' },
  ];

  const disabledSections = sections.filter((s) => !s.enabled);

  if (loading) {
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(9)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.href} className="group">
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${c.cls}`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold text-gray-900 leading-none">{c.value}</p>
                  <p className="text-xs text-gray-500 mt-1.5 truncate">{c.label}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-blue-600" /> Public site status
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Homepage mode</span>
                <Badge className={homepageMode === 'custom' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}>
                  {homepageMode === 'custom' ? 'Custom page' : 'CMS sections'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Maintenance mode</span>
                {maintenance ? (
                  <Badge className="bg-red-100 text-red-700"><ShieldAlert className="h-3 w-3 mr-1" /> Active</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-700">Off</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Homepage sections</span>
                <span className="text-gray-900 font-semibold">
                  {sections.length - disabledSections.length}/{sections.length} visible
                </span>
              </div>
              {disabledSections.length > 0 && (
                <p className="text-xs text-gray-400">Hidden sections: {disabledSections.map((s) => s.key).join(', ')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" /> Recent activity
              </h3>
            </div>
            {activity.length === 0 ? (
              <p className="text-sm text-gray-400">No CMS activity recorded yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <Badge className="bg-gray-100 text-gray-600 w-20 justify-center shrink-0">{a.action}</Badge>
                    <span className="text-gray-600 truncate flex-1">{a.details || '—'}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {a.createdAt ? new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    </div>
  );
};
