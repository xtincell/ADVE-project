-- Normalisation des roles User pour aligner sur src/proxy.ts COCKPIT_ROLES/CREATOR_ROLES.
--
-- Contexte : pré-`a0667fb` (feat hub /portals + role gates ouverts), tout user qui
-- n'avait pas un role exactement listé dans le proxy était redirigé sur /unauthorized.
-- Le code post-`a0667fb` ouvre Cockpit + Creator à un set étendu, mais les comptes
-- existants peuvent avoir des roles legacy hors-liste qui causent encore le blocage.
--
-- Stratégie : "open by default" — tout role NULL ou hors set canonique → 'USER'.
-- Les roles canoniques sont préservés intacts. Aucun user perd d'accès, certains
-- en gagnent (ce qui correspond à l'intent du commit a0667fb).
--
-- Idempotent : ré-exécution = no-op (le set canonique inclut déjà 'USER').

UPDATE "User"
SET role = 'USER'
WHERE role IS NULL
   OR role NOT IN (
     'ADMIN',
     'OPERATOR',
     'USER',
     'FOUNDER',
     'BRAND',
     'CLIENT_RETAINER',
     'CLIENT_STATIC',
     'CREATOR',
     'FREELANCE',
     'AGENCY'
   );

-- Vérification post-update : aucun role hors canon ne devrait subsister.
-- Cette query devrait retourner 0 lignes après la migration (commentée car
-- Prisma migrate ne supporte pas SELECT, mais utile pour audit manuel) :
--
-- SELECT role, COUNT(*) FROM "User"
-- WHERE role NOT IN ('ADMIN','OPERATOR','USER','FOUNDER','BRAND','CLIENT_RETAINER','CLIENT_STATIC','CREATOR','FREELANCE','AGENCY')
-- GROUP BY role;
