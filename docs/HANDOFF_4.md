# Transmission — phase 4 Open Food Facts

État au **28 octobre 2026**. Base de départ `ba18738`. **Phase 4 déployée après autorisation sur Supabase Free Paris ; parcours OFF réel validé depuis le navigateur de l’ordinateur.** Recette iPhone/Samsung encore à effectuer. Aucun début des phases 5/6.

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

## Périmètre Cloud et validation téléphone

Une migration additive et la fonction `product-lookup` sont désormais appliquées sur le projet existant après tous les précontrôles ; détails ci-dessous. Aucun changement SMTP, administration de comptes, Storage, donnée de test Cloud, quantité réelle ou course. Dépôt conservé privé et sauvegardes/secrets/archives préexistants préservés.

L’utilisateur a autorisé les quatre seules origines locales HTTP des ports 5173/4173. Aucune origine HTTPS téléphone actuellement active, aucun joker, certificat, accès LAN ou hébergement PWA créé. Free confirmé dans le Dashboard ; aucun changement de forfait ni ressource payante. Détails dans `OPEN_FOOD_FACTS.md`.

Après activation approuvée : recette privée iPhone/Samsung avec un nouveau code, proposition/correction/photo absente ou présente, reprise caméra sans réactivation, deuxième code, connu suivant sans OFF, fermeture/recherche lente et repli manuel. Les essais de quantités Cloud demandent un périmètre jetable autorisé et un état initial/restauré explicite. Les validations physiques de phase 3 restent acquises ; elles ne valent pas validation OFF sur téléphone. Aucune mesure de latence ou installation PWA finale revendiquée.

Les serveurs Vite temporaires sont arrêtés (aucune écoute sur 5178/5188), ainsi que le conteneur Edge ajouté pour la recette ; les cinq conteneurs de base préexistants sont conservés. Le dossier temporaire dédié aux essais OFF est supprimé après vérification de son chemin. Aucun certificat ou règle réseau créé.

## Historique préalable — première suspension du 28 octobre

L’utilisateur autorise la migration unique et la fonction Edge uniquement après vérification de la cible Free/Paris, de l’historique, des permissions, d’une sauvegarde actuelle et du dry-run. Aucune création de test Cloud, modification de quantité/courses/compte/SMTP ou nouvelle ressource payante autorisée. En cas d’anomalie préalable, arrêter le déploiement.

Contrôles réalisés en lecture seule :

- CLI liée à `uznbnihmdzxdnlxanjcl`, nom `app-reserve`, région `eu-west-3`, état `ACTIVE_HEALTHY`, PostgreSQL 17.11 ; correspondance à la cible historique de Paris. Le forfait Free reste à reconfirmer dans les métadonnées de facturation avant activation ; la CLI consultée ne le retourne pas.
- Trois versions distantes `20261026000100`, `20261026000200`, `20261026000300` alignées ; seule `20261028000100` en attente. Dry-run : uniquement `20261028000100_product_sources.sql`, sans anomalie signalée ; rien appliqué.
- RLS active sur les cinq tables publiques ; RPC existante en `security definer` avec `search_path` vide, exécution accordée à authenticated et refusée à anon. Le corps distant de `mutate_reserve` correspond exactement à la migration historique. La nouvelle migration ajoute deux colonnes nullable et le budget privé, sans DROP/TRUNCATE ou réécriture de données existantes ; les branches de stock/courses/scanner/compensation sont identiques. Les droits du budget sont explicitement révoqués et sa RPC vérifie Auth et appartenance.
- **Blocage sauvegarde :** l’unique archive documentée est celle du 27 octobre, antérieure aux changements constatés en base le 28 octobre. Elle ne couvre pas l’état actuel. L’utilisateur a demandé une **nouvelle sauvegarde**. Aucune migration, fonction ou configuration distante appliquée.

L’outil de sauvegarde est adapté à ce prérequis : option stricte `--before-phase4`, trois migrations appliquées seulement dans l’archive, empreintes des dix tables comparées avant/après export et inscrites dans le reçu privé. Toute autre divergence reste refusée. Après phase 4, le mode normal inclut aussi le budget technique. Huit tests synthétiques de sauvegarde/GnuPG réussis, requête d’empreintes contrôlée sur la base locale, sans export Cloud à ce stade. La phrase secrète sera saisie uniquement par l’utilisateur dans son terminal personnel. Commande dans `SAUVEGARDE_CHIFFREE.md`.

Ces contrôles ont ensuite été complétés lors de la reprise ci-dessous. La procédure de recette physique reste dans `TESTS_OFF_TELEPHONES.md`, sans création ni mouvement sur les données Cloud réelles sans nouvel accord distinct.

## Déploiement et contrôle Cloud effectivement réalisés

L’utilisateur confirme une nouvelle sauvegarde vérifiée et demande la reprise, puis autorise explicitement les origines locales en attendant une future recette HTTPS privée.

- Archive `app-reserve-2026-10-28T21-39-41Z-7f587fcb.json.gz.gpg`, 25 770 octets, créée à 21:39:41 UTC et vérifiée à 21:39:47 UTC par saisie indépendante de l’utilisateur. Fichiers `.sha256` et `.verification.json` présents ; empreinte du fichier identique à chacun. Reçu conforme : bon projet, trois migrations appliquées, phase 4 seule en attente, onze fichiers internes et vérifications de chiffrement réussies. Aucun déchiffrement par l’agent ni secret demandé.
- Les dix empreintes source du reçu correspondent exactement à la base Cloud avant mutation, contrôle répété immédiatement avant application. CLI et Dashboard confirment `app-reserve`, `uznbnihmdzxdnlxanjcl`, Paris `eu-west-3`, PostgreSQL 17.11, état Healthy ; Dashboard de l’organisation : **Free plan usage**.
- Historique, permissions et dry-run revérifiés : seule migration `20261028000100_product_sources.sql`. Application avec `db push --linked --skip-vault` ; les quatre migrations sont maintenant alignées. Comparaison juste après : les dix tables préexistantes sont identiques à la sauvegarde, en projetant les anciennes colonnes de `products` ; les deux nouvelles colonnes sont toutes nulles. RLS, refus des écritures directes, droits de la table privée et `search_path` vide confirmés. Aucune fixture Cloud.
- Une seule fonction déployée : `product-lookup`, version 1, état **ACTIVE**, **verify_jwt=true** confirmé par la CLI distante et déclaré dans `supabase/config.toml`. Contrôles Auth, email confirmé, non-anonymat, appartenance RLS, code strict et URL OFF fixe conservés. Aucun autre réglage Cloud appliqué.
- `OFF_ALLOWED_ORIGINS` vaut exactement `http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173`. Ports résolus par la configuration Vite installée : 5173 et 4173. Les quatre preflights donnent 204 avec l’origine exacte ; origine étrangère 403 sans autorisation CORS ; POST sans token, token invalide ou clé publishable utilisée comme token utilisateur : 401.

### Parcours réel ordinateur → Edge Cloud → OFF production

Preview du build Cloud temporaire sur **127.0.0.1:4173 seulement**, sans écoute LAN. Connexion effectuée par l’utilisateur avec son compte existant ; aucun identifiant lu ou saisi par l’agent. Un ancien service worker affichait d’abord le scanner simulé : fermeture/réouverture de l’onglet a activé le build actuel en conservant la session. Aucun code soumis dans l’ancienne version, aucun développement de gestion du cache de phase 5.

Les trois codes ci-dessous ont été confirmés absents du catalogue en lecture seule **avant** saisie, pour éviter le mouvement automatique d’un produit connu. Caméra non activée ; formulaires ouverts puis fermés sans enregistrer.

| Code            | Résultat affiché dans le formulaire                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `3017620422003` | Nutella ; Nutella/Ferrero ; texte source `400 g e`, champ numérique laissé vide/à vérifier ; photo publique chargée et attribution visible |
| `3274080005003` | « isabelle » ; Cristaline ; 1 500 ml proposés ; référence photo et attribution présentes                                                   |
| `7613034626844` | Céréales Chocapic ; Nestlé/Chocapic ; 430 g proposés ; photo publique chargée et attribution visible                                       |

Quantité initiale proposée 1 ; correction du nom Nutella essayée puis abandonnée avec Fermer. Le nom source Cristaline illustre une fiche imparfaite, sans correction automatique inventée. Le suffixe `e` reste hors du parseur conservateur et exige une vérification manuelle. Pas de création, mouvement, ajustement, annulation ou course réelle exécuté. Les huit tables applicatives préexistantes correspondent toujours aux empreintes de sauvegarde après les essais ; les métadonnées normales de connexion Auth ne sont pas utilisées pour cette dernière comparaison. Seul le budget technique neuf est mis à jour par les lectures OFF.

### Régressions et limites après déploiement

Base locale recréée sans seed : **104 assertions pgTAP, 7 tests de concurrence, Auth/API et parcours SDK/Mailpit partagé réussis** ; types régénérés sans différence et linter SQL sans erreur. **246 tests applicatifs**, TypeScript strict, builds local/Cloud, parcours navigateur fictif 390/320 px et deux tests du serveur téléphone réussis. Les tests d’écriture, annulation, ajustement, stock/courses et création/reconnaissance suivante restent dans cet environnement isolé.

La réussite des trois préremplissages valide le chemin authentifié réel et les images indiquées, pas la caméra physique, une écriture Cloud post-déploiement ou tous les rôles de comptes sur le réseau. Les accès non-membre/unverified, erreurs 404/429/5xx et pannes restent couverts par les suites locales et fixtures, sans compte ou charge Cloud de test. OFF sur iPhone/Samsung reste à valider ultérieurement après accord pour HTTPS privé et origine exacte ; ne pas scanner de produit connu ni enregistrer une fiche dans la réserve réelle sans périmètre autorisé. Phases 5/6 non commencées.

Clôture de la recette ordinateur : deux onglets de contrôle fermés, preview arrêtée, aucune écoute résiduelle constatée sur 4173/5178/5188. Scripts temporaires de contrôle supprimés après vérification du chemin ; archives chiffrées et fichiers associés conservés intacts. Aucun certificat, règle réseau, tunnel ou hébergement PWA créé. La fonction Cloud reste active avec la liste CORS autorisée.
