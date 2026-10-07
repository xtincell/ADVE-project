import { Suspense } from "react";

/** Both tracking views read the existing team selection from the URL. */
export default function CampaignTrackingLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-foreground-secondary">Chargement du suivi…</p>}>
    {children}
  </Suspense>;
}
