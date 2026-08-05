import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { GraduationCap, Clock, BookOpen, Users } from 'lucide-react';
import { fetchPublicCourses, isPreviewMode, formatMoney } from './publicData';
import { useSeo } from '../../components/public/useSeo';

export const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({ title: 'Courses | Coaching Institute', description: 'Browse our coaching programs across streams and subjects.' });

  useEffect(() => {
    fetchPublicCourses().then((c) => setCourses(c)).catch(() => setCourses([])).finally(() => setLoading(false));
  }, []);

  const contactHref = isPreviewMode() ? '/preview?page=contact' : '/contact';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Our Courses</h1>
        <p className="text-gray-500 mt-3 text-lg">Structured programs with expert faculty, regular tests and personalised mentoring.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {[...Array(6)].map((_, i) => <div key={i} className="h-56 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : courses.length === 0 ? (
        <p className="text-gray-500 mt-10">No courses available right now. Please check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {courses.map((c) => (
            <div key={c._id || c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center">
                <GraduationCap className="h-12 w-12 text-white/70" />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">{c.name || 'Course'}</h2>
                  <span className="text-lg font-extrabold text-blue-700">{formatMoney(c.fee ?? c.price)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-3">{c.description || 'Comprehensive coaching program.'}</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-xs text-gray-500">
                  {c.duration && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-blue-500" />{c.duration}</span>}
                  {typeof c.subjectCount === 'number' && <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-blue-500" />{c.subjectCount} {c.subjectCount === 1 ? 'subject' : 'subjects'}</span>}
                  {c.subjects && <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-blue-500" />{Array.isArray(c.subjects) ? c.subjects.join(', ') : c.subjects}</span>}
                </div>
                <Link to={contactHref} className="mt-5 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Enquire Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};