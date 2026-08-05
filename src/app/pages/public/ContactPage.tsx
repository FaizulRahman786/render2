import React, { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import { fetchPublicStatus, Institute } from './publicData';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';

interface FormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const EMPTY: FormState = { name: '', email: '', phone: '', subject: 'Course enquiry', message: '' };

export const ContactPage: React.FC = () => {
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useSeo({ title: 'Contact Us | Coaching Institute', description: 'Reach out for admissions, courses and any queries.' });

  useEffect(() => {
    fetchPublicStatus()
      .then((s) => setInstitute(s.institute))
      .catch(() => setInstitute(null));
  }, []);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email and message.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await publicSite.submitEnquiry(form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Contact Us</h1>
        <p className="text-gray-500 mt-3 text-lg">Have a question? Fill in the form and our team will get back to you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 mt-10">
        {/* Info panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-blue-700 to-indigo-700 text-white rounded-2xl p-7">
            <h2 className="text-lg font-bold mb-5">Get in touch</h2>
            <ul className="space-y-4 text-sm">
              {institute?.address && (
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-200 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{institute.address}</span>
                </li>
              )}
              {institute?.phone && (
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-blue-200 shrink-0" />
                  <a href={`tel:${institute.phone}`} className="hover:underline">{institute.phone}</a>
                </li>
              )}
              {institute?.email && (
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-200 shrink-0" />
                  <a href={`mailto:${institute.email}`} className="hover:underline break-all">{institute.email}</a>
                </li>
              )}
              <li className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-200 shrink-0" />
                <span>Mon – Sat, 8:00 AM – 8:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          {submitted ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Enquiry sent!</h2>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">Thank you for reaching out. Our team will get back to you within one working day.</p>
              <button type="button" onClick={() => { setForm(EMPTY); setSubmitted(false); }} className="mt-6 text-sm font-semibold text-blue-600 hover:underline">
                Send another enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3">{error}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set('name')}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
                  <select
                    value={form.subject}
                    onChange={set('subject')}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option>Course enquiry</option>
                    <option>Admission related</option>
                    <option>Fee related</option>
                    <option>General query</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your message *</label>
                <textarea
                  value={form.message}
                  onChange={set('message')}
                  rows={5}
                  placeholder="Tell us what you'd like to know..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : (<><Send className="h-4 w-4" /> Send enquiry</>)}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};