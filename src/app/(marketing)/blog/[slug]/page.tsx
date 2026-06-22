import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/upgraders/site-nav";
import { SiteFooter } from "@/components/upgraders/site-footer";
import { Shell, PrimaryCta, GhostCta } from "@/components/upgraders/ui";
import { getAllPosts, getPost, formatPostDate } from "@/components/upgraders/posts";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article introuvable — UPgraders" };
  return {
    title: `${post.title} — UPgraders`,
    description: post.excerpt,
    openGraph: post.cover ? { images: [{ url: post.cover.src }] } : undefined,
  };
}

const PROSE =
  "max-w-[72ch] " +
  "[&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-3 " +
  "[&_p]:mb-5 [&_p]:leading-relaxed [&_p]:text-foreground-secondary " +
  "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 " +
  "[&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_li]:marker:text-accent " +
  "[&_strong]:text-foreground [&_strong]:font-semibold [&_em]:text-foreground [&_em]:italic";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <main>
      <SiteNav />

      <article className="pt-28 md:pt-32">
        <Shell className="max-w-[var(--maxw-prose,860px)]">
          <Link href="/blog" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-foreground-muted transition-colors hover:text-accent">
            ← Toutes les notes
          </Link>

          <div className="mt-8 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
            {post.categories[0] ? <span className="text-accent">{post.categories[0].name}</span> : null}
            <span>·</span>
            <span>{formatPostDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readingMinutes} min de lecture</span>
          </div>

          <h1 className="mt-4 font-display font-semibold tracking-tight text-balance" style={{ fontSize: "var(--text-4xl)", lineHeight: 1.05 }}>
            {post.title}
          </h1>
          <p className="mt-5 text-pretty text-foreground-secondary" style={{ fontSize: "var(--text-lg)", lineHeight: 1.5 }}>
            {post.excerpt}
          </p>
          {post.author ? (
            <div className="mt-6 border-t border-border-subtle pt-5 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
              Par {post.author.name}
            </div>
          ) : null}
        </Shell>

        {post.cover ? (
          <div className="mx-auto mt-10 max-w-[var(--maxw-content)] px-[var(--pad-page)]">
            <div className="aspect-[16/8] overflow-hidden border border-border bg-surface-raised">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover.src} alt={post.cover.alt} className="h-full w-full object-cover" />
            </div>
          </div>
        ) : null}

        <Shell className="max-w-[var(--maxw-prose,860px)]">
          <div className={`mt-12 ${PROSE}`} dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

          {post.tags.length > 0 ? (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-border-subtle pt-6">
              {post.tags.map((t) => (
                <span key={t.slug} className="border border-border-subtle px-3 py-1.5 font-mono text-[11px] text-foreground-secondary">
                  #{t.name}
                </span>
              ))}
            </div>
          ) : null}
        </Shell>
      </article>

      <div className="mt-20 border-t border-border-subtle bg-surface-raised py-16">
        <Shell>
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-display text-2xl font-semibold tracking-tight">Un sujet qui résonne avec votre marque ?</div>
              <p className="mt-2 max-w-[60ch] text-sm text-foreground-secondary">
                On transforme ces principes en trajectoire concrète. La première conversation est gratuite.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <PrimaryCta href="/contact">Démarrer un projet</PrimaryCta>
              <GhostCta href="/methode">Notre méthode</GhostCta>
            </div>
          </div>
        </Shell>
      </div>

      <SiteFooter />
    </main>
  );
}
