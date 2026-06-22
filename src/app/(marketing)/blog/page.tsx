import type { Metadata } from "next";
import { SiteNav } from "@/components/upgraders/site-nav";
import { SiteFooter } from "@/components/upgraders/site-footer";
import { Section, PageHeader, PrimaryCta, GhostCta } from "@/components/upgraders/ui";
import { PostCard } from "@/components/upgraders/blocks";
import { getAllPosts } from "@/components/upgraders/posts";

export const metadata: Metadata = {
  title: "Blog — UPgraders · Notes de cabinet",
  description:
    "Les notes de cabinet d'UPgraders : méthode ADVE/RTIS, culte de marque en Afrique, modèle Guilde, roadmap dynamique, La Fusée. Stratégie de marque, sans langue de bois.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main>
      <SiteNav />
      <PageHeader
        eyebrow="Notes de cabinet"
        title="Le"
        emphasis="blog."
        lede="Ce qu'on apprend en bâtissant des marques en Afrique francophone — méthode, modèle d'agence, signaux de marché. Sans langue de bois."
      >
        <PrimaryCta href="/contact">Démarrer un projet</PrimaryCta>
        <GhostCta href="/methode">Notre méthode</GhostCta>
      </PageHeader>

      <Section>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
