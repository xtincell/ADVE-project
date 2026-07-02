import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHero, Section } from "@/components/marketing/section";
import { formatPostDate, getAllPosts } from "@/components/marketing/blog-posts";

export const metadata: Metadata = {
  title: "Blog — Notes de cabinet",
  description:
    "Les notes de cabinet d'UPgraders : méthode ADVE/RTIS, culte de marque en Afrique, modèle Guilde, roadmap dynamique, La Fusée. Stratégie de marque, sans langue de bois.",
};

/**
 * Index du blog — port de legacy/(marketing)/blog. Contenu statique v7
 * (les 6 articles réels du seed legacy), pas de table dédiée.
 */
export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <PageHero
        eyebrow="Notes de cabinet"
        title={
          <>
            Le <span className="text-coral">blog</span>.
          </>
        }
        lede="Ce qu'on apprend en bâtissant des marques en Afrique francophone — méthode, modèle d'agence, signaux de marché. Sans langue de bois."
      >
        <Link href="/intake" className={buttonVariants({ size: "lg" })}>
          Diagnostic gratuit <ArrowRight />
        </Link>
        <Link href="/methode" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Notre méthode
        </Link>
      </PageHero>

      <Section>
        <div className="grid gap-bento sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group flex flex-col gap-2 rounded-lg bg-white p-6 shadow-card transition-shadow hover:shadow-card-lg"
            >
              <p className="eyebrow text-smoke-2">
                <span className="text-coral">{p.category}</span>
                <span className="mx-2">·</span>
                {p.readingMinutes} min
              </p>
              <h2 className="font-display text-lg font-semibold leading-snug group-hover:text-coral">
                {p.title}
              </h2>
              <p className="text-sm leading-relaxed text-smoke">{p.excerpt}</p>
              <p className="mt-auto pt-3 text-xs text-smoke-2">{formatPostDate(p.date)}</p>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
