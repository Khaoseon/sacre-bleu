# Transmission phase 5 — 30 octobre 2026

**Préparation locale achevée ; publication dépendante de l’accord de migration, pas encore livrée en production.** Branche `codex/phase5-hors-ligne-restauration` issue de `031b9685d5f29636db6958d7bdc962e25e615ab5` (PR #2 fusionnée). Contrats et procédure utilisateur : [PHASE5.md](PHASE5.md).

## Production réellement constatée

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

- 291 tests applicatifs / 20 fichiers ; fichiers valides/invalides, bornes, doublons, liens, images, quotas, séparation/effacement du cache, réponse tardive, révocation avec effacement disque impossible et blocage des écritures.
- Base locale vierge et sept migrations ; 149 assertions pgTAP, dont refus anonymes/non vérifiés/extérieurs/membre ordinaire, copie des quantités/liens, rejeu, conflits et rollback après panne injectée **après** suppression/création.
- Dix tests de concurrence multi-connexions, dont restauration face à un ancien écrivain stock et deux restaurations simultanées du propriétaire.
- Auth/API HTTP réel : droits, replay et HTTP 409/code 40001. Parcours SDK partagé et ancien client réussi. Douze tests de sauvegarde administrative/chiffrement et inventaires (historique jusqu’à sept migrations).
- Chrome compilé, backend local réel, comptes fictifs : export/relecture, refus corrompu sans appel RPC, aperçu sans écriture, téléchargement préalable et confirmation obligatoires, égalité de tous les champs métier et liens après remappage, réponse perdue après commit/reprise sans second effet, aperçu périmé, relance PWA hors ligne, jeton expiré, reconnexion, courses en lecture seule, autre compte et déconnexion multi-onglets/hors ligne. CacheStorage sans réponse API privée, zéro requête externe/erreur JS.
- Aperçu 320/390/1024 px, mesure du débordement **intérieur** de la modale, capture fictive 320 inspectée. Première capture trop large corrigée ; aucun contrôle affaibli. Navigation/clavier/thèmes et mise à jour PWA deux versions réussies, brouillons/demandes incertaines/autre fenêtre protégés.
- Types stricts, builds local/Cloud, formatage obligatoires avant chaque commit de livraison. Résultat CI exact à consigner après push ; aucune validation distante supposée.

## Séquence de publication à autoriser une seule fois

1. Vérifier la CI complète du commit final, la branche/main et le dry-run limité à la septième migration. Conserver l’archive administrative antérieure vérifiée ; aucune nouvelle archive privée n’est nécessaire à une migration ne faisant aucun DML. Si une sauvegarde actuelle est souhaitée, `--before-phase5` accepte exactement les six versions appliquées et cette seule migration en attente, sans contourner les gardes historiques.
2. Refaire l’audit en lecture seule et prendre les empreintes immédiatement avant l’application, pendant une fenêtre sans écritures des deux utilisateurs. Appliquer uniquement `20261030000100_user_restore.sql` sur la cible liée vérifiée. Aucun `reset`, seed, import, changement Auth/Edge/secrets/RLS.
3. Auditer les nouveaux privilèges/search_path et les sept versions, comparer les onze empreintes de tables et les routines préexistantes. Exiger l’absence de différence métier ; si une activité utilisateur intervient, examiner la différence sans restauration ni écrasement automatique. Ne pas exécuter la RPC de restauration sur Cloud pour la tester.
4. Après conformité backend, fusionner la PR validée et laisser Pages publier depuis main. Contrôler check/déploiement, diagnostic HTTPS/version, en-têtes, manifeste/worker et écran anonyme, sans mutation réelle. Documenter SHA, PR, CI, identifiant Pages et contrôles.
5. En cas de régression frontend : corriger ou republier la dernière version saine en conservant les données Auth/cache/journal. La migration additive peut rester présente, compatible avec les anciens clients. Aucun rollback de données ni import automatique.

Cet accord n’autorise aucune restauration de la réserve réelle ni suppression de données, création de compte, changement de plan, de secret, d’Auth, d’Edge ou de RLS. Il autorise la migration additive décrite puis la fusion/publication frontend déjà demandée.

## Limites et phase 6

JSON/cache locaux non chiffrés par l’app, limites de taille explicites ; copies à protéger/renouveler. Images OFF référencées seulement, aucune nouvelle capacité Storage. Pas d’import Auth, de mutation différée, de pause réelle ou de recette sur téléphones physiques. La recette phase 6 pourra commencer après accord backend, publication phase 5 et vérification de cette livraison ; ne pas annoncer la V1 finale avant installation/relance et parcours réels Android/iOS.
