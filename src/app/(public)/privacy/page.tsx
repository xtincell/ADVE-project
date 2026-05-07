/**
 * /privacy — Politique de confidentialité (RGPD baseline).
 *
 * Page publique requise pour conformité RGPD/loi camerounaise. Surface
 * minimaliste détaillant : données collectées, base légale, durée de
 * conservation, droits utilisateur, contact DPO. Évoluera après revue
 * juridique formelle.
 */
import Link from "next/link";

export const metadata = {
  title: "Confidentialité — La Fusée",
  description: "Politique de confidentialité La Fusée Industry OS — données traitées, droits, contact.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <Link href="/" className="text-xs font-mono text-foreground-muted hover:text-accent">
          ← Retour
        </Link>
      </div>
      <h1 className="font-display text-4xl font-semibold tracking-tight mb-4">
        Confidentialité
      </h1>
      <p className="text-foreground-secondary mb-10">
        Mise à jour : 7 mai 2026. UPgraders / La Fusée SARL traite tes données pour faire fonctionner l&apos;Industry OS et te livrer le diagnostic ADVE-RTIS. Pas de revente. Pas de tracking publicitaire tiers.
      </p>

      <section className="space-y-8 text-foreground-secondary">
        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Données collectées</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Compte : nom, email, mot de passe (haché bcrypt), rôle.</li>
            <li>Marque : URL, réseaux sociaux, brief PDF, contenu fourni au diagnostic.</li>
            <li>Usage : pages consultées, actions OS (audit trail IntentEmission gouvernance).</li>
            <li>Paiement : opéré par prestataires tiers (Stripe / mobile-money) — La Fusée ne stocke pas les numéros de carte.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Base légale</h2>
          <p>Exécution du contrat (compte + livrables), intérêt légitime (audit trail gouvernance, sécurité), consentement explicite (cookies analytics, communications marketing).</p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Conservation</h2>
          <p>Compte actif : durée de la relation. Audit trail IntentEmission : 5 ans (obligation traçabilité). Données paiement chez prestataire selon leur politique.</p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Tes droits</h2>
          <p>
            Accès, rectification, effacement, portabilité, opposition. Pour exercer : écrire à <a href="mailto:privacy@lafusee.upgraders.io" className="text-accent hover:underline">privacy@lafusee.upgraders.io</a> avec une preuve d&apos;identité.
          </p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Cookies</h2>
          <p>Essentiels (session de connexion) — sans consentement requis. Analytics — uniquement si tu acceptes via la bannière. Pas de cookies publicitaires tiers.</p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Sous-traitants</h2>
          <p>Hébergement (Vercel), base de données (Supabase / hébergeur autorisé), email transactionnel (Mailgun), LLM (Anthropic, OpenAI). Liste actualisée sur demande.</p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Contact</h2>
          <p>UPgraders / La Fusée SARL — Douala, Cameroun. <a href="mailto:privacy@lafusee.upgraders.io" className="text-accent hover:underline">privacy@lafusee.upgraders.io</a></p>
        </div>
      </section>
    </main>
  );
}
