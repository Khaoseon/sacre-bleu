# Rapport de clôture — phase 2C

**27 octobre 2026 — phase 2C terminée.** Supabase Cloud est connecté et validé pour les deux comptes, en conservant le fonctionnement local. La PWA reste consultée depuis cet ordinateur : aucun hébergement public n’a été déployé.

## Réalisé

- **Git sécurisé et synchronisé** : dépôt `Khaoseon/App_reserve` resté privé, historique audité, commit 2B puis changements 2C poussés sans forcer. Environnements, métadonnées CLI, clés, données et captures réelles exclus des commits.
- **Supabase Free à Paris** : projet `app-reserve`, PostgreSQL 17.11 et pgcrypto compatibles. Trois migrations existantes revues, simulées puis appliquées après accord, sans seed, reset distant ni modification inutile du backend. Historique et contraintes contrôlés.
- **Accès privés** : API limitée à `public`, schéma `private` inaccessible, RLS et privilèges RPC contrôlés. Le second compte connecté ne voyait pas la réserve avant invitation ; assertions SQL complémentaires de refus réussies. Une fois invité, il est membre, le premier compte reste propriétaire.
- **Auth et emails** : SMTP Gmail configuré personnellement, modèle de confirmation appliqué, confirmation email maintenue obligatoire. Deux comptes confirmés, connexions réelles, session persistante et retrait des données privées à la déconnexion vérifiés.
- **Frontend séparé** : `.env.local` pour Docker, `.env.cloud.local` pour le Cloud, URL publique et clé publishable seulement. Modes et builds distincts, sessions isolées par projet, démo conservée séparément. Design et architecture métier conservés.
- **Recette métier réelle** : produit autorisé créé, stock à zéro conservant sa fiche, réapprovisionnement, ajouts depuis les deux sessions, synchronisation, scanner par saisie, total 1 → 5 → 3 → annulation, déduction/restauration des courses et refus d’un retrait à zéro. Replay SQL d’une intention enregistrée sans nouvel effet. La seule course d’essai a été supprimée après accord ; le produit est resté à sa quantité initiale.
- **Reprise préparée et éprouvée** : procédure d’export, copie chiffrée externe, restauration et reprise après pause documentée. Après accord spécifique, les données nécessaires ont été exportées en mémoire puis restaurées sur une base locale vierge isolée en RAM. Dix tables contrôlées identiques par nombre de lignes et empreintes ; intégrité, rôles et RLS conformes. Copie jetable supprimée, aucun dump conservé.

## Validations

81 tests applicatifs réussis ; TypeScript strict, builds local/Cloud et formatage réussis. Sur une base locale vierge distincte : 80 assertions pgTAP, six tests de concurrence, parcours Auth/API et partagé avec Mailpit, génération des types identique et linter sans erreur. Base de travail locale 2B conservée.

Sur Cloud : huit tables RLS, quatorze fonctions applicatives, 47 contraintes et cinq politiques contrôlées, aucune violation finale. Les tests SQL de rôle/replay sont distingués des connexions et parcours UI réels : aucune perte de réponse HTTP Cloud ni mesure précise du chevauchement des transactions Cloud n’est revendiquée.

## Utilisation et limites

Lancer `npm run dev:cloud -- --strictPort`, ou `npm run build:cloud` puis `npm run preview:cloud -- --strictPort`. Preview : `http://localhost:4173/` pour le propriétaire ; `http://127.0.0.1:4173/` pour une session d’origine distincte. Le membre a été déconnecté à la fin du test de confidentialité et peut se reconnecter normalement.

**Complément du 27 octobre 2026 : première archive durable chiffrée créée hors Git et Supabase, puis déchiffrée et vérifiée.** Procédure répétable dans `SAUVEGARDE_CHIFFREE.md`. La copie sur un second support reste à réaliser par l’utilisateur. La répétition de restauration 2C reste valable et n’a pas été relancée. La reprise après pause est documentée mais aucune pause réelle du projet actif n’a été provoquée. La restauration SQL a été vérifiée, pas une nouvelle connexion HTTP sur une instance Auth restaurée.

Pas de caméra réelle, Open Food Facts, Storage privé/photos, cache privé persistant hors ligne, import utilisateur ou déploiement HTTPS public dans cette phase. Android et Safari iOS réels restent à valider. Après un scan refusé à zéro, le contexte ajustable est retiré ; le stock est resté correct et a été rétabli par une commande normale. Aucun chantier de phase suivante démarré.

Détails : `HANDOFF_2C.md`, `VALIDATION.md`, `CLOUD.md` et `BACKUP.md`.
