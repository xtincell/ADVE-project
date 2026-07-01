/**
 * pm2 ecosystem — self-host « serverfull » de La Fusée (cf. docs/deploy/SELF-HOST.md).
 *
 * Lance le serveur Next.js de production en process PERSISTANT (pas de timeout
 * serverless — les flux LLM longs Oracle/calibration tournent sans limite).
 * Auto-restart + survit au reboot (pm2 startup / pm2-installer / nssm).
 *
 *   npm ci && npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *
 * Les variables d'environnement sont chargées par Next lui-même depuis
 * `.env.local` (jamais committé) — pas besoin de les dupliquer ici.
 * Override du port : PORT=4000 pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "lafusee",
      // Lance le binaire Next directement (portable Windows/Linux/macOS).
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      // GTX 1080 box has 48 GB — generous headroom; restart if a run leaks.
      max_memory_restart: "4G",
      // Long LLM flows: give the process time to boot before health pings.
      min_uptime: "20s",
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3000",
      },
    },
  ],
};
