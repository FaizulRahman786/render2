import React, { useEffect, useState } from 'react';
import { BookOpen, Clock, Award } from 'lucide-react';
import { fetchPublicFaculty } from './publicData';
import { useSeo } from '../../components/public/useSeo';

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

export const FacultyPage: React.FC = () => {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({ title: 'Faculty | Coaching Institute', description: 'Meet our experienced and dedicated faculty members.' });

  useEffect(() => {
    fetchPublicFaculty().then((f) => setFaculty(f)).catch(() => setFaculty([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Meet Our Faculty</h1>
        <p className="text-gray-500 mt-3 text-lg">Experienced educators committed to every student's growth.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : faculty.length === 0 ? (
        <p className="text-gray-500 mt-10">Faculty profiles coming soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {faculty.map((f) => (
            <div key={f._id || f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow p-6 text-center">
              {f.profileImage ? (
                <img src={f.profileImage} alt={f.name || 'Faculty'} className="w-20 h-20 rounded-full object-cover mx-auto mb-4" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {initials(f.name || f.fullName || 'F')}
                </div>
              )}
              <h2 className="text-lg font-bold text-gray-900">{f.name || f.fullName || 'Faculty Member'}</h2>
              <p className="text-sm font-medium text-blue-600 mt-0.5">{f.specialization || f.subject || f.department || ''}</p>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{f.bio || f.qualification || 'Passionate about teaching and mentoring.'}</p>
              <div className="flex items-center justify-center gap-5 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                {f.qualification && <span className="inline-flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-blue-500" />{f.qualification}</span>}
                {f.experience && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-blue-500" />{f.experience}</span>}
                {f.subjects && <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-blue-500" />{Array.isArray(f.subjects) ? f.subjects.join(', ') : f.subjects}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};