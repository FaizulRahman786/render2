import React from 'react';
import { Link } from 'react-router';
import { isPreviewMode } from './publicData';

// ── Shared public-site building blocks ──────────────────────────────────────
// Keeps every public page consistent: hero header, section headings, loading
// skeletons, empty states and the block renderer for long-form pages.

export const PageHero: React.FC<{ title: string; subtitle?: string; badge?: string }> = ({ title, subtitle, badge }) => (
  <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 text-primary-foreground">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      {badge && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-4">
          {badge}
        </span>
      )}
      <h1 className="text-3xl sm:text-4xl font-bold max-w-3xl">{title}</h1>
      {subtitle && <p className="mt-3 text-primary-foreground/80 max-w-2xl text-sm sm:text-base">{subtitle}</p>}
    </div>
  </section>
);

export const SectionHeading: React.FC<{ title: string; subtitle?: string; center?: boolean }> = ({ title, subtitle, center }) => (
  <div className={center ? 'text-center' : ''}>
    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
    {subtitle && <p className="mt-2 text-muted-foreground max-w-2xl text-sm sm:text-base">{subtitle}</p>}
  </div>
);

export const LoadingCards: React.FC<{ count?: number; className?: string }> = ({ count = 6, className }) => (
  <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className || ''}`}>
    {[...Array(count)].map((_, i) => (
      <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse" />
    ))}
  </div>
);

export const EmptyState: React.FC<{ title?: string; message?: string }> = ({ title = 'Nothing here yet', message = 'Content is being prepared. Please check back soon.' }) => (
  <div className="rounded-2xl border border-dashed border-border p-12 text-center">
    <h3 className="font-semibold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">{message}</p>
  </div>
);

export const PageNotFound: React.FC<{ title?: string }> = ({ title = 'Page not found' }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
    <p className="text-6xl font-extrabold text-primary/20">404</p>
    <h1 className="mt-2 text-2xl font-bold text-foreground">{title}</h1>
    <p className="mt-2 text-muted-foreground text-sm">The page you're looking for doesn't exist or has been removed.</p>
    <Link to={isPreviewMode() ? '/preview?page=home' : '/'} className="mt-6 inline-flex items-center px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
      Back to home
    </Link>
  </div>
);

// ── Long-form page block renderer (site_pages content) ──────────────────────
// Renders the JSON block content saved by the admin Story editor. Plain HTML
// is never injected — blocks map to explicit components.
export const RenderBlocks: React.FC<{ blocks: any }> = ({ blocks }) => {
  const list = Array.isArray(blocks) ? blocks : [];
  return (
    <div className="space-y-6">
      {list.map((block, i) => {
        if (!block || typeof block !== 'object') return null;
        switch (block.type) {
          case 'heading':
            return <h2 key={i} className="text-2xl font-bold text-foreground mt-2">{block.text}</h2>;
          case 'subheading':
            return <h3 key={i} className="text-lg font-semibold text-foreground">{block.text}</h3>;
          case 'paragraph':
            return <p key={i} className="text-muted-foreground leading-relaxed">{block.text}</p>;
          case 'list':
            return (
              <ul key={i} className="space-y-2">
                {(Array.isArray(block.items) ? block.items : []).map((item: string, j: number) => (
                  <li key={j} className="flex items-start gap-2.5 text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          case 'image':
            return block.src ? (
              <figure key={i}>
                <img src={block.src} alt={block.alt || ''} className="rounded-2xl w-full object-cover max-h-96" loading="lazy" />
                {block.alt && <figcaption className="text-xs text-muted-foreground mt-2">{block.alt}</figcaption>}
              </figure>
            ) : null;
          case 'quote':
            return (
              <blockquote key={i} className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                {block.text}
              </blockquote>
            );
          default:
            return null;
        }
      })}
    </div>
  );
};