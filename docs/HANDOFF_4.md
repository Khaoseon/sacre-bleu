# Transmission — phase 4 Open Food Facts

État au **28 octobre 2026**. Base de départ `ba18738`. **Phase 4 implémentée et validée localement ; activation Cloud en attente d’accord explicite.** Aucun début des phases 5/6.

## Livré

- Port fournisseur indépendant, OFF v3.6 via Edge authentifiée et URL fixe ; noms français prioritaires, marque, conditionnement, catégorie exploitable et image facultative.
- Catalogue personnel prioritaire, sans nouvel appel pour les produits connus ; pas d’écrasement de personnalisations ou de fusion par ressemblance.
- Pause de détection et chargement discret ; formulaire existant prérempli/corrigeable, saisie manuelle immédiate, quantité Ajouter 1 ajustable. Annulation/ignorance des résultats tardifs et reprise du scanner avec flux conservé.
- Création et mouvement par les RPC existantes, reçu et snapshot avant succès ; idempotence, compensation stock/courses et demandes incertaines conservées.
- Migration additive `20261028000100_product_sources.sql` : provenance/image séparées de `photo_path`, budget partagé durable et RPC autorisée. Pas de changement des règles de stock. Types régénérés avec `npm run db:types`.
- Timeouts, caches publics bornés en mémoire, pause 429 partagée, absence/erreur/fiche incomplète ; codes chaînes et zéros préservés. Conditionnement composé normalisé en contenu total d’un emballage, sans changer le nombre d’emballages en stock.
- Attribution ODbL/DbCL et photos CC BY-SA **3.0** documentées et visibles. Aucun token ou inventaire envoyé à OFF. Aucun SDK/dépendance ajouté, lockfile conservé.

Architecture, limites, licences et procédure de mise en service : [OPEN_FOOD_FACTS.md](OPEN_FOOD_FACTS.md).

## Vérifications automatiques exécutées

- **246 tests applicatifs / 16 fichiers** : catalogue prioritaire, résultats reconnus/absents/incomplets, normalisation, validation hostile, photos/pictogramme, HTTP 404/429/5xx, cache/pause, réseau/annulation, plusieurs codes, fermeture, catalogue après correction. Les tests stock/courses/annulations de référence passent aussi.
- Base locale vierge, sans seed, quatre migrations : **104 assertions pgTAP**, **7 tests de concurrence**, **1 parcours Auth/API** et **1 parcours partagé réel à deux comptes via SDK/Mailpit**. Le parcours partagé conserve source/image et `photo_path` indépendants ; correction de métadonnées, scans 1 → 5 → 3 → annulation et synchronisation conservés. Linter SQL sans erreur.
- **1 test du runtime Edge local réel**, image `supabase-edge-runtime:v1.77.8` / Deno 2.1.4 : anonyme/token invalide/non-membre refusés, membre accepté jusqu’à la validation stricte, URL arbitraire/origine refusées. Aucun appel OFF dans ce test.
- **1 parcours navigateur Chrome automatisé**, fournisseur fictif : stock 2/courses 5 → scan 3/4 → annulation 2/5 ; préremplissage nom/marque/750 g/quantité 1 ; correction nom/marque/500 g/quantité 3 ; scan suivant 4 sans nouvel appel ; fermeture puis résultat tardif ignoré ; absence et saisie manuelle pendant attente. Contrôle à 390 et 320 px sans débordement horizontal ; photo en erreur remplacée par le pictogramme. Pas de caméra physique dans ce test.
- TypeScript strict, builds local/Cloud, formatage et `git diff --check`. Avertissement Vite de chunk principal > 500 Ko conservé (~535 Ko, ~155 Ko gzip), lecteur différé inchangé (~478 Ko, ~125 Ko gzip).

## Appels OFF réels distincts

Trois GET espacés, non destructifs et identifiés, vers **l’environnement officiel de test** `world.openfoodfacts.net/api/v3.6/product`, conformément à la consigne OFF de tester sur staging. Champs réduits, `lc=fr`, `cc=ch`. Aucun inventaire ou identifiant Supabase transmis.

| Code public     | HTTP | Résultat staging observé                                                                   |
| --------------- | ---- | ------------------------------------------------------------------------------------------ |
| `3017620422003` | 200  | Nutella, marque Nutella ; conditionnement/photo absents dans la réponse sélectionnée       |
| `3274080005003` | 200  | « isabelle », Cristaline, 1 500 ml ; montre que le nom fournisseur doit rester corrigeable |
| `7613034626844` | 200  | Céréales Chocapic, Nestlé/Chocapic, 430 g                                                  |

Ces fiches ne sont pas des fixtures automatisées et n’ont pas été enregistrées dans une réserve. Pas d’essai de charge, de 429 volontaire, de comparaison d’exhaustivité staging/production ni de lecture des fiches production. Les photos disponibles et erreurs sont couvertes par fixtures et interception navigateur, pas par une photo réellement obtenue lors de ces trois lectures. Le test réseau initial dans le sandbox a échoué ; les trois lectures ont ensuite réussi avec accès réseau autorisé.

## Cloud et validation téléphone restantes

Aucune migration distante, fonction déployée, nouvelle ressource, modification Auth/SMTP/Storage ou quantité réelle modifiée. Dépôt conservé privé et sauvegardes/secrets/archives préexistants préservés. La fonction non déployée laisse actuellement le formulaire manuel en Cloud.

Accord requis pour appliquer la migration et déployer `product-lookup` dans le projet existant, puis autoriser les origines HTTPS exactes. Free inclut actuellement 500 000 invocations ; coût supplémentaire attendu nul pour deux personnes dans ses quotas, à revérifier avant activation. Détails et liens officiels dans `OPEN_FOOD_FACTS.md`. Aucun tunnel ou hébergement public nécessaire à cette demande.

Après activation approuvée : recette privée iPhone/Samsung avec un nouveau code, proposition/correction/photo absente ou présente, reprise caméra sans réactivation, deuxième code, connu suivant sans OFF, fermeture/recherche lente et repli manuel. Les essais de quantités Cloud demandent un périmètre jetable autorisé et un état initial/restauré explicite. Les validations physiques de phase 3 restent acquises ; elles ne valent pas validation OFF sur téléphone. Aucune mesure de latence ou installation PWA finale revendiquée.

Les serveurs Vite temporaires sont arrêtés (aucune écoute sur 5178/5188), ainsi que le conteneur Edge ajouté pour la recette ; les cinq conteneurs de base préexistants sont conservés. Le dossier temporaire dédié aux essais OFF est supprimé après vérification de son chemin. Aucun certificat ou règle réseau créé.

## Précontrôles d’activation Cloud — autorisation conditionnelle du 28 octobre

L’utilisateur autorise la migration unique et la fonction Edge uniquement après vérification de la cible Free/Paris, de l’historique, des permissions, d’une sauvegarde actuelle et du dry-run. Aucune création de test Cloud, modification de quantité/courses/compte/SMTP ou nouvelle ressource payante autorisée. En cas d’anomalie préalable, arrêter le déploiement.

Contrôles réalisés en lecture seule :

- CLI liée à `uznbnihmdzxdnlxanjcl`, nom `app-reserve`, région `eu-west-3`, état `ACTIVE_HEALTHY`, PostgreSQL 17.11 ; correspondance à la cible historique de Paris. Le forfait Free reste à reconfirmer dans les métadonnées de facturation avant activation ; la CLI consultée ne le retourne pas.
- Trois versions distantes `20261026000100`, `20261026000200`, `20261026000300` alignées ; seule `20261028000100` en attente. Dry-run : uniquement `20261028000100_product_sources.sql`, sans anomalie signalée ; rien appliqué.
- RLS active sur les cinq tables publiques ; RPC existante en `security definer` avec `search_path` vide, exécution accordée à authenticated et refusée à anon. Le corps distant de `mutate_reserve` correspond exactement à la migration historique. La nouvelle migration ajoute deux colonnes nullable et le budget privé, sans DROP/TRUNCATE ou réécriture de données existantes ; les branches de stock/courses/scanner/compensation sont identiques. Les droits du budget sont explicitement révoqués et sa RPC vérifie Auth et appartenance.
- **Blocage sauvegarde :** l’unique archive documentée est celle du 27 octobre, antérieure aux changements constatés en base le 28 octobre. Elle ne couvre pas l’état actuel. L’utilisateur a demandé une **nouvelle sauvegarde**. Aucune migration, fonction ou configuration distante appliquée.

L’outil de sauvegarde est adapté à ce prérequis : option stricte `--before-phase4`, trois migrations appliquées seulement dans l’archive, empreintes des dix tables comparées avant/après export et inscrites dans le reçu privé. Toute autre divergence reste refusée. Après phase 4, le mode normal inclut aussi le budget technique. Huit tests synthétiques de sauvegarde/GnuPG réussis, requête d’empreintes contrôlée sur la base locale, sans export Cloud à ce stade. La phrase secrète sera saisie uniquement par l’utilisateur dans son terminal personnel. Commande dans `SAUVEGARDE_CHIFFREE.md`.

Après réception du chemin de la nouvelle archive vérifiée : vérifier son SHA-256 et son reçu, comparer les empreintes à la base actuelle, reconfirmer Free et les origines HTTPS exactes, puis refaire historique/dry-run avant toute mutation distante. L’autorisation conditionnelle reste acquise ; elle ne vaut pas constat de réussite de ces contrôles. Recette iPhone/Samsung préparée dans `TESTS_OFF_TELEPHONES.md`, sans création ni mouvement sur les données Cloud réelles.
