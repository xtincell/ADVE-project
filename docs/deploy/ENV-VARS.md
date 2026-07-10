# Variables d'environnement × comportement de dégradation

Checklist canonique pour un déploiement production (Coolify `powerupgraders.com`,
self-host pm2, Vercel, Cloudflare Containers). Doctrine : **l'OS dégrade
honnêtement** — une clé absente ne crashe jamais, la feature répond
`DEFERRED_AWAITING_CREDENTIALS` / fallback documenté.

Légende : 🔴 requis (boot/feature critique) · 🟡 fortement recommandé
(funnel payant) · ⚪ optionnel (feature s'éteint proprement).

## 🔴 Socle (sans elles, rien ne tourne)

| Var | Rôle | Sans elle |
|---|---|---|
| `DATABASE_URL` | Postgres (pooler ok) | boot KO |
| `DIRECT_URL` | connexion directe pour `prisma migrate` | migrations KO (runtime ok si migré) |
| `NEXTAUTH_SECRET` | sessions | auth KO |
| `NEXTAUTH_URL` / `AUTH_URL` | callbacks auth | login cassé |
| `NEXT_PUBLIC_BASE_URL` | URLs absolues (PDF, liens mails) | liens cassés |

Note migrations : l'image Docker exécute `prisma migrate deploy` au boot
(`scripts/docker-entrypoint.sh`). Opt-out : `SKIP_MIGRATE_ON_BOOT=1`
(si migrate en pre-deploy Coolify ou replicas multiples).

## 🟡 LLM (Oracle, extraction intake, briefs)

| Var | Rôle | Sans elle |
|---|---|---|
| `OPENROUTER_API_KEY` (+ `OPENROUTER_MODEL`) | provider texte par défaut (owl-alpha) | cascade → Anthropic/OpenAI/Ollama |
| `ANTHROPIC_API_KEY` | provider premium | intake → fallback question-bank templé (sans LLM) ; Oracle/calibration en erreur si AUCUN provider |
| `OPENAI_API_KEY` | embeddings (RAG) | RAG passe en lexical (pas de crash) |

## 🟡 Empreinte publique pilier E (ADR-0121 — le rapport payant)

| Var | Rôle | Sans elle |
|---|---|---|
| `BRAVE_API_KEY` | découverte des profils sociaux (free tier ~2 000 req/mois — <https://brave.com/search/api/>) | découverte skippée : seuls les liens déclarés par le client sont exploités |
| `APIFY_TOKEN` | compteurs followers réels (~0,001 $/profil, 5 $/mois gratuit — <https://apify.com>) | hints OG approximatifs conservés (souvent absents sur IG/TikTok) |
| `APIFY_IG_ACTOR_ID` | override actor Instagram (`"off"` désactive) | défaut `apify~instagram-profile-scraper` |
| `APIFY_TIKTOK_ACTOR_ID` | override actor TikTok (`"off"` désactive) | défaut `clockworks~tiktok-profile-scraper` |
| `APIFY_FB_ACTOR_ID` | override actor Facebook (`"off"` désactive) | défaut `apify~facebook-pages-scraper` |
| `YOUTUBE_API_KEY` | stats de chaîne YouTube (Data API v3, gratuite 10 000 unités/j) | bloc YouTube « non mesuré » |
| `PAGESPEED_API_KEY` | performance mobile du site (PSI, gratuite 25 000 req/j) | dimension performance « non mesurée » |
| `APIFY_MAPS_ACTOR_ID` | opt-in avis Google Business (`compass~crawler-google-places`, `"off"` désactive) | dimension avis « non mesurée » |
| `APIFY_ADS_ACTOR_ID` | opt-in transparence pubs Meta (actor Ad Library, `"off"` désactive) | bloc pubs omis |

Presse (Google News RSS), domaine (RDAP) et email MX/SPF/DMARC (node:dns) : aucune clé requise, toujours actifs.
Le score d'empreinte /100 est renormalisé sur les dimensions réellement mesurées — une dimension sans clé est exclue du dénominateur, jamais comptée à 0.

## 🟡 Paiements (paywall intake + abonnements)

| Var | Rôle | Sans elle |
|---|---|---|
| `STRIPE_SECRET_KEY` + webhooks | cartes | provider mock ; **fallback shippé : paiement manuel WhatsApp** |
| `CINETPAY_API_KEY`/`CINETPAY_SITE_ID`, `PAYPAL_*` | mobile money agrégé / PayPal | idem |
| `MANUAL_PAYMENT_WHATSAPP_NUMBER` | file paiement manuel (défaut 237694171799) | défaut utilisé |
| `WAVE_API_URL`, `MTN_MOMO_API_URL`, `ORANGE_MONEY_API_URL` + `WEBHOOK_SECRET_*` | payouts commissions talents | payouts `DEFERRED_AWAITING_CREDENTIALS` |

## ⚪ Comms / notifications

| Var | Rôle | Sans elle |
|---|---|---|
| `RESEND_API_KEY` > `MAILGUN_*` > `SENDGRID_API_KEY` + `EMAIL_FROM` | email transactionnel/newsletter | log fallback, envois `DEFERRED` |
| VAPID / FCM | Web Push | push deferred |
| `CRON_SECRET` | protège `/api/cron/*` (appelés par `scheduled-ops.yml` ET le daemon in-process) | ⚠️ routes cron non protégées — à poser en prod |
| `OPS_DAEMON` | daemon cron in-process (vague C) — ON par défaut en prod, tire `/api/cron/*` aux cadences de scheduled-ops.yml sans cron externe ; `0`/`off` désactive, `1` force en dev | défaut : actif en prod — un self-host Coolify n'a RIEN à configurer pour que sentinelles/feeds/digests tournent |

## ⚪ Connecteurs externes

| Var | Rôle | Sans elle |
|---|---|---|
| `ZOHO_*`, `MONDAY_*`, `<SERVER>_OAUTH_CLIENT_ID` | CRM / intégrations OAuth | 400 propre `provider_not_configured` |
| `SESHAT_API_URL` | Tarsis-monitoring / harvester | signaux dérivés RSS (réels) ou `_mocked` |
| `BLOB_STORAGE_PUT_URL_TEMPLATE` | archivage assets Ptah | dry-run |
| `KNOWLEDGE_HASH_SALT`, `INTEGRATION_TOKEN_KEY` | hash k-anonymity / chiffrement tokens | défauts dev — à poser en prod |

## ⚪ Multi-pod (plusieurs répliques)

| Var | Rôle | Sans elle |
|---|---|---|
| `REDIS_URL` | pont pub/sub NSP SSE inter-pods + invalidation cross-pod des caches (brand-node inheritance, market-visibility kill-switch) + claims CAS des ticks cron | mode single-pod honnête : SSE et caches process-local, ticks non arbitrés — correct à 1 réplique, à poser dès la 2ᵉ |

## Minimum viable Coolify (funnel payant, single-pod)

```
DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, AUTH_URL, NEXT_PUBLIC_BASE_URL,
OPENROUTER_API_KEY (ou ANTHROPIC_API_KEY),
BRAVE_API_KEY, APIFY_TOKEN,            # pilier E du rapport payant
CRON_SECRET,
MANUAL_PAYMENT_WHATSAPP_NUMBER         # ou STRIPE/CINETPAY pour l'auto-pay
```

Passage multi-pod : poser `REDIS_URL` (vague B) — le pont NSP SSE,
l'invalidation cross-pod des caches et les claims CAS des crons s'activent
seuls. Un seul pod : rien à faire (fallback single-pod honnête).
