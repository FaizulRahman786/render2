import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CheckCircle2, Megaphone, Users, UsersRound, GraduationCap, Clock } from 'lucide-react';
import { fetchPublicHome, fetchPublicCourses, fetchPublicEvents, fetchPublicNotices, isPreviewMode, formatDate, formatMoney } from './publicData';
import { useSeo } from '../../components/public/useSeo';
import { CustomPageView } from './CustomPageView';

function pageHref(page: string, path: string): string {
  return isPreviewMode() ? `/preview?page=${page}` : path;
}

export const HomePage: React.FC = () => {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchPublicHome>> | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({
    title: data?.seo?.title || (data?.institute ? `${data.institute.name}` : 'Coaching Institute'),
    description: data?.seo?.description,
    keywords: data?.seo?.keywords,
    ogImage: data?.seo?.ogImage,
    canonical: data?.seo?.canonical,
    siteName: data?.institute?.name,
  });

  useEffect(() => {
    Promise.all([
      fetchPublicHome().catch(() => null),
      fetchPublicCourses().catch(() => []).then((c) => c.slice(0, 3)),
      fetchPublicEvents().catch(() => []).then((e) => e.slice(0, 2)),
      fetchPublicNotices().catch(() => []).then((n) => n.slice(0, 3)),
    ]).then(([home, cs, ev, nts]) => {
      setData(home);
      setCourses(cs);
      setEvents(ev);
      setNotices(nts);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 space-y-6">
        <div className="h-64 bg-gray-100 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-3 gap-6"><div className="h-20 bg-gray-100 rounded-xl animate-pulse" /><div className="h-20 bg-gray-100 rounded-xl animate-pulse" /><div className="h-20 bg-gray-100 rounded-xl animate-pulse" /></div>
      </div>
    );
  }

  // Custom homepage mode: the admin picked a published custom page to replace
  // the CMS homepage entirely. Rendered in the same sandbox as other custom pages.
  if (data.homepageMode === 'custom' && data.customHomepageSlug) {
    return <CustomPageView slug={data.customHomepageSlug} />;
  }

  const home = data.home || {};
  const headline = home.headline || home.live?.headline || 'Learn. Excel. Achieve.';
  const subheadline = home.subheadline || home.live?.subheadline || 'Structured coaching programs designed for academic success.';
  const tagline = home.tagline || home.live?.tagline || '';
  const ctaLabel = home.heroCtaLabel || 'Browse Courses';
  const ctaHref = home.heroCtaLink || pageHref('courses', '/courses');
  const whyUsTitle = home.whyChooseUsTitle || 'Why choose us';
  const whyUs = Array.isArray(home.whyChooseUs) ? home.whyChooseUs : [];
  const announcement = home.announcementEnabled && home.announcement ? home.announcement : '';
  const cover = home.coverImage || home.live?.coverImage;

  return (
    <div>
      {/* Announcement bar */}
      {announcement && (
        <div className="bg-blue-600 text-white text-sm py-2.5 px-4 text-center font-medium">
          <span className="inline-flex items-center gap-2"><Megaphone className="h-4 w-4" />{announcement}</span>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        {cover && <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          {tagline && <p className="text-sm font-semibold uppercase tracking-widest text-blue-100 mb-4">{tagline}</p>}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight max-w-3xl">{headline}</h1>
          <p className="mt-5 text-lg md:text-xl text-blue-100 max-w-2xl leading-relaxed">{subheadline}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to={ctaHref} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 font-semibold hover:bg-blue-50 transition-colors shadow-lg">
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={pageHref('contact', '/contact')} className="inline-flex items-center px-6 py-3 rounded-xl border-2 border-white/40 text-white font-semibold hover:bg-white/10 transition-colors">
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          {[
            { label: 'Students Enrolled', value: data.stats?.students ?? 0, icon: Users },
            { label: 'Expert Faculty', value: data.stats?.teachers ?? 0, icon: UsersRound },
            { label: 'Programs Offered', value: data.stats?.courses ?? 0, icon: GraduationCap },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-4 justify-center py-3 sm:py-0">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-700"><s.icon className="h-6 w-6" /></div>
              <div>
                <div className="text-2xl font-extrabold text-gray-900">{Number(s.value).toLocaleString('en-IN')}+</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured courses */}
      {courses.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Popular Courses</h2>
              <p className="text-gray-500 mt-1">Programs our students love the most</p>
            </div>
            <Link to={pageHref('courses', '/courses')} className="text-sm font-semibold text-blue-600 inline-flex items-center gap-1 hover:gap-2 transition-all">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courses.map((c) => (
              <Link key={c._id || c.id} to={pageHref('courses', '/courses')} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden">
                <div className="h-36 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <GraduationCap className="h-10 w-10 text-white/80 group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{c.name || 'Course'}</h3>
                  <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{c.description || 'Comprehensive classroom + test series program.'}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm font-bold text-blue-700">{formatMoney(c.fee ?? c.price)}</span>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{c.classLevel || 'All levels'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Why choose us */}
      {whyUs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">{whyUsTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {whyUs.map((w: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{w?.title || (Array.isArray(w) ? w[0] : '') || `Feature ${i + 1}`}</h3>
                <p className="text-sm text-gray-500 mt-1.5">{w?.description || (Array.isArray(w) ? w[1] : '') || ''}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Events + Notices */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {(events.length > 0) && (
            <div>
              <div className="flex items-end justify-between mb-5">
                <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
                <Link to={pageHref('events', '/events')} className="text-sm font-semibold text-blue-600 hover:underline">View all</Link>
              </div>
              <div className="space-y-4">
                {events.map((e) => (
                  <div key={e._id || e.id} className="flex items-center gap-4 bg-gray-50 hover:bg-blue-50 rounded-xl p-4 transition-colors">
                    <div className="shrink-0 w-14 h-14 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center">
                      <span className="text-lg font-extrabold leading-none">{new Date(e.eventDate).getDate()}</span>
                      <span className="text-[10px] uppercase tracking-wide">{new Date(e.eventDate).toLocaleString('en-IN', { month: 'short' })}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{e.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><Clock className="h-3.5 w-3.5" />{e.startTime ? `${e.startTime}` : formatDate(e.eventDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {notices.length > 0 && (
            <div>
              <div className="flex items-end justify-between mb-5">
                <h2 className="text-2xl font-bold text-gray-900">Latest Notices</h2>
                <Link to={pageHref('notices', '/notices')} className="text-sm font-semibold text-blue-600 hover:underline">View all</Link>
              </div>
              <div className="space-y-3">
                {notices.map((n) => (
                  <Link key={n._id || n.id} to={pageHref('notices', '/notices')} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                    <Megaphone className="h-5 w-5 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{n.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(n.createdAt || n.date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Ready to start your journey?</h2>
            <p className="text-blue-100 mt-2">Talk to our counsellors today and find the right program for you.</p>
          </div>
          <Link to={pageHref('contact', '/contact')} className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 font-semibold hover:bg-blue-50 transition-colors shadow-lg">
            Contact Us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};