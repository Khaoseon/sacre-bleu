# Plan de réalisation

Chaque étape nécessite une validation avant d’élargir le périmètre. Aucun service distant n’est créé à l’étape 1.

## Étape 1 — Fondations et prototype local

Livrer React/TypeScript/Vite, trois vues mobiles, démo persistée, stock éditable, scanner par saisie, courses, documentation et tests.

Critères : démarrage local ; navigation ; boutons réellement fonctionnels ; aucune quantité négative ; épuisés conservés en bas ; recherche et tris mémorisés ; création/reconnaissance d’inconnus ; scan répété volontaire ; refus à zéro ; annulation cohérente stock/courses ; suggestions non automatiques ; erreur de stockage sans faux succès ; types, tests et compilation réussis. Vérifier la mise en page à 320/390 px et sur ordinateur. Vérifier le cache de la version compilée. L’installation réelle sur téléphone n’est pas considérée comme validée par une émulation de largeur.

## Étape 2 — Réserve partagée privée avec Supabase

### Phase 2A — Backend et sécurité : réalisée et testée localement

Trois migrations PostgreSQL, RLS et privilèges explicites, comptes Auth vérifiés, invitations ciblées/hachées/expirables, capacité de deux membres, catalogue distinct du stock, commandes de courses et transactions idempotentes de stock/scanner. Corrections et annulations compensatrices contrôlent les révisions sans restaurer un snapshot global. Aucune donnée de démonstration n’est injectée et aucun projet hébergé n’est créé.

Validation exécutée : remise à zéro locale sans seed puis migrations réussies, 80 assertions pgTAP, 6 tests multi-connexions et 1 parcours réel Auth/API ; linter Supabase sans erreur. Types TypeScript générés depuis la base et port d’accès préparé. Détails, commandes et limites dans `BACKEND.md`. La livraison de confirmation email et les callbacks UI restent à tester en 2B ; les fixtures API confirment leurs utilisateurs par SQL.

### Phase 2B — Intégration des écrans : finalisée localement

Sessions Auth persistées, inscription/confirmation email via Mailpit, création d’une réserve vide, invitation et deux membres dans les paramètres. Adaptateur SDK officiel conforme à `ReserveBackend` ; les trois écrans utilisent exclusivement les RPC en mode partagé. Démonstration explicitement séparée, sans import automatique ni double écriture.

Snapshot relu après mutation, polling toutes les cinq secondes lorsque l’application est visible, retour au premier plan/reconnexion et actualisation manuelle. Journal de demande incertaine en `sessionStorage`, isolé par compte/réserve, mêmes clés à la reprise ; aucune écriture hors ligne. Données privées en mémoire, retirées à la déconnexion. Une révision ultérieure invalide corrections/annulations du scan. Thème et tri locaux, photos partagées désactivées et références `photo_path` préservées.

Validation : parcours réel automatisé à deux comptes avec emails Mailpit et confirmation depuis un client neuf ; UI sur deux origines, scans 1 → 5 → 3 → annulation, panne réelle de l’API et reprise après rechargement sans double mouvement, thèmes mobiles et confidentialité à la déconnexion. Résultats détaillés dans `VALIDATION.md`, transmission dans `HANDOFF_2B.md`.

Limites 2B : pas de cache privé persistant après fermeture, de file d’édition hors ligne, de Storage complet, de restauration partagée ni de validation sur téléphones réels. Le passage à Cloud est traité dans l’intervention 2C ci-dessous. La caméra fait désormais l’objet de la phase 3 ci-dessous. Les paragraphes suivants rappellent les critères de l’étape 2 et ne demandent pas de recréer le backend déjà livré.

### Phase 2C — Supabase Free hébergé : validée

Sécuriser et synchroniser le dépôt strictement privé ; créer manuellement le projet Free à Paris, vérifier PostgreSQL/pgcrypto et l’exposition API ; simuler puis appliquer les trois migrations existantes après accord explicite. Configurer Auth avec confirmation obligatoire et callbacks exacts, choisir le SMTP après présentation des prérequis/coûts, isoler les environnements frontend local/Cloud sans refonte. Préparer sauvegarde externe, restauration et reprise après pause, sans maintien artificiel d’activité.

Projet `uznbnihmdzxdnlxanjcl`, migrations et réglages Auth/API appliqués après accord. Recette Cloud exécutée : deux comptes confirmés via SMTP Gmail, réserve privée et invitation, refus d’accès avant invitation, RPC stock/scanner/courses sur produit réel autorisé, synchronisation, déconnexion et reprise de session. Audits SQL complémentaires de rôle et de replay distingués des parcours HTTP/UI. Restauration technique sur base locale vierge sans réseau : dix tables contrôlées identiques par nombres de lignes/empreintes, intégrité et RLS conformes, copie jetable supprimée. Procédures dans `CLOUD.md` et `BACKUP.md`, résultats et limites dans `HANDOFF_2C.md`. Une archive externe chiffrée reste à constituer ; aucune pause réelle du projet, installation sur téléphones ou PWA HTTPS publique validée ici. Aucun seed, fixture destructive, reset distant ou développement caméra/OFF/Storage.

Après validation explicite de l’étape 1, préparer le schéma, les migrations et les opérations avant de créer des ressources. Prévoir deux comptes individuels, réserves, membres, invitation à usage unique et droits d’accès RLS. Pas de clé de service dans le client.

Implémenter les mouvements de stock transactionnels côté serveur avec identifiant d’opération unique. Un scan Ajouter et la déduction de la quantité aux courses sont validés ensemble. L’annulation devient une opération compensatrice, sans restauration globale d’un état ancien. Adapter le dépôt de données et afficher les statuts de synchronisation réels.

Critères : deux utilisateurs invités voient la même réserve ; un tiers ne peut accéder à aucune donnée ; invitations invalides/expirées refusées ; modifications concurrentes sans perte ; même requête rejouée sans double traitement ; stock jamais négatif ; refus serveur sans faux succès ; déconnexion révoquant l’accès au cache privé. Tester les politiques RLS et transactions avec une instance locale avant services distants.

## Étape 3 — Caméra et scan continu

**Implémentation et recette principale iPhone/Samsung livrées le 28 octobre 2026, cas complémentaires non réalisés explicitement documentés.** ZXing Browser 0.2.1 / ZXing JS 0.23.0 chargés sur demande, formats EAN-13/EAN-8/UPC-A, clé et stabilité vérifiées. Caméra arrière, prévisualisation, pause de détection pour inconnu/attente réseau, nettoyage des pistes et reprise explicite après arrière-plan. Verrou par présentation, autre produit stable ou retrait/représentation, répétition explicite ; mêmes RPC et journal idempotent. Saisie manuelle, thèmes et compteur conservés. Aucune migration ni phase 4. Node 24+ requis. Comparaison/architecture : `SCANNER.md` ; HTTPS privé et matrice de recette : `TESTS_TELEPHONES.md` ; contrôles exécutés : `VALIDATION.md` et `HANDOFF_3.md`. Caméra EAN-13, maintien dix secondes sans doublon, ajustements/annulation avec courses positives, interruptions/reprise et synchronisation de deux comptes validés sur les téléphones. Sélection automatique d’objectif et préférences persistantes confirmées. EAN-8/UPC-A physiques, multi-produits, réseau incertain et autres cas listés dans `VALIDATION.md` restent non réalisés ; aucun temps de lecture mesuré. Cette clôture ne certifie pas toute la matrice ni la PWA finale.

Choisir une bibliothèque maintenue après essai Android et Safari iOS sur appareils réels. Caméra conservée durant la session, permissions, autofocus, visibilité de page et libération du flux à la sortie. Pause pendant la résolution d’un inconnu ; reprise sans fermeture. Distinguer doublon involontaire et exemplaire volontaire (retrait du cadre ou commande explicite).

Critères : EAN courants reconnus sur les deux plateformes ; session multi-articles ; changement de mode visible ; retour visuel/vibration après validation effective ; reprise après refus de permission ou interruption ; pas de double mouvement en cas de réseau lent ; annulation cohérente en concurrence. Saisie manuelle conservée.

## Étape 4 — Identification Open Food Facts

**Implémentée et validée localement le 28 octobre 2026 ; activation Cloud et recette OFF sur téléphones en attente.** Fournisseur isolé v3.6, proxy Edge authentifié, budget partagé durable, cache mémoire et formulaire existant prérempli. Migration additive de provenance/image séparée de Storage, types régénérés, règles de stock conservées. 246 tests applicatifs, 104 assertions pgTAP, 7 tests concurrents, Auth/API et parcours partagé, runtime Edge et navigateur local validés. Trois lectures réelles sur staging OFF, distinctes des fixtures. Aucun déploiement ni changement de quantités Cloud. Comparaison, licences, coûts et procédure soumise à accord dans `OPEN_FOOD_FACTS.md` ; transmission dans `HANDOFF_4.md`.

Créer une interface fournisseur indépendante de l’UI et du stockage. Ordre : catalogue personnel → fournisseur OFF → formulaire manuel. Ne pas appeler le fournisseur pour un code déjà connu. Prévoir timeout, cache, résultat incomplet, indisponibilité et absence de connexion.

L’activation Cloud a depuis reçu un accord conditionnel. Précontrôles cible Paris/historique/permissions/dry-run réalisés ; application suspendue à une nouvelle sauvegarde couvrant l’état actuel. Mode de sauvegarde préalable strict préparé et testé, recette téléphone sans mutation réelle documentée dans `TESTS_OFF_TELEPHONES.md`. Free et origines exactes à reconfirmer avant activation ; aucune migration ou fonction distante appliquée à ce stade.

Vérifier à ce moment la documentation officielle, l’identification du client, les limites API, les licences de données et d’images, et l’attribution requise. Ne pas inventer de limite stable dans le code. Les quantités proposées par le fournisseur restent éditables et ne fusionnent pas deux marques ou conditionnements différents.

Critères : catalogue prioritaire ; code inconnu enrichi quand possible ; pas de dépendance dure à OFF ; création manuelle toujours possible ; code mémorisé ; attribution et limites respectées ; pas de succès de mouvement avant écriture serveur.

## Étape 5 — Hors ligne, sauvegarde et restauration

Conserver le dernier état synchronisé privé pour consultation hors ligne. Afficher la date du dernier succès et désactiver les mutations sans connexion dans cette V1 ; une file d’écritures hors ligne n’est pas requise. Gérer les mises à jour du service worker sans interruption de saisie.

Créer export JSON versionné des produits, codes, courses et photos nécessaires. Import validé avec prévisualisation, confirmation, traitement explicite des identifiants et restauration transactionnelle. Documenter la récupération si le projet Supabase gratuit est mis en pause : conserver l’export hors de Supabase, réactiver le projet si possible, sinon recréer le schéma par migrations, rétablir comptes/membres puis importer la réserve sans secrets ni identifiants d’authentification réutilisés à l’aveugle.

Critères : consultation du dernier stock après coupure ; aucune promesse de mutation hors ligne ; séparation/effacement des caches entre comptes ; export puis restauration dans un environnement vierge avec égalité des quantités et liens ; import corrompu refusé sans perte ; procédure de pause/reprise vérifiée.

## Étape 6 — Validation PWA et livraison privée

Choisir un hébergement HTTPS privé et installer depuis Android et Safari iOS sans store. Tester affichage, safe areas, clavier, contraste, navigation tactile, permissions et ouverture depuis l’écran d’accueil. Documenter la mise à jour et la récupération.

Critères : installation et relance sur les deux plateformes ; scanner et consultation en conditions réelles ; deux appareils synchronisés ; aucune donnée publique ; budget et configuration validés ; toutes les règles métier testées ; sauvegarde restaurable avant usage quotidien.
