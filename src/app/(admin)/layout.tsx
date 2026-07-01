import Link from "next/link";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/app/(public)/connexion/actions";
import { TopbarNav } from "./topbar-nav";

/**
 * Shell des opérations agence (/admin/*) — topbar sombre, contenu clair.
 * Accès gardé par src/middleware.ts (OPERATOR, ou OWNER d'un workspace
 * AGENCY — décision JWT pure). Rendu par requête, jamais prerendu au build.
 */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bone text-ink">
      <header className="sticky top-0 z-50 border-b border-line bg-ink text-bone">
        <div className="mx-auto flex h-14 max-w-wide items-center gap-6 px-gutter">
          <Link href="/admin" className="flex items-center gap-2.5" aria-label="La Fusée — admin">
            <span className="font-display text-lg font-semibold tracking-tight">
              La Fusée<span className="text-coral">·</span>
            </span>
            <Badge variant="inverse">Admin</Badge>
          </Link>
          <TopbarNav />
          <form action={logoutAction} className="ml-auto">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium text-sand transition-colors hover:text-bone [&_svg]:size-4"
            >
              <LogOut aria-hidden />
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-wide px-gutter py-10">{children}</div>
      </main>
    </div>
  );
}
