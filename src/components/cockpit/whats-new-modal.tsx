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
import { Dialog, DialogFooter } from "@/components/primitives/dialog";
import { Button } from "@/components/primitives/button";
import { LATEST_RELEASE, releaseToShow, type ReleaseNote } from "@/lib/release-notes";

const LS_KEY = "lafusee.whatsNew.lastSeenVersion";

export function WhatsNewModal() {
  const [note, setNote] = useState<ReleaseNote | null>(null);

  useEffect(() => {
    if (!LATEST_RELEASE) return;
    let lastSeen: string | null = null;
    try {
      lastSeen = window.localStorage.getItem(LS_KEY);
    } catch {
      /* stockage indisponible (mode privé) — on présentera la note, sans mémoriser */
    }
    const toShow = releaseToShow(lastSeen);
    if (toShow) setNote(toShow);
  }, []);

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
