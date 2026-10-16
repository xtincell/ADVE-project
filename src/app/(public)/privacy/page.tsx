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
        Mise à jour : 16 octobre 2026. UPgraders / La Fusée SARL traite tes données pour faire fonctionner l&apos;Industry OS et te livrer le diagnostic ADVE-RTIS. Pas de revente. Pas de tracking publicitaire tiers.
      </p>

      <section className="space-y-8 text-foreground-secondary">
        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Données collectées</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Compte : nom, email, mot de passe (haché bcrypt), rôle.</li>
            <li>Marque : URL, réseaux sociaux, brief PDF, contenu fourni au diagnostic.</li>
            <li>Usage : pages consultées, actions OS (audit trail IntentEmission gouvernance).</li>
            <li>Paiement : opéré par prestataires tiers (Stripe / mobile-money) — La Fusée ne stocke pas les numéros de carte.</li>
            <li>
              Réseaux connectés : statistiques et publications des comptes de la marque (jetons chiffrés
              AES-256-GCM), et — quand la marque active sa boîte de réception — les <strong>interactions
              publiques adressées à la marque</strong> (commentaires : texte, nom/pseudo public de
              l&apos;auteur, horodatage) afin de les afficher et d&apos;y répondre. La marque est responsable de
              ce traitement, La Fusée agit en sous-traitant (<Link href="/dpa" className="text-accent hover:underline">DPA</Link>).
              Jamais de mots de passe sociaux, jamais de contenu privé non adressé à la marque.
            </li>
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
          <h2 className="text-foreground text-xl font-semibold mb-3">IA et utilisation des données</h2>
          <p>
            Les fonctionnalités IA transmettent le contexte utile au service activé. Ses conditions et les
            réglages du compte déterminent l&apos;utilisation et la conservation de ces données. Cette instance
            utilise un accès OpenAI par abonnement ChatGPT ; son administrateur a confirmé le 16 octobre 2026
            que le partage pour l&apos;amélioration des modèles est désactivé. Cette confirmation ne vaut pas
            garantie contractuelle API, absence de conservation ou localisation des données. Détail et
            sources dans le <Link href="/dpa" className="text-accent hover:underline">DPA</Link> (§4).
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
          <p>Les prestataires dépendent des services activés pour ton espace. Le traitement IA de cette instance utilise OpenAI par abonnement ChatGPT, avec les conditions décrites dans le <Link href="/dpa" className="text-accent hover:underline">DPA</Link> (§4). Le registre des sous-traitants (§7) reste à confirmer pour chaque déploiement.</p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Contact</h2>
          <p>UPgraders / La Fusée SARL — Douala, Cameroun. <a href="mailto:privacy@lafusee.upgraders.io" className="text-accent hover:underline">privacy@lafusee.upgraders.io</a></p>
        </div>
      </section>
    </main>
  );
}
