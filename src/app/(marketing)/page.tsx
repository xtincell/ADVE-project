import { MarketingNav } from "@/components/landing/marketing-nav";
import { MarketingHero } from "@/components/landing/marketing-hero";
import { MarketingStrip } from "@/components/landing/marketing-strip";
import { MarketingManifesto } from "@/components/landing/marketing-manifesto";
import { MarketingSurveillance } from "@/components/landing/marketing-surveillance";
import { MarketingApogee } from "@/components/landing/marketing-apogee";
import { MarketingAdvertis } from "@/components/landing/marketing-advertis";
import { MarketingDiagnostic } from "@/components/landing/marketing-diagnostic";
import { MarketingGouverneurs } from "@/components/landing/marketing-gouverneurs";
import { MarketingPortails } from "@/components/landing/marketing-portails";
import { MarketingPricing } from "@/components/landing/marketing-pricing";
import { MarketingFaq } from "@/components/landing/marketing-faq";
import { MarketingFinale } from "@/components/landing/marketing-finale";
import { MarketingFooter } from "@/components/landing/marketing-footer";

export default function MarketingHomePage() {
  return (
    <main>
      <MarketingNav />
      <MarketingHero />
      <MarketingStrip />
      <MarketingManifesto />
      <MarketingSurveillance />
      <MarketingApogee />
      <MarketingAdvertis />
      <MarketingDiagnostic />
      <MarketingGouverneurs />
      <MarketingPortails />
      <MarketingPricing />
      <MarketingFaq />
      <MarketingFinale />
      <MarketingFooter />
    </main>
  );
}
