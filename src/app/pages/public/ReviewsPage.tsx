import React, { useEffect, useState } from 'react';
import { Star, Send, ShieldCheck } from 'lucide-react';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { PageHero, LoadingCards, EmptyState } from './PageSections';
import { formatDate } from './publicData';

const STAR_MESSAGES = ['', 'Very poor', 'Poor', 'Average', 'Good', 'Excellent'];

export const ReviewsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('student');
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useSeo({ title: 'Reviews', description: 'What our students and parents say about us.' });

  const load = () => {
    publicSite.reviews()
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!comment.trim() || !consent) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await publicSite.submitReview({
        name: name.trim().slice(0, 120),
        relationship,
        rating,
        review: comment.trim(),
        consent: true,
      });
      setMessage({ type: 'success', text: 'Thank you! Your review is awaiting moderation and will appear here once approved.' });
      setName(''); setRelationship('student'); setRating(5); setComment(''); setConsent(false);
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong submitting your review. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHero title="Reviews" subtitle="Honest feedback from the students and parents who know us best." badge="Reviews" />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">What people say</h2>
            {loading ? (
              <LoadingCards count={3} />
            ) : items.length === 0 ? (
              <EmptyState title="No reviews yet" message="Be the first to share your experience." />
            ) : (
              <div className="space-y-4">
                {items.map((r) => (
                  <article key={r.id} className="rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-bold text-gray-900">{r.name || 'Anonymous'}</p>
                        {r.relationship && <p className="text-xs text-gray-500 capitalize">{r.relationship}</p>}
                      </div>
                      <span className="text-xs text-gray-400">{r.createdAt ? formatDate(r.createdAt) : ''}</span>
                    </div>
                    <div className="mt-2 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-4 w-4 ${n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{r.review}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 self-start">
            <form onSubmit={submit} className="rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 bg-white">
              <h2 className="text-lg font-bold text-gray-900">Share your experience</h2>
              <p className="mt-1 text-sm text-gray-500">Your feedback is moderated before publishing.</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5" htmlFor="rev-name">Name *</label>
                  <input id="rev-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5" htmlFor="rev-relationship">I am a…</label>
                  <select id="rev-relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['student', 'parent', 'teacher', 'alumni', 'other'].map((r) => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <span className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Your rating</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
                      <Star className={`h-7 w-7 transition-colors ${(hover || rating) >= n ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500 self-center">{STAR_MESSAGES[hover || rating]}</span>
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5" htmlFor="rev-comment">Your review</label>
                <textarea id="rev-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} required placeholder="Tell us about your experience…"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <label className="mt-4 flex items-start gap-2.5 cursor-pointer text-sm text-gray-600">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-blue-600" />
                <span>
                  I consent to this review being published publicly. <span className="inline-flex items-center gap-1 text-gray-400"><ShieldCheck className="h-3.5 w-3.5" /> no personal data beyond what I share</span>
                </span>
              </label>

              {message && (
                <p className={`mt-4 text-sm rounded-xl px-4 py-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {message.text}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !name.trim() || !comment.trim() || !consent}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit review'} <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};