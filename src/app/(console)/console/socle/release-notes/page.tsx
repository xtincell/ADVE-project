/**
 * /console/socle/release-notes — le récap opérateur des notes de version CLIENT.
 *
 * MÊME source que l'écran « Quoi de neuf » du cockpit (`src/lib/release-notes.ts`,
 * vocable client ADR-0123) : ici l'opérateur relit tout l'historique des nouveautés
 * telles qu'elles sont présentées aux dirigeants. Anti-doublon : une seule source de
 * données, deux vues (modal login founder + ce récap console). DISTINCT du `/changelog`
 * public (commits git bruts, vocable technique auditeur).
 *
 * APOGEE: Mission Control deck / Console-Admin sub-system / Ground Tier.
 */
import { PageHeader } from "@/components/shared/page-header";
import { RELEASE_NOTES, LATEST_RELEASE } from "@/lib/release-notes";
import { Sparkles } from "lucide-react";

export default function ReleaseNotesRecapPage() {
  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Notes de version"
        description="Les nouveautés telles que le dirigeant les voit à sa connexion (vocable client). Source unique partagée avec l'écran « Quoi de neuf » du cockpit."
      />

      {LATEST_RELEASE && (
        <p className="text-xs text-foreground-muted">
          Dernière note présentée aux dirigeants :{" "}
          <span className="font-mono font-semibold text-foreground">v{LATEST_RELEASE.version}</span>{" "}
          — {LATEST_RELEASE.date}.
        </p>
      )}

      {RELEASE_NOTES.length === 0 ? (
        <p className="rounded-xl border border-border bg-background/60 p-6 text-center text-sm text-foreground-muted">
          Aucune note de version. NEFER en ajoute une à chaque livraison visible du dirigeant
          (nefer-docs §6.0).
        </p>
      ) : (
        <ol className="space-y-6">
          {RELEASE_NOTES.map((note) => (
            <li key={note.version} className="rounded-xl border border-border bg-background/60 p-5">
              <header className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle">
                  <Sparkles className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-foreground">{note.headline}</h2>
                  <p className="text-2xs text-foreground-muted">
                    <span className="font-mono">v{note.version}</span> · {note.date}
                  </p>
                </div>
              </header>
              <ul className="space-y-3">
                {note.highlights.map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-xl leading-none" aria-hidden>
                      {h.emoji}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{h.title}</p>
                      <p className="text-sm text-foreground-secondary">{h.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
