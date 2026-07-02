import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PostBody } from "@/components/marketing/post-body";
import {
  formatPostDate,
  getAllPosts,
  getPost,
} from "@/components/marketing/blog-posts";

/**
 * Article — port de legacy/(marketing)/blog/[slug]. Contenu statique,
 * rendu markdown-lite XSS-safe (PostBody).
 */

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article introuvable" };
  return { title: post.title, description: post.excerpt };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <>
      <article className="bg-bone">
        <div className="mx-auto max-w-3xl px-gutter py-14 sm:py-20">
          <Link
            href="/blog"
            className="eyebrow inline-flex items-center gap-2 text-smoke transition-colors hover:text-coral"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Toutes les notes
          </Link>

          <p className="eyebrow mt-8 text-smoke-2">
            <span className="text-coral">{post.category}</span>
            <span className="mx-2">·</span>
            {formatPostDate(post.date)}
            <span className="mx-2">·</span>
            {post.readingMinutes} min de lecture
          </p>
          <h1 className="font-display mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-graphite">{post.excerpt}</p>
          <p className="eyebrow mt-6 border-t border-ink/10 pt-5 text-smoke-2">
            Par {post.author}
          </p>

          <div className="mt-10">
            <PostBody markdown={post.body} />
          </div>

          {post.tags.length > 0 ? (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-ink/10 pt-6">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-xs border border-ink/15 px-3 py-1.5 font-mono text-xs text-smoke"
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </article>

      <section className="texture-geo bg-ink text-bone">
        <div className="mx-auto flex max-w-page flex-col items-start gap-6 px-gutter py-16 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              Un sujet qui résonne avec votre marque ?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-sand">
              On transforme ces principes en trajectoire concrète. Le diagnostic est gratuit, la
              première conversation aussi.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/intake" className={buttonVariants({ size: "md" })}>
              Diagnostic gratuit <ArrowRight />
            </Link>
            <Link href="/contact" className={buttonVariants({ variant: "outline", size: "md" })}>
              Démarrer un projet
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
