import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CalendarDays, MapPin, Clock, Phone, ChevronLeft, ExternalLink } from 'lucide-react';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { LoadingCards } from './PageSections';
import { formatDate } from './publicData';

export const EventDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useSeo({ title: event?.name ?? 'Event', description: event?.shortDescription ?? event?.description ?? undefined });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    publicSite.eventBySlug(slug)
      .then((res) => setEvent(res.data ?? null))
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16"><LoadingCards count={2} /></div>;
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Event not found</h1>
        <p className="mt-2 text-gray-500 text-sm">This event may have been unpublished or removed.</p>
        <Link to="/events" className="mt-6 inline-flex items-center gap-2 text-blue-600 font-semibold text-sm"><ChevronLeft className="h-4 w-4" /> Back to events</Link>
      </div>
    );
  }

  const hasDateRange = event.endDate && event.endDate !== event.eventDate;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-blue-600 text-sm font-semibold hover:gap-3 transition-all">
        <ChevronLeft className="h-4 w-4" /> Back to events
      </Link>

      <article className="mt-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">{event.name}</h1>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm">
          {event.eventDate && (
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <CalendarDays className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">
                  {formatDate(event.eventDate)}{hasDateRange && ` – ${formatDate(event.endDate)}`}
                </p>
                <p className="text-xs text-gray-500">Date</p>
              </div>
            </div>
          )}
          {event.startTime && (
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <Clock className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">{event.startTime}{event.endTime ? ` – ${event.endTime}` : ''}</p>
                <p className="text-xs text-gray-500">Time</p>
              </div>
            </div>
          )}
          {(event.venue || event.location) && (
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <MapPin className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">{event.venue || event.location}</p>
                <p className="text-xs text-gray-500">Venue</p>
              </div>
            </div>
          )}
          {event.organizer && (
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <Phone className="h-5 w-5 text-violet-600 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">{event.organizer}</p>
                <p className="text-xs text-gray-500">Organizer</p>
              </div>
            </div>
          )}
        </div>

        {event.contactPhone && (
          <a href={`tel:${event.contactPhone}`} className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-700">
            <Phone className="h-4 w-4" /> {event.contactPhone}
          </a>
        )}

        {event.bannerUrl && <img src={event.bannerUrl} alt={event.name} className="mt-6 w-full h-72 sm:h-96 object-cover rounded-3xl" />}
        {event.description && <p className="mt-6 text-gray-600 leading-relaxed">{event.description}</p>}

        {event.registrationUrl && (
          <a
            href={event.registrationUrl}
            target={event.registrationUrl.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Register now <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </article>
    </div>
  );
};