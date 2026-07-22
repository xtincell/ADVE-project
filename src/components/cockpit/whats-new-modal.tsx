"use client";

/**
 * WhatsNewModal — l'écran « Quoi de neuf » à la connexion (cockpit).
 *
 * Présente la note de version la plus récente (`RELEASE_NOTES`, vocable CLIENT) une
 * seule fois par version : on mémorise la dernière version vue en `localStorage` (pas
 * de nag, per-device, zéro migration). Monté une fois dans le layout cockpit → visible
 * sur n'importe quelle page après login.
 */
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogFooter } from "@/components/primitives/dialog";
import { Button } from "@/components/primitives/button";
import { LATEST_RELEASE, releaseToShow, type ReleaseNote } from "@/lib/release-notes";

const LS_KEY = "lafusee.whatsNew.lastSeenVersion";
// Clé du PortalWelcome cockpit — on n'affiche « Quoi de neuf » qu'APRÈS le welcome
// vu, pour ne pas empiler deux modaux au tout premier login (le welcome prime).
const WELCOME_KEY = "lafusee:welcome:cockpit:v1";

export function WhatsNewModal() {
  const { status } = useSession();
  const [note, setNote] = useState<ReleaseNote | null>(null);

  useEffect(() => {
    // Gate d'auth (audit 2026-07-22) : pas de flash pré-auth, ni d'affichage à un
    // visiteur non authentifié. (Le modal ne sert que la note produit — inoffensif
    // pour un opérateur/collaborateur, mais on évite l'apparition intempestive.)
    if (status !== "authenticated") return;
    if (!LATEST_RELEASE) return;
    let lastSeen: string | null = null;
    let welcomeSeen = true;
    try {
      lastSeen = window.localStorage.getItem(LS_KEY);
      welcomeSeen = window.localStorage.getItem(WELCOME_KEY) === "seen";
    } catch {
      /* stockage indisponible (mode privé) — on présentera la note, sans mémoriser */
    }
    // Coordination : au tout premier login, laisser le PortalWelcome seul ; « Quoi de
    // neuf » apparaîtra à la navigation/visite suivante (welcome alors vu).
    if (!welcomeSeen) return;
    const toShow = releaseToShow(lastSeen);
    if (toShow) setNote(toShow);
  }, [status]);

  function dismiss() {
    try {
      if (LATEST_RELEASE) window.localStorage.setItem(LS_KEY, LATEST_RELEASE.version);
    } catch {
      /* ignore */
    }
    setNote(null);
  }

  if (!note) return null;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) dismiss();
      }}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <span aria-hidden>✨</span> Quoi de neuf — {note.headline}
        </span>
      }
      description={`Nouveautés du ${note.date}`}
    >
      <ul className="space-y-3">
        {note.highlights.map((h, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-xl leading-none" aria-hidden>{h.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{h.title}</p>
              <p className="text-sm text-foreground-secondary">{h.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <DialogFooter>
        <Button onClick={dismiss}>J&apos;ai compris</Button>
      </DialogFooter>
    </Dialog>
  );
}
