/**
 * harvest-social-media.ts
 *
 * Script de collecte rigoureuse des informations publiques et de la présence digitale d'une marque.
 * Utilise les clés d'API définies dans le projet pour interroger diverses plateformes.
 *
 * Usage: npx tsx scripts/harvest-social-media.ts --brand="Apple"
 */

import { z } from "zod";

const ConfigSchema = z.object({
  brandName: z.string(),
  braveApiKey: z.string().optional(),
  twitterKey: z.string().optional(),
  tiktokKey: z.string().optional(),
});

// Definition des interfaces
interface SocialMention {
  platform: "twitter" | "tiktok" | "linkedin" | "web" | "meta";
  content: string;
  url: string;
  date: string;
  sentiment?: "positive" | "neutral" | "negative";
  reach?: number;
}

interface BrandDigitalPresence {
  brandName: string;
  mentions: SocialMention[];
  summary: string;
}

class WebHarvester {
  constructor(private braveApiKey?: string) {}

  /**
   * Utilise Brave Search API pour trouver la présence digitale SEO et mentions.
   */
  async searchWeb(query: string): Promise<SocialMention[]> {
    if (!this.braveApiKey) {
      console.warn("⚠️ BRAVE_API_KEY non configurée. Scraping Web ignoré.");
      return [];
    }

    try {
      console.log(`[Brave Search] Recherche de la marque : ${query}...`);
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", `"${query}"`);
      url.searchParams.set("count", "5"); // Top 5 résultats web

      const res = await fetch(url.toString(), {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": this.braveApiKey,
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const results: SocialMention[] = (data.web?.results || []).map((item: any) => ({
        platform: "web",
        content: `${item.title} - ${item.description}`,
        url: item.url,
        date: new Date().toISOString(),
      }));

      return results;
    } catch (err) {
      console.error("[Brave Search] Erreur:", err);
      return [];
    }
  }
}

class TwitterHarvester {
  constructor(private apiKey?: string) {}

  async fetchRecentTweets(brandHandle: string): Promise<SocialMention[]> {
    if (!this.apiKey) {
      console.warn("⚠️ TWITTER_CONSUMER_KEY non configurée. Scraping Twitter ignoré.");
      return [];
    }

    console.log(`[Twitter] Récupération des mentions pour @${brandHandle}...`);
    // Placeholder pour l'implémentation de l'API Twitter v2
    // L'implémentation requiert l'authentification OAuth2.0
    return [
      {
        platform: "twitter",
        content: `Exemple de tweet très positif mentionnant ${brandHandle}`,
        url: `https://twitter.com/user/status/123`,
        date: new Date().toISOString(),
      }
    ];
  }
}

class TikTokHarvester {
  constructor(private clientKey?: string) {}

  async fetchPopularVideos(hashtag: string): Promise<SocialMention[]> {
    if (!this.clientKey) {
      console.warn("⚠️ TIKTOK_CLIENT_KEY non configurée. Scraping TikTok ignoré.");
      return [];
    }

    console.log(`[TikTok] Récupération des tendances pour #${hashtag}...`);
    // Placeholder pour l'appel API TikTok Graph
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const brandArg = args.find(a => a.startsWith("--brand="))?.split("=")[1] || "Apple";

  console.log(`=== HARVEST DIGITAL PRESENCE: ${brandArg} ===\n`);

  const config = ConfigSchema.parse({
    brandName: brandArg,
    braveApiKey: process.env.BRAVE_API_KEY,
    twitterKey: process.env.TWITTER_CONSUMER_KEY,
    tiktokKey: process.env.TIKTOK_CLIENT_KEY,
  });

  const webHarvester = new WebHarvester(config.braveApiKey);
  const twitterHarvester = new TwitterHarvester(config.twitterKey);
  const tiktokHarvester = new TikTokHarvester(config.tiktokKey);

  const webMentions = await webHarvester.searchWeb(config.brandName);
  const twitterMentions = await twitterHarvester.fetchRecentTweets(config.brandName);
  const tiktokMentions = await tiktokHarvester.fetchPopularVideos(config.brandName.replace(/\s+/g, ''));

  const allMentions = [...webMentions, ...twitterMentions, ...tiktokMentions];

  const report: BrandDigitalPresence = {
    brandName: config.brandName,
    mentions: allMentions,
    summary: `Récupéré ${allMentions.length} sources de données pour ${config.brandName}.`,
  };

  console.log("\n=== RAPPORT DE PRÉSENCE DIGITALE ===");
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch(err => {
    console.error("Erreur fatale:", err);
    process.exit(1);
  });
}
