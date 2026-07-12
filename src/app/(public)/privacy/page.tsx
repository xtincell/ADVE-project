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
            Accès, rectification, effacement, portabilité, opposition. Pour exercer : écrire à <a href="mailto:privacy@lafusee.upgraders.io" className="text-accent hover:underline">privacy@lafusee.upgraders.io</a> avec une preuve d&apos;identité. Pour supprimer les données de tes comptes sociaux connectés : voir <Link href="/data-deletion" className="text-accent hover:underline">Suppression des données</Link>.
          </p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Cookies</h2>
          <p>Essentiels (session de connexion) — sans consentement requis. Analytics — uniquement si tu acceptes via la bannière. Pas de cookies publicitaires tiers.</p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">IA — non-entraînement garanti</h2>
          <p>
            Aucune de tes données n&apos;est utilisée pour entraîner des modèles d&apos;IA — ni par La Fusée, ni par ses
            fournisseurs (appels API Anthropic/OpenAI sous garanties contractuelles de non-entraînement). La majorité
            des traitements (scores, prix, compilation) sont déterministes et n&apos;envoient rien à un LLM. Détail
            complet dans le <Link href="/dpa" className="text-accent hover:underline">DPA</Link> (§4).
          </p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Chiffrement</h2>
          <p>
            TLS 1.2+ en transit sur toutes les surfaces ; chiffrement AES-256 au repos (base et sauvegardes) ;
            mots de passe hachés bcrypt ; secrets système en variables d&apos;environnement uniquement ; clés API
            conservées en empreinte SHA-256. Cf. <Link href="/trust-center" className="text-accent hover:underline">Trust Center</Link>.
          </p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Sous-traitants</h2>
          <p>Hébergement (Vercel), base de données (Supabase / hébergeur autorisé), email transactionnel (Mailgun), LLM (Anthropic, OpenAI — API sans entraînement). Liste détaillée et actualisée dans le <Link href="/dpa" className="text-accent hover:underline">DPA</Link> (§7).</p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Contact</h2>
          <p>UPgraders / La Fusée SARL — Douala, Cameroun. <a href="mailto:privacy@lafusee.upgraders.io" className="text-accent hover:underline">privacy@lafusee.upgraders.io</a></p>
        </div>
      </section>
    </main>
  );
}
