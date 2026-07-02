"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Menu burger du site public — zéro dépendance (React seul), fermé au clic.
 * Les liens principaux viennent du layout (source unique NAV_LINKS) ; les
 * entrées de session (Portails / Connexion / CTA) sont répétées ici car la
 * barre les masque sous `md`.
 */
export function MobileNav({ links }: { links: readonly { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="menu-mobile"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-10 items-center justify-center rounded-md text-bone transition-colors hover:bg-white/10"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>

      {open ? (
        <div
          id="menu-mobile"
          className="absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-line bg-ink text-bone shadow-card-lg"
        >
          <nav className="mx-auto max-w-page px-gutter py-5" aria-label="Navigation mobile">
            <ul className="flex flex-col gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    className="block rounded-md px-3 py-2.5 text-[15px] font-medium text-sand transition-colors hover:bg-white/5 hover:text-bone"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line-soft px-3 pt-4">
              <Link href="/intake" onClick={close} className={buttonVariants({ size: "sm" })}>
                Diagnostic gratuit
              </Link>
              <Link
                href="/connexion"
                onClick={close}
                className="text-sm font-medium text-sand transition-colors hover:text-bone"
              >
                Connexion
              </Link>
              <Link
                href="/portails"
                onClick={close}
                className="text-sm font-medium text-sand transition-colors hover:text-bone"
              >
                Portails
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
