> Historical French record. Dates, commands and approval states below belong to their original phase; do not use them as current setup instructions. See the [English documentation index](README.md), [current installation guide](INSTALL.md) and [translation inventory](README.md#organization-and-translation-inventory).

# Transmission — clôture de la phase 2B

État au 27 octobre 2026. Lire d’abord `AGENTS.md`, `SPEC.md`, `PLAN.md`, `BACKEND.md` et `VALIDATION.md`. **2B finalisée localement ; ne pas commencer 2C/3 ni créer de ressource distante sans nouvelle demande.** Conserver le design validé.

## Architecture et décisions

- React/TypeScript/Vite/PWA existants. `Root.tsx` gère Auth, confirmation, réserve et partage ; `App.tsx` conserve Stock/Scanner/À acheter.
- SDK officiel dans `src/backend/client.ts`, Auth dans `auth.ts`, adaptateur `ReserveBackend` dans `adapter.ts`, erreurs françaises dans `errors.ts`. Toutes les écritures partagées passent par RPC ; lectures soumises aux RLS.
- `store.ts` conserve un snapshot privé en mémoire, relu après chaque mutation. `usePantry.ts` actualise toutes les 5 s lorsque visible, au premier plan/reconnexion, sans écouteurs dupliqués. Realtime non nécessaire à deux membres.
- Demande incertaine : UUID et paramètres en `sessionStorage`, par compte/réserve ; reprise de la même clé après rechargement, nouvelles écritures bloquées jusqu’à résolution. Aucun succès avant reçu et snapshot de révision suffisante. Déconnexion : vues privées et journal retirés.
- Scan : Ajouter/Retirer, total absolu traité, versions serveur, ajustement/annulation compensatoires ; changement ultérieur de réserve invalide le contexte. Stock +/− indépendant des courses. Inconnu créé à zéro puis mouvement ; annulation conserve sa fiche.
- Démo explicite et isolée (`storage.ts`/`demo.ts`), jamais injectée dans Supabase. Thème uniquement dans les paramètres ; thème et tri locaux.
- Trois migrations 2A conservées : catalogue/stock distincts, deux membres maximum, invitations ciblées/hachées/24 h, transactions et idempotence. Types générés : `database.generated.ts`, ne pas éditer manuellement.
- Confirmation email obligatoire, modèle local Mailpit avec fragment traité par `/auth/callback`. Secret d’invitation dans le fragment, retiré immédiatement, jamais stocké durablement. Après confirmation d’un nouveau compte, rouvrir le lien initial.

## Validé

77 tests applicatifs ; typecheck, build PWA et formatage. Parcours automatisé réel à deux comptes via SDK/Mailpit : confirmation depuis un client neuf, réserve vide/invitation, accès refusés, mouvements concurrents, scans 1 → 5 → 3 → annulation, reprise sans doublon après réponse perdue, références `photo_path` préservées et métadonnées sans réécriture du stock.

Pendant l’implémentation : 80 assertions SQL, 6 tests de concurrence, 1 parcours Auth/API historique et linter sans erreur. Non répétés à la clôture car aucune migration n’a changé. UI réelle à deux origines : partage, polling, scans, interruption/reprise de l’API locale, déconnexion/rechargement sans données privées, thèmes mobiles clair/sombre, recherche et tri. Captures `docs/screenshots/shared-mobile-*.jpg`.

## Commandes

```powershell
npm ci
npm run db:start
npm run env:local
npm run dev -- --strictPort
# Autre terminal :
npm test
npm run typecheck
npm run build
npm run format:check
npm run test:shared
```

Frontend `http://127.0.0.1:5173`, seconde session `http://localhost:5173` ou profil séparé ; Mailpit `http://127.0.0.1:55324`, API port 55321, DB 55322. Preview port 4173 autorisé pour les callbacks. `.env.local` ignoré, URL et clé publique seulement. Ne jamais afficher le JSON brut de `supabase status`, qui contient aussi des secrets locaux. `db:reset` efface la base locale : inutile pour reprendre le travail. `db:stop` conserve les volumes. Des données de test UI locales peuvent rester ; ne pas les confondre avec un catalogue de production.

## Git et sécurité

Branche `main`, `origin` = `https://github.com/Khaoseon/App_reserve.git`, visibilité **PRIVATE** vérifiée à la clôture. Le commit de clôture comprend aussi les sources 2A qui n’avaient pas encore été commitées. Identifier le commit avec `git log -1 --oneline` ; aucun push effectué lors de cette clôture. Vérifier de nouveau la visibilité avant tout push ultérieur, jamais de force push. `.env*`, `.tmp`, `.tools`, sessions et fichiers locaux Supabase exclus ; audit avant commit.

Deux refus Auto-review résolus : écoute sur toutes les interfaces abandonnée au profit de `127.0.0.1` ; test partagé interrompu par limite d’utilisation réexécuté avec succès. Aucune restriction contournée.

## Limites et suite à décider

Pas de cloud/déploiement, caméra, OFF, Storage privé complet, export/restauration partagé ou gestion avancée des membres. Photos partagées désactivées, références préservées. Pas de cache privé après fermeture ni nouvelles éditions hors ligne. Journal de reprise lié à la durée de vie de l’onglet ; contexte ajustable du scan perdu au rechargement. Effacement des cochés : commandes individuelles, sans transaction globale du lot. Métadonnées/courses : dernière valeur envoyée gagnante. Android et Safari iOS réels non validés.

Build réussi avec avertissement Vite non bloquant : bundle JS 513,09 Ko minifié, 148,03 Ko gzip. Découpage éventuel différé ; aucun blocage de fonctionnement local.

La prochaine conversation doit d’abord convenir du périmètre. Pour Cloud ultérieurement : revue migrations/RLS et sauvegardes, Auth/SMTP, URLs HTTPS exactes, modèle de confirmation et clé publique frontend, puis tests de deux identités et restauration. Aucun projet distant actuellement créé ou lié.
