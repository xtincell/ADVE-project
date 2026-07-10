# Self-host « serverfull » — La Fusée sur desktop Windows

Déploiement **en plus de Vercel**, sur une machine dédiée (ex. *Lightbringer* :
i5-9600KF · 48 Go · GTX 1080 · Windows 11). Objectif : un **serveur Node
persistant** (`next start`) — donc **plus de timeout serverless**, les flux LLM
longs (Oracle 35 sections, calibration) tournent sans limite. Bonus : la GTX 1080
fait tourner **Ollama en local** → inférence gratuite + indépendance LLM.

> **Réponse à « les process longs peuvent-ils être gérés ? »** : OUI. En serverfull,
> une requête n'a plus de plafond de durée imposé par la plateforme (contrairement
> à Vercel/serverless). Le seul plafond est le timeout HTTP de ton reverse-proxy /
> tunnel (réglable) et la mémoire du process.

---

## 0. Architecture

```
                    ┌── Vercel (next start serverless)  ──┐
   Clients ──TLS──► │                                     ├──► Supabase (Postgres)
                    └── Desktop Windows (next start pm2) ─┘     (DB partagée unique)
                              ▲ Cloudflare Tunnel (HTTPS public)
```

- **DB partagée** : les deux frontends pointent sur le **même Supabase** → données
  cohérentes, peu importe l'URL qui sert le client. (Les caches/circuit-breakers
  en mémoire sont par-process et best-effort — aucune incohérence.)
- Tu peux aussi héberger un **Postgres local** sur le desktop pour une instance
  100 % indépendante (cf. §8) — mais alors les données divergent de Vercel.

---

## 1. Prérequis (Windows 11)

```powershell
winget install OpenJS.NodeJS.LTS      # Node 20 LTS (≥ celui de la CI)
winget install Git.Git
winget install Cloudflare.cloudflared # tunnel HTTPS public
# (optionnel, GPU) winget install Ollama.Ollama
```

Cloner le repo sur le desktop :

```powershell
git clone <repo-url> C:\lafusee
cd C:\lafusee
git checkout main          # ou la branche déployée
```

---

## 2. Variables d'environnement

**Référence canonique : [ENV-VARS.md](ENV-VARS.md)** — table complète var ×
comportement de dégradation (ce qui s'éteint proprement sans quelle clé) +
minimum viable Coolify.

Next charge automatiquement `.env.local` (jamais committé) au runtime. Copie le
gabarit et remplis-le :

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Minimum vital :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | la chaîne Supabase (pooler, `?sslmode=require`) |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | `openssl rand -base64 32` (ou un GUID long) |
| `NEXTAUTH_URL` | **l'URL publique du tunnel** (ex. `https://app.tondomaine.com`) — critique pour l'auth |
| `ANTHROPIC_API_KEY` | clé LLM primaire |
| `OPENROUTER_API_KEY` | fallback (cf. CHANGELOG v6.27.12) |
| `MANUAL_PAYMENT_WHATSAPP_NUMBER` | ton numéro WhatsApp paiement (défaut `237694171799`) |
| `CRON_SECRET` | un secret long si tu actives les crons (§7) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` si tu actives Ollama (§6) |

---

## 3. Base de données

Applique les migrations sur la DB cible (no-op sûr si Supabase est déjà à jour) :

```powershell
npx prisma migrate deploy
```

Seed optionnel de la région de calibration Wakanda (cf. CHANGELOG v6.27.14) :

```powershell
npm run db:seed:calibration
```

---

## 4. Build + run persistant (pm2)

```powershell
npm ci
npm run build                 # prisma generate && next build
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

Survivre au reboot Windows — le plus robuste est de **wrapper pm2 en service** :

```powershell
npm install -g pm2-installer  # OU : npx @jessety/pm2-installer install
# alternative bulletproof : nssm install lafusee "C:\Program Files\nodejs\node.exe" ...
```

Vérifier : `pm2 status`, `pm2 logs lafusee`. L'app écoute sur `http://localhost:3000`.

> **Pas de timeout** : un appel Oracle/calibration de 2-3 min aboutit (vs ~10-300 s
> max en serverless). C'est tout l'intérêt du serverfull.

---

## 5. Exposition HTTPS publique — Cloudflare Tunnel

Pas de port-forwarding, pas d'IP maison exposée, HTTPS auto. Nécessite un domaine
sur ton compte Cloudflare.

```powershell
cloudflared tunnel login                       # auth navigateur
cloudflared tunnel create lafusee              # crée le tunnel + credentials
cloudflared tunnel route dns lafusee app.tondomaine.com
```

Config `C:\Users\<toi>\.cloudflared\config.yml` :

```yaml
tunnel: lafusee
credentials-file: C:\Users\<toi>\.cloudflared\<TUNNEL-ID>.json
ingress:
  - hostname: app.tondomaine.com
    service: http://localhost:3000
    originRequest:
      # flux LLM longs : relève le timeout origine (défaut 30 s → 5 min)
      connectTimeout: 30s
      readTimeout: 300s
  - service: http_status:404
```

Installer en service Windows (démarre au boot) :

```powershell
cloudflared service install
```

Puis remets `NEXTAUTH_URL=https://app.tondomaine.com` dans `.env.local`,
`npm run build` + `pm2 reload lafusee`.

> **Test rapide sans domaine** : `cloudflared tunnel --url http://localhost:3000`
> donne une URL `*.trycloudflare.com` éphémère (change à chaque run — *jamais* pour
> la prod).

---

## 6. (Bonus GPU) Ollama en local sur la GTX 1080 — indépendance LLM

```powershell
ollama pull llama3.1:8b        # ~5 Go, tient sur 8 Go VRAM
ollama serve                   # écoute sur http://localhost:11434
```

Mets `OLLAMA_BASE_URL=http://localhost:11434` dans `.env.local`. Le LLM Gateway
détecte le provider et l'utilise selon la `ModelPolicy` (`allowOllamaSubstitution`).
Combiné à OpenRouter, l'ordre de repli devient :
**Anthropic → OpenAI → (Ollama local si policy) → OpenRouter**, donc le système
raisonne même hors-ligne / sans budget cloud. (Pilotable dans `/console`.)

---

## 7. (Optionnel) Crons de maintenance

Les `/api/cron/*` (snapshots score, digests, sweeps) sont des endpoints HTTP
gardés par `Authorization: Bearer $CRON_SECRET`. Sur Vercel ils ne sont pas câblés
(pas de `crons` dans `vercel.json`). En self-host, planifie-les via le **Planificateur
de tâches Windows** (ex. toutes les 6 h) :

```powershell
$h = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Uri "https://app.tondomaine.com/api/cron/scheduler" -Headers $h
```

(Non bloquant pour servir des clients — c'est de l'entretien de fond.)

---

## 8. (Optionnel) Postgres 100 % local

Si tu veux une instance indépendante de Supabase : `winget install PostgreSQL.PostgreSQL`,
crée une base, mets `DATABASE_URL=postgresql://...@localhost:5432/lafusee` dans
`.env.local`, puis `npx prisma migrate deploy` + `npm run db:seed:calibration`.
⚠️ Les données ne seront plus partagées avec l'instance Vercel.

---

## 9. Mises à jour

```powershell
cd C:\lafusee
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 reload lafusee            # reload zero-downtime
```

---

## 10. Coexistence avec Vercel

Rien à débrancher : Vercel reste la cible canonique (auto-deploy). Le desktop est
une instance **supplémentaire** sur la même DB. Donne aux clients l'URL que tu veux
(tunnel desktop ou domaine Vercel) — les deux servent la même donnée.

> Note : l'échec CI `Workers Builds: advertisproject` est une intégration Cloudflare
> **Workers** orpheline (Workers ≠ Tunnel ; Workers ne peut pas exécuter Next+Prisma
> sans adaptateur). À débrancher côté dashboard Cloudflare pour stopper le faux rouge.
> Le **Tunnel** (ce runbook) est indépendant et fonctionne.
