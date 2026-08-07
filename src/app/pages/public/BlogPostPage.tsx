import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CalendarDays, ChevronLeft } from 'lucide-react';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { LoadingCards } from './PageSections';
import { formatDate } from './publicData';

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useSeo({ title: post?.title ?? 'Blog', description: post?.excerpt ?? undefined });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    publicSite.blogBySlug(slug)
      .then((res) => setPost(res.data ?? null))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-16"><LoadingCards count={2} /></div>;
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground">Post not found</h1>
        <p className="mt-2 text-muted-foreground text-sm">This post may have been unpublished or removed.</p>
        <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-primary font-semibold text-sm"><ChevronLeft className="h-4 w-4" /> Back to blog</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold hover:gap-3 transition-all">
        <ChevronLeft className="h-4 w-4" /> Back to blog
      </Link>
      <article className="mt-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {post.author && <span className="font-medium">By {post.author}</span>}
          {post.publishedAt && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {formatDate(post.publishedAt)}</span>}
        </div>
        {post.coverImage && (
          <img src={post.coverImage} alt={post.title} className="mt-6 w-full h-72 sm:h-96 object-cover rounded-3xl" />
        )}
        {post.excerpt && <p className="mt-6 text-lg text-muted-foreground leading-relaxed font-medium">{post.excerpt}</p>}
        <div
          className="mt-6 prose prose-muted max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  );
};