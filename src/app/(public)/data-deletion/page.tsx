/**
 * /data-deletion — Instructions de suppression des données utilisateur.
 *
 * Page publique requise par Meta (champ « User Data Deletion » de l'app),
 * acceptée aussi par Google/LinkedIn comme complément à la politique de
 * confidentialité. Décrit comment un utilisateur supprime les données que
 * La Fusée détient sur ses comptes sociaux connectés (tokens chiffrés,
 * relevés d'audience, métriques de publications).
 */
import Link from "next/link";

export const metadata = {
  title: "Suppression des données — La Fusée",
  description:
    "Comment supprimer les données de vos comptes sociaux connectés à La Fusée : déconnexion immédiate, suppression de compte sur demande.",
};

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <Link href="/" className="text-xs font-mono text-foreground-muted hover:text-accent">
          ← Retour
        </Link>
      </div>
      <h1 className="font-display text-4xl font-semibold tracking-tight mb-4">
        Suppression de vos données
      </h1>
      <p className="text-foreground-secondary mb-10">
        Mise à jour : 12 juillet 2026. Vous gardez le contrôle des données issues de vos comptes
        sociaux connectés (Facebook, Instagram, Google/YouTube, LinkedIn, X, TikTok). Voici comment
        les supprimer, immédiatement ou définitivement.
      </p>

      <section className="space-y-8 text-foreground-secondary">
        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Ce que nous conservons</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Le jeton d&apos;accès délégué de chaque compte connecté — <strong>chiffré (AES-256-GCM)</strong>, jamais lisible en clair, jamais partagé.</li>
            <li>Les relevés publics d&apos;audience (nombre d&apos;abonnés) et les métriques de vos publications (mentions J&apos;aime, commentaires, vues, portée quand vous l&apos;autorisez) — pour votre tableau de bord.</li>
            <li>Si vous activez la boîte de réception : les <strong>commentaires publics adressés à votre marque</strong> (texte, nom/pseudo public de l&apos;auteur, horodatage) et vos réponses — pour que vous puissiez y répondre depuis l&apos;app. Vous en êtes responsable de traitement ; nous les traitons pour votre compte.</li>
            <li>Aucun mot de passe de compte social, aucun message privé non adressé à votre marque, jamais de collecte sur les profils de vos abonnés.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Suppression immédiate (self-service)</h2>
          <p>
            Dans votre cockpit, ouvrez <span className="font-mono text-foreground">Mon compte → Connexions</span>,
            puis cliquez <span className="font-mono text-foreground">Déconnecter</span> sur le réseau concerné.
            La déconnexion <strong>purge immédiatement le jeton chiffré</strong> de nos serveurs et arrête toute
            collecte — statistiques comme boîte de réception. Les relevés d&apos;audience déjà agrégés et les
            interactions déjà collectées restent (historique de votre marque) — pour les effacer aussi,
            demandez la suppression de compte ci-dessous ; un auteur de commentaire peut aussi demander la
            suppression de ses données via <a href="mailto:privacy@lafusee.upgraders.io" className="text-accent hover:underline">privacy@lafusee.upgraders.io</a>.
          </p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Révocation côté plateforme</h2>
          <p>
            Vous pouvez aussi révoquer l&apos;accès directement depuis le réseau : <em>Facebook/Instagram</em> →
            Paramètres → Applications et sites web ; <em>Google</em> → myaccount.google.com/permissions ;
            <em> LinkedIn</em> → Paramètres → Applications autorisées. La prochaine synchronisation détecte la
            révocation et marque la connexion comme expirée.
          </p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Suppression définitive (compte + historique)</h2>
          <p>
            Pour effacer l&apos;intégralité des données liées à vos comptes sociaux (jetons, relevés, métriques,
            et le compte lui-même), écrivez à
            <a href="mailto:privacy@lafusee.upgraders.io" className="text-accent hover:underline"> privacy@lafusee.upgraders.io</a>
            {" "}depuis l&apos;email de votre compte, objet <span className="font-mono text-foreground">« Suppression données »</span>.
            Nous traitons la demande sous <strong>30 jours</strong> et confirmons par écrit.
          </p>
        </div>

        <div>
          <h2 className="text-foreground text-xl font-semibold mb-3">Référence</h2>
          <p>
            Cette procédure complète notre <Link href="/privacy" className="text-accent hover:underline">Politique de confidentialité</Link>
            {" "}et le <Link href="/dpa" className="text-accent hover:underline">DPA</Link>. Responsable du traitement :
            UPgraders / La Fusée SARL — Douala, Cameroun.
          </p>
        </div>
      </section>
    </main>
  );
}
