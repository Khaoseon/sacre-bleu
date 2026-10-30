# Transmission phase 5 — 30 octobre 2026

**Phase 5 livrée et clôturée après autorisation globale explicite de l’utilisateur.** Consultation privée hors ligne et sauvegarde/restauration utilisateur disponibles sur [Sacré bleu](https://sacre-bleu.pages.dev). Aucune restauration de la réserve réelle exécutée. La phase 6 et la V1.1 ne sont pas commencées. Contrats et procédure utilisateur : [PHASE5.md](PHASE5.md).

## Références de livraison

| Élément                                     | Résultat vérifié                                                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PR applicative                              | [#3](https://github.com/Khaoseon/App_reserve/pull/3), fusionnée après accord et contrôle backend                                                                                           |
| Commit approuvé et testé                    | `d2458dc90b8f56b7f4c5632363a617458f5133b9`                                                                                                                                                 |
| CI complète                                 | [41045964921](https://github.com/Khaoseon/App_reserve/actions/runs/41045964921), deux jobs réussis sur ce commit exact                                                                     |
| Fusion / publication applicative            | `6fc72c965482eea2f55ac1a17ebf85efcfc2f843`, arbre identique au commit approuvé                                                                                                             |
| Cloudflare Pages                            | `8ae63b4b-e448-47c5-b07a-313a0105a116`, [déploiement réussi](https://dash.cloudflare.com/?to=/374c76dce3f39c48f97759eac723d406/pages/view/sacre-bleu/8ae63b4b-e448-47c5-b07a-313a0105a116) |
| Version HTTPS contrôlée                     | `0.1.0 · 6fc72c965482`, compilation `2026-10-30T11:21:58.740Z`                                                                                                                             |
| Cible Supabase                              | Projet existant Free Paris `uznbnihmdzxdnlxanjcl`, PostgreSQL 17                                                                                                                           |
| Migration appliquée pendant cette livraison | **Uniquement** `20261030000100_user_restore.sql` ; sept versions désormais alignées                                                                                                        |
| Edge                                        | `product-lookup` toujours ACTIVE v3, JWT et empreinte du bundle inchangés                                                                                                                  |

## Opérations réalisées et données préservées

Les précontrôles ont confirmé main `031b968`, PR #3 propre sur `d2458dc`, CI complète verte, six versions SQL alignées et la seule septième au dry-run. Une référence fraîche a été prise immédiatement avant migration : onze empreintes de tables, définitions des anciennes fonctions, politiques, contraintes et privilèges. Aucune donnée ou empreinte privée n’est versionnée.

À 11:20 UTC, seule la migration autorisée a été appliquée, sans seed ni rôles supplémentaires. Elle ajoute deux fonctions, sans exécuter leur logique d’import. **Immédiatement après migration, les onze empreintes sont strictement identiques**, les deux comptes confirmés, la réserve et ses deux appartenances sont conservés. Les nouvelles définitions, signatures, modes de sécurité, volatilités et `search_path` correspondent aux sources approuvées. Audit sécurité/intégrité : zéro violation. Anciennes routines, politiques RLS et privilèges inchangés.

La PR #3 a ensuite été fusionnée sans marqueur d’omission de publication. Pages a publié automatiquement main ; aucune configuration ou dépense ajoutée. Les contrôles après publication conservent les dix autres empreintes exactes, notamment identités, réserve, membres, catalogue, stock, courses et journaux.

**Différence Auth examinée avant de poursuivre :** l’empreinte brute `auth.users` a évolué après publication, avec un `updated_at` au 30 octobre à 11:22:23 UTC. La clôture a été suspendue pour un diagnostic strictement en lecture seule. L’empreinte Auth de l’archive privée originale vérifiée correspondait exactement à la référence fraîche d’avant migration. Après vérification de l’intégrité du fichier d’archive, seuls ses anciens horodatages ont servi au calcul d’une projection SQL en lecture : en neutralisant uniquement `updated_at`, l’empreinte des deux comptes correspond exactement à la référence. **Tous les autres champs des comptes sont donc inchangés**, y compris identifiants, emails, empreintes de mots de passe, métadonnées et dates de connexion/confirmation. Aucun SQL de l’archive exécuté, aucune restauration, écriture de compte, correction ou rollback. L’origine précise de cet horodatage technique n’est pas attribuée à un événement de connexion ; les journaux Auth récents consultés n’en contenaient pas. Les contrôles ultérieurs réévaluent cette preuve, sans ignorer une autre différence.

La configuration Auth est également comparée au référentiel V1 vérifié : inscriptions fermées (`disable_signup=true`), zéro différence déclarée, mêmes autres paramètres et réglages publics. Aucun changement de secret, fonction Edge ou politique RLS. Aucun appel de la RPC de restauration sur Cloud, même pour un test.

## Contrôles de publication

Quinze lectures HTTPS de ressources réussies : document, callback SPA, module, CSS, manifeste, six images, worker, module Workbox et scripts publics. Six en-têtes de protection identiques au dépôt, dont CSP ciblée, nosniff, DENY et no-referrer. Manifeste Sacré bleu/plein écran/scope conservé, images servies identiques aux sources, aucune clé secrète détectée dans le bundle. Le diagnostic servi correspond au commit publié.

Quatre lectures anonymes des tables produits/stock/courses/membres sont refusées. Dans un navigateur neuf sans compte : connexion sans inscription, paramètres accessibles au clavier, version exacte, absence de débordement à 320/390/1024 px, worker contrôlant la page et relance hors ligne de l’écran public réussis. Aucun cache privé créé avant connexion, aucune requête navigateur inattendue ni erreur JavaScript. Cette vérification publique ne constitue pas une connexion aux deux comptes réels ; les fonctions privées sont couvertes par les parcours isolés et la CI ci-dessous.

Pour charger la livraison installée : terminer les saisies/demandes, quitter Scanner et fermer les autres fenêtres, puis utiliser Actualiser ou Vérifier les mises à jour. Ne pas effacer les données du navigateur pour forcer une mise à jour. Aucune nouvelle recette physique requise pendant cette livraison, conformément à l’autorisation ; ce point reste distinct de la validation PWA physique future.

## État avant publication — historique

La branche `codex/phase5-hors-ligne-restauration` partait de `031b9685d5f29636db6958d7bdc962e25e615ab5` (PR #2 fusionnée). Les constats ci-dessous décrivent les précontrôles antérieurs, remplacés par la livraison ci-dessus.

- PR #1 et #2 fusionnées, main `031b9685d5f2`.
- HTTPS 200, module `/assets/index-C-I4SmAP.js`, diagnostic public `0.1.0 · 031b9685d5f2`, compilation `2026-10-30T10:34:12.826Z`. La fusion documentaire #2 a donc bien produit un build, contrairement à l’hypothèse historique de maintien sur `62f7f92`.
- Check GitHub Cloudflare Pages réussi : déploiement `a901cbae-ab4e-4626-b488-9f3b8773d9b9`, [journal Cloudflare](https://dash.cloudflare.com/?to=/374c76dce3f39c48f97759eac723d406/pages/view/sacre-bleu/a901cbae-ab4e-4626-b488-9f3b8773d9b9). Aucune publication phase 5.
- Précontrôle Supabase en lecture seule : cible liée `uznbnihmdzxdnlxanjcl`, PostgreSQL 17, deux comptes confirmés, une réserve/deux appartenances. Audit RLS/grants/search_path et intégrité : zéro violation. Onze empreintes privées et empreinte des routines existantes enregistrées uniquement sous `.tmp/phase5`, sans données ni valeurs publiées.
- Six migrations distantes alignées. Dry-run : seule `20261030000100_user_restore.sql` proposée ; non appliquée. Aucun compte, Auth, Edge, secret, politique RLS ou forfait changé.

## Implémentation

Cache persistant scindé par environnement/compte, effacement et protection des réponses tardives, relance hors ligne avec jeton expiré, indication de date/lecture seule, reprise en ligne. Aucune file d’édition. Export utilisateur strict versionné et privé ; restauration propriétaire avec aperçu, sauvegarde préalable, confirmation, remappage des identifiants et transaction/idempotence/conflit de révision. Références OFF préservées ; garde explicite pour de futures photos privées non sauvegardables. Démonstration/Auth existantes conservées.

La migration est **additive et sans instruction de modification de données à l’application** : elle crée seulement un validateur privé et une RPC privilégiée, révoque leurs privilèges par défaut et autorise la seule RPC au rôle authenticated. Aucune table, fonction ancienne, politique RLS ou configuration Auth n’est modifiée. La RPC ne remplace des données que lorsqu’un propriétaire l’appelle explicitement ; aucun appel sur la réserve réelle n’est autorisé pendant la publication.

Le workflow GitHub ajoute un job local isolé avec reset sans seed, pgTAP, linter, types régénérés comparés, concurrence, Auth/API, SDK/ancien client, sauvegarde et navigateur phase 5. Le job applicatif/navigation/mises à jour PWA est conservé. Aucune dépendance ajoutée.

## Validations locales

- 293 tests applicatifs / 20 fichiers ; fichiers valides/invalides, bornes, doublons, liens, images, quotas, séparation/effacement du cache, réponse tardive, révocation avec effacement disque impossible et blocage des écritures.
- Base locale vierge et sept migrations ; 149 assertions pgTAP, dont refus anonymes/non vérifiés/extérieurs/membre ordinaire, copie des quantités/liens, rejeu, conflits et rollback après panne injectée **après** suppression/création.
- Dix tests de concurrence multi-connexions, dont restauration face à un ancien écrivain stock et deux restaurations simultanées du propriétaire.
- Auth/API HTTP réel : droits, replay et HTTP 409/code 40001. Parcours SDK partagé et ancien client réussi. Douze tests de sauvegarde administrative/chiffrement et inventaires (historique jusqu’à sept migrations).
- Chrome compilé, backend local réel, comptes fictifs : export/relecture, refus corrompu sans appel RPC, aperçu sans écriture, téléchargement préalable et confirmation obligatoires, égalité de tous les champs métier et liens après remappage, réponse perdue après commit/reprise sans second effet, aperçu périmé, relance PWA hors ligne, jeton expiré, reconnexion, courses en lecture seule, autre compte et déconnexion multi-onglets/hors ligne. CacheStorage sans réponse API privée, zéro requête externe/erreur JS.
- Aperçu 320/390/1024 px, mesure du débordement **intérieur** de la modale, capture fictive 320 inspectée. Première capture trop large corrigée ; aucun contrôle affaibli. Navigation/clavier/thèmes et mise à jour PWA deux versions réussies, brouillons/demandes incertaines/autre fenêtre protégés.
- Types stricts, builds local/Cloud, formatage réussis. CI complète [41045964921](https://github.com/Khaoseon/App_reserve/actions/runs/41045964921) réussie sur `d2458dc`, y compris navigation, mises à jour PWA, backend et parcours prolongé hors ligne.

## Séquence de publication préparée puis autorisée — historique

La séquence ci-dessous a été autorisée globalement par l’utilisateur puis exécutée ; ses résultats effectifs et la différence technique Auth résolue sont consignés en tête du bilan.

1. Vérifier la CI complète du commit final, la branche/main et le dry-run limité à la septième migration. Conserver l’archive administrative antérieure vérifiée ; aucune nouvelle archive privée n’est nécessaire à une migration ne faisant aucun DML. Si une sauvegarde actuelle est souhaitée, `--before-phase5` accepte exactement les six versions appliquées et cette seule migration en attente, sans contourner les gardes historiques.
2. Refaire l’audit en lecture seule et prendre les empreintes immédiatement avant l’application, pendant une fenêtre sans écritures des deux utilisateurs. Appliquer uniquement `20261030000100_user_restore.sql` sur la cible liée vérifiée. Aucun `reset`, seed, import, changement Auth/Edge/secrets/RLS.
3. Auditer les nouveaux privilèges/search_path et les sept versions, comparer les onze empreintes de tables et les routines préexistantes. Exiger l’absence de différence métier ; si une activité utilisateur intervient, examiner la différence sans restauration ni écrasement automatique. Ne pas exécuter la RPC de restauration sur Cloud pour la tester.
4. Après conformité backend, fusionner la PR validée et laisser Pages publier depuis main. Contrôler check/déploiement, diagnostic HTTPS/version, en-têtes, manifeste/worker et écran anonyme, sans mutation réelle. Documenter SHA, PR, CI, identifiant Pages et contrôles.
5. En cas de régression frontend : corriger ou republier la dernière version saine en conservant les données Auth/cache/journal. La migration additive peut rester présente, compatible avec les anciens clients. Aucun rollback de données ni import automatique.

Cet accord n’autorise aucune restauration de la réserve réelle ni suppression de données, création de compte, changement de plan, de secret, d’Auth, d’Edge ou de RLS. Il autorise la migration additive décrite puis la fusion/publication frontend déjà demandée.

## Limites et phase 6

JSON/cache locaux non chiffrés par l’app, limites de taille explicites ; copies à protéger/renouveler. Images OFF référencées seulement, aucune nouvelle capacité Storage. Pas d’import Auth, de mutation différée, de pause réelle ou de recette sur téléphones physiques. Après expiration prolongée du jeton, la reconnexion peut attendre le délai interne du SDK, environ une minute, avec consultation en lecture seule conservée. La phase 5 est clôturée ; la phase 6 et la V1.1 ne sont pas commencées. La V1 finale ne peut pas être annoncée comme physiquement validée Android/iOS sur la base de cette seule publication.

## Compléments de validation après premier push

Le premier passage Linux complet sur `1af5097` valide le job applicatif, ainsi que toutes les étapes PostgreSQL/SDK/sauvegarde du nouveau job. Le navigateur échoue en fin de déconnexion hors ligne : lecture du stockage lancée pendant le rechargement volontaire de secours de `ReserveAuth` (« Execution context was destroyed »). La recette attend désormais cette navigation avant de conserver ses assertions d’effacement ; aucun contrôle retiré.

Une régression locale supplémentaire garde un jeton expiré hors ligne pendant 32 secondes, jusqu’à la fin réelle des tentatives Auth. Échec reproduit avant correction : `INITIAL_SESSION/null` effaçait la copie alors que la session persistée restait connue. La copie est désormais conservée pour ce seul événement transitoire hors ligne, jamais pour `SIGNED_OUT` ni après déconnexion explicite. Les RPC vérifient une session disponible avant d’être envoyées, avec le même délai global de dix secondes, afin de ne pas confondre panne Auth et retrait d’appartenance. Le SDK verrouillé conserve une erreur de refresh pendant 60 secondes : le test spécifique attend au plus 75 secondes pour une véritable lecture authentifiée après reconnexion, sans effacer la copie ni augmenter les délais métier. La déconnexion reste possible pendant ce délai. Cette limite SDK est documentée ; les assertions de consultation, droits, effacement et reconnexion restent obligatoires.
