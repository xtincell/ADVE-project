/**
 * Argos — mention de la source et de la fraîcheur d'une lecture publique
 * (SHK-0002 point 5). Bibliothèque canonique : une ligne discrète. Dossiers
 * publiés par La Fusée en repli : un encart qui dit pourquoi.
 */

import type { ArgosReadSource } from "@/domain/argos-library";
import { Alert } from "@/components/primitives/alert";
import { describeArgosSource } from "./argos-display";

export function ArgosSourceNotice({ source, scope }: { source: ArgosReadSource; scope: "list" | "dossier" }) {
  const view = describeArgosSource(source, scope);
  if (view.tone === "plain") {
    return (
      <p className="text-xs text-muted-foreground" data-argos-source={source.origin}>
        {view.text}
      </p>
    );
  }
  return (
    <Alert tone={view.tone} title={view.title} data-argos-source={source.origin}>
      {view.text}
    </Alert>
  );
}
