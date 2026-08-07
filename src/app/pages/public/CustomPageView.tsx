import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { EmptyState } from './PageSections';

/**
 * Renders a PUBLISHED custom page (HTML/CSS/JS) inside a fully sandboxed
 * iframe. The uploaded code is UNTRUSTED ACTIVE CONTENT: it can only ever run
 * in this isolated frame (sandbox="allow-scripts", no same-origin, no parent
 * access) with no application session and no access to app data.
 */
export const CustomPageView: React.FC<{ slug: string }> = ({ slug }) => {
  const [meta, setMeta] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setMeta(null);
    publicSite.customPage(slug)
      .then((res) => { setMeta(res.data); })
      .catch(() => { setMeta(null); })
      .finally(() => setLoaded(true));
  }, [slug]);

  useSeo({
    title: meta?.seoTitle || meta?.name || slug,
    description: meta?.seoDescription || undefined,
    ogImage: meta?.ogImage || undefined,
    robots: meta?.robots || 'index,follow',
  });

  if (!loaded) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" /></div>;
  }

  if (!meta) {
    return <div className="max-w-7xl mx-auto px-4 py-16"><EmptyState title="Page not available" message="This page has not been published yet." /></div>;
  }

  const src = publicSite.customFileUrl(slug, meta.entryFile);
  return (
    <iframe
      key={src}
      src={src}
      title={meta.name}
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
      referrerPolicy="strict-origin-when-cross-origin"
      className="w-full h-[85vh] border-0 bg-background"
    />
  );
};

/**
 * Route wrapper that reads `:slug` from the URL. Used for the public custom
 * page catch-all (`/:slug`). Static reserved paths are declared as explicit
 * routes earlier in the router, which react-router matches with higher
 * priority, so this only ever renders genuine custom-page slugs.
 */
export const CustomSlugPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  return <CustomPageView slug={slug ?? ''} />;
};