import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ScoreShowcase } from "@/components/landing/score-showcase";
import { NeteruShowcase } from "@/components/landing/neteru-showcase";
import { SocialProof } from "@/components/landing/social-proof";
import { PortalsSection } from "@/components/landing/portals-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <ScoreShowcase />
      <NeteruShowcase />
      <SocialProof />
      <PortalsSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
