import type { Metadata } from "next";
import { PublicSalesEntry } from "@/components/console/public-sales-entry";

export const metadata: Metadata = {
  title: "Parler à l’équipe commerciale",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SalesPublicEntryPage({ params }: { params: Promise<{ publicId: string }> }) {
  return <PublicSalesEntry publicId={(await params).publicId} />;
}
