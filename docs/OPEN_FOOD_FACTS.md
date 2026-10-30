# Identification des produits — phase 4

**État courant au 30 octobre 2026 :** le correctif OFF est livré (migration `20261029000100`, Edge v3), avec le même verrou partagé de six secondes, les délais/motifs détaillés et le contrat booléen ancien conservé. JWT, secrets et cinq origines inchangés. [Clôture V1](HANDOFF_V1_STABILISATION.md). Les descriptions d'attente de l'ancienne version et d'accords en attente ci-dessous sont historiques.

**Correctif post-4B préparé, non déployé :** [SCANS_SIMULTANES_OFF.md](SCANS_SIMULTANES_OFF.md). Même créneau partagé de six secondes, protocole séparant cooldown interne et refus fournisseur, délais précis sans cache d'erreur et indicateur local. Migration `20261029000100_lookup_budget_details.sql` + Edge nécessitent un accord Cloud distinct. Les délais d'au moins 60 s décrits dans l'état de phase 4 ci-dessous restent ceux de l'ancienne version, pas du correctif préparé.

Implémentation et déploiement validés le **28 octobre 2026**, depuis `ba18738`. **Phase 4 active sur le projet Supabase Free Paris existant**, après sauvegarde vérifiée et autorisation. Trois préremplissages réels validés depuis l’ordinateur sans création de fiche. Recette iPhone/Samsung restante ; phases 5/6 non commencées.

## Choix technique

| Critère        | Appel direct PWA                                                                              | Edge Function retenue                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Identification | Le navigateur contrôle le User-Agent ; sa personnalisation n’est pas fiable entre navigateurs | En-tête serveur `App_reserve/0.1.0 (https://github.com/Khaoseon)`, contact public sans révéler le dépôt privé                 |
| CORS           | Dépend des en-têtes OFF et du navigateur                                                      | Origines frontend exactes autorisées ; accès OFF serveur                                                                      |
| Sécurité       | Pas de secret OFF requis pour lire                                                            | JWT vérifié par Auth, email confirmé, compte non anonyme et appartenance RLS à une réserve ; aucune clé service-role utilisée |
| Limites        | Cache/limiteur propres à chaque navigateur                                                    | Cache mémoire + budget PostgreSQL partagé entre instances Edge et démarrages                                                  |
| Coût           | Pas d’invocation Supabase supplémentaire                                                      | Une invocation par code inconnu hors cache navigateur ; lectures Auth/RLS et RPC de budget supplémentaires                    |

L’appel direct est plus court, mais ne garantit pas l’identification demandée. Le proxy constitue le minimum retenu pour satisfaire cette exigence et partager le budget. Aucun nouveau SDK, service de cache ou abonnement n’est ajouté.

La [documentation officielle OFF](https://openfoodfacts.github.io/openfoodfacts-server/api/) recommande v3.6. L’[OpenAPI v3](https://openfoodfacts.github.io/openfoodfacts-server/api/ref-v3/) documente `fields`, `lc`, `cc` et les lectures produit. Sa source comporte encore des mentions anciennes de version ; le chemin v3.6 a aussi été vérifié par les lectures réelles ci-dessous. L’[identification OpenAPI](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/docs/api/ref/api.yaml) accepte une URL de contact.

## Contrats et parcours

- `src/productInfo.ts` : port `ProductProvider`, résultats `found/missing/unavailable`, métadonnées facultatives et validations pures. Aucun inventaire ou accès Supabase dans ce contrat.
- `src/productSearch.ts` : recherche synchrone dans le catalogue personnel confirmé, exacte puis équivalence UPC-A/EAN-13 de phase 3. Un connu rejoint immédiatement le mouvement existant ; aucun appel fournisseur, Auth ou budget pour ce code. Aucune mise à jour automatique des informations personnalisées.
- `src/productLookupClient.ts` : adaptateur frontend vers Supabase seulement. Le token reste chez Supabase. Les caches contiennent exclusivement des métadonnées publiques en mémoire, sont bornés et disparaissent à la fermeture de l’app ; aucun cache privé durable ajouté.
- `supabase/functions/product-lookup/index.ts` : point d’entrée Deno sans dépendance externe. Vérifie le token auprès de `/auth/v1/user`, puis l’appartenance via la lecture RLS de `reserve_members`. Le limiteur utilise le même JWT et la clé anon de l’environnement, jamais une clé privilégiée.
- `src/productLookupServer.ts` : fournisseur OFF indépendant de React, du scanner et de la base. URL fixe `https://world.openfoodfacts.org/api/v3.6/product/<code>`, paramètres `lc=fr&cc=ch`, redirections refusées. Aucun URL, identifiant de compte, nom de réserve ou inventaire fourni par le client n’est relayé.

Champs demandés : `code,product_name_fr,product_name,brands,quantity,categories_tags,image_front_url`. `code` sert au contrôle d’identité. Aucun ingrédient, score, nutriment ou recherche par nom. Le français prévaut ; sinon le nom générique de la fiche est proposé, quelle que soit sa langue. La Suisse est une indication de pays, sans filtrer les produits d’autres pays.

Un inconnu ouvre une courte modale « Recherche du produit… ». Le décodage est suspendu, le flux caméra reste vivant. « Saisir manuellement » est disponible immédiatement. La réponse ouvre le formulaire existant : nom obligatoire, marque/catégorie/conditionnement facultatifs et modifiables, quantité d’emballages 1 par défaut en Ajouter, 0 en Retirer. Aucun produit n’est créé avant validation.

La création partagée conserve la chaîne existante : `create_product` à zéro, puis `scan` avec la quantité choisie en Ajouter. Les UUID, reçus, reprise des demandes incertaines, compensation et relecture confirmée restent inchangés. Fermer la modale, quitter l’écran, masquer la page ou démonter l’app annule/ignore la recherche ; aucune réponse tardive ne remplace une saisie commencée. La caméra reprend la détection après fermeture/enregistrement, avec son verrou de présentation conservé. Une fiche créée par l’autre compte pendant la recherche reste protégée par l’unicité serveur : pas de fusion par nom/marque/conditionnement.

## Validation, délais et limites

Codes : chaînes de 4 à 32 chiffres, même contrat que la saisie personnelle ; la caméra conserve séparément ses contrôles EAN/UPC existants. Pas de conversion numérique ou suppression de zéros. Réponses JSON structurées, identité attendue et longueurs maximales vérifiées côté serveur puis à nouveau côté navigateur. Champs facultatifs erronés ignorés. Corps OFF limité à 100 000 octets pendant la lecture ; requête client limitée à 128 octets et au seul champ `barcode`.

Conditionnements simples ou composés strictement explicites : `500 g`, `1,5 L`, `6 × 125 g` → **750 g par emballage de stock**, `6 × 33 cl` → 1 980 ml. Pas d’arrondi approximatif : les valeurs incompatibles avec le pas de saisie de 0,01 restent vides. Un texte ambigu tel que `500 g / 300 g égouttés` reste visible pour correction, sans valeur inventée. Seuls quelques identifiants de taxonomie fiables sont associés aux catégories locales ; sinon Autres. Le nombre de sous-unités d’un multipack ne devient jamais une quantité de stock.

Délais : appel OFF 4,5 s, handler 5,5 s, fetch frontend 6 s, délai de secours du coordinateur 6,5 s. Aucune relance réseau automatique. HTTP 404 → formulaire manuel ; 429 → pause, `Retry-After` secondes/date pris en compte ; 5xx, JSON invalide, erreur réseau et expiration → formulaire manuel. Une proposition incomplète reste modifiable et exige toujours un nom.

Politique interne conservatrice : **un créneau toutes les six secondes pour tout le projet**, verrouillé transactionnellement par `claim_product_lookup`. Ce choix n’est pas une déclaration de quota contractuel OFF. Un 429 fournisseur prolonge la pause partagée (au moins 60 s, au plus 24 h) ; le navigateur applique aussi une pause entre codes différents. Le cache ne contourne pas l’autorisation : une requête Edge consomme un créneau même si son instance détient le résultat. Les codes déjà personnels et le cache navigateur évitent entièrement l’Edge.

Au 28/10/2026, l’introduction officielle indique 15 lectures produit/min/IP et des limites globales pouvant répondre 503. Recontrôler avant mise en service : ces valeurs ne sont pas codées comme une garantie durable. Une IP de sortie Supabase peut être partagée avec d’autres applications, donc le budget de ce projet ne garantit pas à lui seul l’absence de 429. Il faut conserver le repli manuel.

Caches positifs 24 h, absences 10 min, erreurs 30 s ; maximum 200 codes par instance fournisseur et 100 par instance frontend. Pas de stockage partagé du catalogue public ni de rafraîchissement en arrière-plan. Les deux comptes utilisent ensuite leur propre catalogue commun sans requête OFF.

## Photos, attribution et confidentialité

La migration `20261028000100_product_sources.sql` ajoute `products.off_barcode` et `products.off_image_url`, ainsi que la table privée du budget. Les colonnes OFF sont facultatives et contraintes. `photo_path` reste réservé aux références futures de Storage privé. `photo` reste la data URL locale des photos personnelles de la démo. Aucun bucket ou téléchargement de photo vers Supabase.

Seules des URL HTTPS du chemin `/images/products/` de `images.openfoodfacts.org`, sans paramètres, port, traversée ou identifiants, sont acceptées. Image affichée entière avec `object-fit: contain`, sans transformation du fichier ; échec de chargement ou absence → pictogramme existant. Le chargement est différé et utilise `referrerPolicy=no-referrer`. Le navigateur contacte donc le serveur d’images OFF et lui expose son IP et le chemin de l’image, sans token Supabase. La photo externe peut être retirée avant ou après enregistrement.

Sources de licence consultées : [guide officiel de réutilisation](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Le lien Creative Commons du guide OFF pointe bien vers **3.0**, pas vers 4.0.

- Base OFF : ODbL, contenus individuels : DbCL ; les métadonnées reprises conservent ces conditions, même après validation par l’utilisateur. L’attribution affiche « Open Food Facts et ses contributeurs », le lien source produit et le lien ODbL dans la fiche et sous le dernier scan ; un crédit global reste visible sur les vues contenant des produits sourcés.
- Photos : CC BY-SA 3.0 ; crédit, lien source et licence associés. Aucun recadrage ni modification de fichier par l’app. Les droits éventuels sur emballages et marques restent distincts.
- Les stocks, courses, comptes et corrections personnelles ne sont jamais transmis à OFF. Le code n’envoie aucune contribution, photo ou télémétrie à ce service. Les tableaux personnels et le suivi des mouvements restent séparés du catalogue SQL, et la provenance externe reste explicite.
- Une base dérivée publiquement utilisée peut déclencher partage à l’identique et accès à la partie dérivée (ODbL 4.4/4.6) ; une base collective a un traitement distinct (4.5). Le simple fait d’avoir une connexion privée n’est pas une exemption générale. Cette phase ne publie aucun jeu de données. Une future exportation/distribution devra conserver les licences des éléments OFF et séparer les données personnelles ; la référence source ne supprime pas les obligations éventuelles sur une base dérivée. Ne pas présenter l’ensemble du catalogue enrichi comme des données exclusivement propriétaires. Aucun besoin identifié de rendre publics les stocks personnels pour l’usage prévu.

Les pages `terms-of-use` et le wiki ODbL ont renvoyé un blocage anti-robot lors de la consultation ; le guide officiel et les textes de licences ont été lus. Le [formulaire d’usage de l’API](https://openfoodfacts.github.io/openfoodfacts-server/api/#before-you-start) est à compléter par le propriétaire avant mise en service ; aucun message, compte OFF ou formulaire externe n’a été soumis sans instruction.

## Configuration Cloud appliquée et évolutions

Ressources : **une migration additive** sur le projet Supabase existant, **une Edge Function `product-lookup`**, configuration des quatre origines locales explicitement autorisées par `OFF_ALLOWED_ORIGINS`. Aucun changement SMTP, Storage, invitation, hébergement PWA, quantité ou ligne de courses. La fonction conserve la vérification JWT plateforme en Cloud ; elle vérifie aussi le token et les droits elle-même. [Authentification Edge officielle](https://supabase.com/docs/guides/functions/auth).

Le [tarif Supabase](https://supabase.com/pricing), consulté le 28/10/2026, inclut 500 000 invocations Edge dans Free à 0 USD/mois, sous ses autres limites. L’usage de deux personnes devrait rester dans cette enveloppe ; c’est une estimation, sans changement de forfait ni garantie de coût en cas d’évolution. Les références images n’occupent pas Storage. Les lectures Auth/RLS, RPC et sorties réseau consomment les ressources du projet existant.

Après contrôles et accord, la seule migration phase 4 a été appliquée avec `supabase db push --linked --skip-vault`, puis `product-lookup` déployée via la CLI avec `verify_jwt=true`. Aucun push global de configuration ou reset/fixture Cloud. La comparaison des dix tables préexistantes à la sauvegarde a réussi juste après migration ; les huit tables applicatives préexistantes restent identiques après les recherches réelles. Résultats et limites dans `HANDOFF_4.md`. Toute évolution doit reprendre les précontrôles et respecter les autorisations ; une recette de mouvements Cloud exige toujours un accord distinct.

Les nouvelles colonnes ne sont pas envoyées pour les fiches historiques/manuelles sans provenance. La démo ne fait aucun appel OFF par défaut, car le proxy exige un compte membre. Une indisponibilité du service conserve le formulaire manuel.

## Tests reproductibles

```powershell
npm test
npm run typecheck
npm run build
npm run build:cloud
npm run format:check
npm run db:reset
npm run test:db
npm run test:db:concurrency
npm run test:db:api
npm run test:shared
npm run db:types
npm run db:lint
```

Runtime Edge local, dans un second terminal :

```powershell
npx --no-install supabase functions serve product-lookup --no-verify-jwt
npm run test:off:edge
```

L’option locale `--no-verify-jwt` permet d’exercer les refus du handler avec des tokens absents/faux ; elle ne désactive pas ses vérifications Auth. Le test n’envoie aucun code valide au fournisseur : il teste le runtime et la frontière Auth, pas OFF.

`npm run test:off:browser` utilise Chrome installé et Playwright 1.62.1 disponible comme outillage externe ; si nécessaire, `PLAYWRIGHT_PACKAGE` désigne son `package.json` absolu. Aucune dépendance npm du projet ajoutée. Le script démarre puis arrête Vite sur `127.0.0.1:5188`, utilise un contexte navigateur neuf et un fournisseur fictif ; les requêtes images sont interceptées. Le harnais de test n’entre pas dans le build de l’app.

Résultats effectivement exécutés et recette téléphone restante : `HANDOFF_4.md` et `VALIDATION.md`.

## Activation et origines effectivement autorisées

**État historique à l’activation de phase 4.** Sauvegarde chiffrée du 28 octobre vérifiée, empreintes source identiques, Free et Paris confirmés, dry-run ciblé et quatre migrations maintenant alignées. `OFF_ALLOWED_ORIGINS` vaut exactement `http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173`. Ces ports sont ceux résolus par Vite ; les quatre preflights CORS passent et une origine étrangère est refusée. Aucun joker. Seuls le navigateur de l’ordinateur et ces origines HTTP locales sont utilisables actuellement. Un accès HTTPS privé téléphone sera préparé ultérieurement avec accord et ajout de son origine exacte ; ne recréer ni certificat, ni accès LAN, ni hébergement PWA maintenant. Une future adresse HTTPS permanente relèvera de la phase d’hébergement. Recette préparée dans `TESTS_OFF_TELEPHONES.md`.

**Évolution active de phase 4B, 29 octobre 2026 :** après publication de Sacré bleu et accord explicite, `OFF_ALLOWED_ORIGINS` conserve exactement les quatre origines locales ci-dessus et ajoute `https://sacre-bleu.pages.dev`. Secret mis à jour sans modification du code fournisseur ; la plateforme retourne ensuite `product-lookup` version 2, ACTIVE, `verify_jwt=true`. Les cinq preflights passent avec origine exacte ; origine étrangère et preview refusées. POST sans token, token invalide et clé publishable comme token utilisateur : 401. Aucun nouvel appel fournisseur réel ni mouvement de stock dans ce contrôle. Auth Site URL et callback HTTPS sont également configurés ; compte-rendu dans `CLOUDFLARE_PAGES.md`.
