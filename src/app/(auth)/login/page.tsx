import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  // Lu côté serveur : le bouton Google n'apparaît que si les deux secrets sont
  // présents en env (parité « ship-without-keys », cf. src/lib/auth/config.ts).
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center text-zinc-500">
          Chargement...
        </div>
      }
    >
      <LoginForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
