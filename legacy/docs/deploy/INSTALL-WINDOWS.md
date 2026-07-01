# Installation sur desktop Windows — tutoriel pas-à-pas (handoff agent)

> **Pour l'agent qui prend la main.** Objectif : faire tourner La Fusée en
> **serverfull** sur le desktop Windows de l'opérateur (*Lightbringer* : i5-9600KF ·
> 48 Go · GTX 1080 · Windows 11), **en plus** du déploiement Vercel existant.
> Serveur Node persistant → **pas de timeout** sur les flux LLM longs.
>
> Exécute les phases **dans l'ordre**, valide le ✅ **gate** de chaque phase avant
> de continuer, et **demande à l'opérateur** les valeurs marquées 🔑. Référence
> approfondie : [SELF-HOST.md](SELF-HOST.md). Process manager : [`ecosystem.config.cjs`](../../ecosystem.config.cjs) (racine repo).

---

## §0 — À collecter auprès de l'opérateur AVANT de commencer 🔑

Ne démarre pas tant que tu n'as pas ces éléments. Pose-les en une fois :

1. **Accès au repo** : `xtincell/ADVE-project` est **privé** → un PAT GitHub (ou `gh auth login`) sur la machine.
2. **Base de données** — une décision :
   - **Option A (recommandée)** : la **chaîne Supabase existante** (partagée avec Vercel) → *Supabase → Settings → Database → Connection string → **Direct connection*** (port 5432, PAS le pooler 6543). ⚠️ Avec cette option, **ne pas seed** (la base contient déjà la vraie donnée).
   - **Option B** : Postgres **local** sur le desktop (instance 100 % indépendante, données séparées de Vercel).
3. **`ANTHROPIC_API_KEY`** (clé LLM primaire).
4. **`OPENROUTER_API_KEY`** (fallback LLM ; optionnel mais recommandé — cf. PR #258).
5. **Domaine Cloudflare** pour l'URL publique (ex. `app.upgraders.com`). L'opérateur doit avoir un domaine géré sur **son compte Cloudflare**. (Sans domaine : tunnel `*.trycloudflare.com` éphémère, pour test only.)
6. **Numéro WhatsApp paiement** (`MANUAL_PAYMENT_WHATSAPP_NUMBER`) — défaut `237694171799` si l'opérateur confirme que c'est le bon.
7. **Ollama sur GPU ?** oui/non (GTX 1080 → inférence locale gratuite, §8).

---

## §1 — Prérequis (PowerShell **en administrateur**)

```powershell
winget install OpenJS.NodeJS.LTS      # Node 22 LTS
winget install Git.Git
winget install Cloudflare.cloudflared
# referme et rouvre PowerShell pour rafraîchir le PATH
node -v ; npm -v ; git --version ; cloudflared --version
```

✅ **Gate** : `node -v` ≥ v22, et les 4 commandes répondent.

---

## §2 — Récupérer le code

```powershell
cd C:\
git clone https://github.com/xtincell/ADVE-project.git lafusee
cd C:\lafusee
# Tant que la PR #258 n'est pas mergée dans main, déployer la branche qui porte
# OpenRouter + paiement manuel + self-host :
git checkout claude/exciting-knuth-etm1bk
# (Une fois #258 mergée : git checkout main && git pull)
```

✅ **Gate** : `git status` indique la bonne branche, `ls` montre `package.json` + `ecosystem.config.cjs`.

---

## §3 — Configurer `.env.local`

`.env.local` n'est jamais committé et est chargé automatiquement par Next au runtime.

```powershell
Copy-Item .env.example .env.local
# Générer un secret d'auth :
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
notepad .env.local
```

Remplis **au minimum** (les autres restent vides — ship-without-keys) :

```ini
# — Requis —
DATABASE_URL="postgresql://...supabase.co:5432/postgres?sslmode=require"   # 🔑 §0.2
AUTH_SECRET="<le secret généré ci-dessus>"
NEXTAUTH_SECRET="<le MÊME secret>"
NEXTAUTH_URL="https://app.tondomaine.com"     # 🔑 l'URL PUBLIQUE du tunnel (§7). Critique pour l'auth.
ANTHROPIC_API_KEY="sk-ant-..."                # 🔑 §0.3

# — Recommandé —
OPENROUTER_API_KEY="sk-or-..."                # 🔑 §0.4  (fallback LLM)
MANUAL_PAYMENT_WHATSAPP_NUMBER="237694171799" # 🔑 §0.6  (chiffres uniquement)
CRON_SECRET="<un autre secret aléatoire>"     # si crons §9

# — Optionnel GPU (§8) —
# OLLAMA_BASE_URL="http://localhost:11434"
```

> Si `NEXTAUTH_URL` n'est pas encore connu (le tunnel n'est pas créé), mets une
> valeur provisoire, fais §7 d'abord, puis **reviens corriger** et rebuild (§5/§6).

✅ **Gate** : `.env.local` existe, `DATABASE_URL` + `ANTHROPIC_API_KEY` + `AUTH_SECRET` + `NEXTAUTH_URL` remplis.

---

## §4 — Base de données

**Option A — Supabase partagé (recommandée)** : la base est **déjà migrée**. Vérifie seulement la connexion + applique les migrations manquantes éventuelles (idempotent) :

```powershell
npm ci
npx prisma generate
npx prisma migrate deploy     # no-op si déjà à jour
```

⚠️ **NE PAS lancer `npm run db:seed*`** sur la base Supabase partagée (elle a la vraie donnée ; le seed ajouterait des données de démo `isDummy`).

**Option B — Postgres local** :

```powershell
winget install PostgreSQL.PostgreSQL
# crée la base puis mets DATABASE_URL=postgresql://postgres:<pwd>@localhost:5432/lafusee dans .env.local
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed                 # base
npm run db:seed:calibration     # région Wakanda (calibration : marques/prestataires/briefs/actions)
```

✅ **Gate** : `npx prisma migrate deploy` finit sans erreur (« No pending migrations » ou applique proprement). En cas de `P3009` → voir Dépannage §12.

---

## §5 — Build de production

```powershell
npm run build      # prisma generate && next build  (peut prendre 2-5 min)
```

✅ **Gate** : build **exit 0**, dossier `.next/` créé, pas d'erreur `Module not found`.

---

## §6 — Lancer en process persistant (pm2)

```powershell
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 status        # → "lafusee" : online
pm2 logs lafusee --lines 30
```

Test local : ouvre `http://localhost:3000` → la page doit répondre.

**Survie au reboot** (choisir UNE méthode) :

```powershell
# Méthode A — pm2-installer (service Windows pour pm2) :
npx @jessety/pm2-installer install
# Méthode B (bulletproof) — nssm wrappant pm2 resurrect, cf. SELF-HOST.md §4.
```

✅ **Gate** : `pm2 status` = online ; `http://localhost:3000` répond 200 ; après un `pm2 kill` + reboot simulé, le service relance l'app.

> **Process longs** : en serverfull, un appel Oracle/calibration de plusieurs
> minutes aboutit (pas de timeout serverless). Le seul plafond utile est le
> `readTimeout` du tunnel (réglé à 300 s en §7).

---

## §7 — Exposer en HTTPS public — Cloudflare Tunnel

Nécessite un domaine sur le compte Cloudflare de l'opérateur (🔑 §0.5).

```powershell
cloudflared tunnel login                         # ouvre le navigateur → autoriser le domaine
cloudflared tunnel create lafusee                # crée le tunnel + un <TUNNEL-ID>.json
cloudflared tunnel route dns lafusee app.tondomaine.com
```

Crée `C:\Users\<toi>\.cloudflared\config.yml` :

```yaml
tunnel: lafusee
credentials-file: C:\Users\<toi>\.cloudflared\<TUNNEL-ID>.json
ingress:
  - hostname: app.tondomaine.com
    service: http://localhost:3000
    originRequest:
      connectTimeout: 30s
      readTimeout: 300s        # flux LLM longs
  - service: http_status:404
```

Installe le tunnel en service Windows (démarre au boot) :

```powershell
cloudflared service install
```

Puis **mets `NEXTAUTH_URL=https://app.tondomaine.com`** dans `.env.local`, et **rebuild + reload** :

```powershell
npm run build ; pm2 reload lafusee
```

✅ **Gate** : `https://app.tondomaine.com` répond en HTTPS et sert la même app que `localhost:3000`.

> Test rapide SANS domaine : `cloudflared tunnel --url http://localhost:3000` →
> URL `*.trycloudflare.com` éphémère (change à chaque run — jamais pour la prod).

---

## §8 — (Optionnel) Ollama local sur la GTX 1080 — indépendance LLM

```powershell
winget install Ollama.Ollama
ollama pull llama3.1:8b        # ~5 Go, tient sur 8 Go VRAM
# Ollama tourne en service ; vérifie : curl http://localhost:11434/api/tags
```

Ajoute `OLLAMA_BASE_URL=http://localhost:11434` dans `.env.local`, puis `pm2 reload lafusee`.
Le LLM Gateway l'utilisera selon la `ModelPolicy` (`allowOllamaSubstitution`, pilotable dans `/console`). Ordre de repli final : **Anthropic → OpenAI → Ollama local → OpenRouter**.

✅ **Gate** (si activé) : `curl http://localhost:11434/api/tags` liste le modèle.

---

## §9 — (Optionnel) Crons de maintenance

Les `/api/cron/*` (snapshots score, digests…) sont des endpoints HTTP gardés par
`Authorization: Bearer $CRON_SECRET`. Planifie-les via le **Planificateur de tâches
Windows** (ex. toutes les 6 h) :

```powershell
$h = @{ Authorization = "Bearer <CRON_SECRET>" }
Invoke-RestMethod -Uri "https://app.tondomaine.com/api/cron/scheduler" -Headers $h
```

Non bloquant pour servir des clients — entretien de fond.

---

## §10 — Smoke test (critères de succès)

1. `https://app.tondomaine.com` charge (page d'accueil / login).
2. Login opérateur OK (NextAuth → vérifie que `NEXTAUTH_URL` = l'URL du tunnel).
3. `/intake` : le formulaire de diagnostic s'affiche et démarre.
4. `/pricing` : le bouton **« Payer via WhatsApp »** redirige vers le WhatsApp opérateur.
5. Console `/console/socle/manual-subscriptions` : la demande de paiement test apparaît, **Valider** active l'abonnement.
6. (Si Ollama) couper temporairement `ANTHROPIC_API_KEY` → un flux LLM doit basculer sur le fallback sans planter.

✅ **Installation réussie** quand 1-5 passent.

---

## §11 — Mises à jour (après le 1er déploiement)

```powershell
cd C:\lafusee
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 reload lafusee         # reload zero-downtime
```

---

## §12 — Dépannage

| Symptôme | Cause / fix |
|---|---|
| `P3009 migrate found failed migrations` | État DB local cassé. DB de dev jetable : `npx prisma migrate reset`. Sinon `npx prisma migrate resolve --rolled-back <nom>` puis `migrate deploy`. **Jamais `reset` sur Supabase partagé.** |
| `DATABASE_URL is not set` | `.env.local` absent ou non chargé. Vérifie le fichier + relance `pm2 reload`. |
| Migrations échouent via Supabase | Tu utilises le **pooler** (6543) au lieu de la **Direct connection** (5432). Prends la Direct connection pour `DATABASE_URL`. |
| Login en boucle / callback cassé | `NEXTAUTH_URL` ≠ URL publique du tunnel. Corrige, `npm run build`, `pm2 reload`. |
| Flux LLM échouent, app charge | Normal sans `ANTHROPIC_API_KEY`. Renseigne une clé (ou Ollama §8). |
| `next build` lent / OOM | Improbable (48 Go). Si besoin : `set NODE_OPTIONS=--max-old-space-size=8192` avant `npm run build`. |
| pm2 ne survit pas au reboot | Refaire §6 « survie au reboot » (pm2-installer ou nssm). |

---

## Notes

- **Coexistence Vercel** : rien à débrancher. Vercel reste la cible canonique
  (auto-deploy). Le desktop est une instance supplémentaire — sur la **même base**
  (Option A) ou une base séparée (Option B).
- **Bruit CI** : l'échec `Workers Builds: advertisproject` (PRs GitHub) est une
  intégration Cloudflare **Workers** orpheline (≠ Tunnel) — sans rapport avec ce
  déploiement. À débrancher côté dashboard Cloudflare quand l'opérateur veut.
- Détail approfondi de chaque brique : [SELF-HOST.md](SELF-HOST.md).
