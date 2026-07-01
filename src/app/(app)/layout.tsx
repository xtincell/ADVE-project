import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(public)/connexion/actions";
import { SidebarNav } from "./sidebar-nav";

/**
 * Shell de l'espace marque (/app/*) — sidebar sombre ink, contenu sombre.
 * Accès gardé par src/middleware.ts (session requise). Rendu par requête :
 * jamais de prerender au build (pas de DATABASE_URL au build).
 */
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ink text-bone">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-ink-0 px-4 py-6">
        <Link href="/app" className="px-3" aria-label="La Fusée — ma marque">
          <span className="font-display text-lg font-semibold tracking-tight">
            La Fusée<span className="text-coral">·</span>
          </span>
        </Link>
        <div className="mt-8 flex-1">
          <SidebarNav />
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sand transition-colors hover:bg-ink-2 hover:text-bone [&_svg]:size-4.5"
          >
            <LogOut aria-hidden />
            Déconnexion
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-page px-gutter py-10">{children}</div>
      </main>
    </div>
  );
}
