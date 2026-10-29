# Transmission — préparation de la phase 4B

Clôture du **29 octobre 2026**, depuis `feda7f3`. **Phase 4 terminée ; phase 4B non commencée.** Cible demandée : **Cloudflare Pages Free**. Aucun projet, domaine ou configuration Cloudflare créé ici.

## État à conserver

- Dépôt **privé** `Khaoseon/App_reserve`, branche `main`. Lire `AGENTS.md`, `docs/SPEC.md`, `docs/PLAN.md`, `HANDOFF_4.md` et `OPEN_FOOD_FACTS.md`.
- Frontend statique React 19 / TypeScript strict / Vite 8, PWA `vite-plugin-pwa`, ZXing différé. Métier pur : `src/model.ts`, adaptateur : `src/backend/`, démo séparée.
- Supabase **Free Paris**, `app-reserve`, URL `https://uznbnihmdzxdnlxanjcl.supabase.co`. Quatre migrations appliquées, dernière `20261028000100_product_sources.sql`. Deux membres, Auth email confirmé, lectures RLS et mutations RPC idempotentes ; aucune migration nécessaire pour héberger le frontend.
- Edge OFF v3.6 `product-lookup` active, **JWT conservé**, Auth/appartenance contrôlés. Catalogue prioritaire, propositions validées manuellement ; attribution ODbL/DbCL et photos CC BY-SA 3.0 à préserver.
- Sauvegarde chiffrée vérifiée avant migration le 28 octobre ; empreintes comparées avant/après. Archives hors Git ; détails dans `HANDOFF_4.md`.

## Paramètres de build à reprendre

| Paramètre                               | Valeur issue du projet                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Racine                                  | Racine du dépôt                                                                                                         |
| Runtime                                 | **Node.js 24+** (`package.json`) ; confirmer sa prise en charge et le réglage Cloudflare dans la prochaine conversation |
| Installation                            | `npm ci` ; conserver `package-lock.json`                                                                                |
| Build de production                     | **`npm run build:cloud`**                                                                                               |
| Répertoire à publier                    | **`dist-cloud`** uniquement ; `dist` correspond au mode local/démo                                                      |
| Variables frontend nécessaires au build | `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`                                                                  |

Utiliser l’URL ci-dessus et la clé **publishable** existante. `VITE_*` est intégré au JavaScript public : aucun secret/service-role, mot de passe DB ou token administratif. `.env*` reste hors Git. **Ne pas utiliser `npm run build`** : il peut produire une démo sans backend configuré.

## Dépendances de l’origine HTTPS future

Aujourd’hui, Auth autorise les callbacks `/auth/callback` et OFF les quatre seules origines : `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`, `http://127.0.0.1:4173`. Aucun HTTPS téléphone ou permanent configuré.

Dans la **nouvelle conversation seulement**, choisir l’origine HTTPS canonique puis approuver les changements exacts : Site URL, redirection Auth `${origine}/auth/callback`, ajout à `OFF_ALLOWED_ORIGINS`, maintien éventuel des origines locales. Préserver les fragments `#confirm=…` / `#invite=…` et le retour SPA ; prévoir une nouvelle connexion sur la nouvelle origine. Conserver SMTP, comptes, schéma et JWT.

## Points à vérifier avant publication

1. Vérifier documentation officielle Cloudflare, Free/runtime, accès au compte et au seul dépôt concerné. Choisir domaine et conditions de publication avant création ; aucun coût sans accord.
2. **Dépôt privé ≠ site privé** : décider de la restriction d’accès. Auth/RLS restent indispensables ; publier seulement `dist-cloud`, jamais sources, `.env*`, archives ou données personnelles.
3. Séparer production/previews, variables et origines autorisées ; aucun joker CORS ou accès automatique des previews au backend réel.
4. Vérifier HTTPS, fallback SPA/Auth, manifeste/icônes, worker, ZXing et images OFF ; en-têtes compatibles avec caméra/PWA. Contrôler le build réellement servi : un ancien cache a déjà nécessité de rouvrir l’onglet.
5. Tester OFF avec codes publics **absents du catalogue**, puis fermer sans enregistrer. Un connu applique un mouvement : toute donnée/écriture de test Cloud exige un accord distinct. Fixtures exclusivement locales.
6. OFF iPhone/Samsung reste à tester selon `TESTS_OFF_TELEPHONES.md` ; phase 3 caméra validée, installation PWA finale non certifiée. Aucun HTTPS téléphone actif.

## Commandes utiles, à exécuter selon les changements

```powershell
npm ci
npm run build:cloud
npm run preview:cloud -- --strictPort
npm test
npm run typecheck
npm run format:check
```

Preview : `127.0.0.1:4173` ; développement : `npm run dev:cloud -- --strictPort`, port 5173. Tests acquis et limites détaillés dans `HANDOFF_4.md` : aucun besoin de tout rejouer pour cette transmission. Hors périmètre : Storage privé, hors ligne privé, restauration utilisateur, refonte métier et **phase 5**.
