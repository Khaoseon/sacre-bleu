# Plan de réalisation

Chaque étape nécessite une validation avant d’élargir le périmètre. Aucun service distant n’est créé à l’étape 1.

## Étape 1 — Fondations et prototype local

Livrer React/TypeScript/Vite, trois vues mobiles, démo persistée, stock éditable, scanner par saisie, courses, documentation et tests.

Critères : démarrage local ; navigation ; boutons réellement fonctionnels ; aucune quantité négative ; épuisés conservés en bas ; recherche et tris mémorisés ; création/reconnaissance d’inconnus ; scan répété volontaire ; refus à zéro ; annulation cohérente stock/courses ; suggestions non automatiques ; erreur de stockage sans faux succès ; types, tests et compilation réussis. Vérifier la mise en page à 320/390 px et sur ordinateur. Vérifier le cache de la version compilée. L’installation réelle sur téléphone n’est pas considérée comme validée par une émulation de largeur.

## Étape 2 — Réserve partagée privée avec Supabase

Après validation explicite de l’étape 1, préparer le schéma, les migrations et les opérations avant de créer des ressources. Prévoir deux comptes individuels, réserves, membres, invitation à usage unique et droits d’accès RLS. Pas de clé de service dans le client.

Implémenter les mouvements de stock transactionnels côté serveur avec identifiant d’opération unique. Un scan Ajouter et la déduction de la quantité aux courses sont validés ensemble. L’annulation devient une opération compensatrice, sans restauration globale d’un état ancien. Adapter le dépôt de données et afficher les statuts de synchronisation réels.

Critères : deux utilisateurs invités voient la même réserve ; un tiers ne peut accéder à aucune donnée ; invitations invalides/expirées refusées ; modifications concurrentes sans perte ; même requête rejouée sans double traitement ; stock jamais négatif ; refus serveur sans faux succès ; déconnexion révoquant l’accès au cache privé. Tester les politiques RLS et transactions avec une instance locale avant services distants.

## Étape 3 — Caméra et scan continu

Choisir une bibliothèque maintenue après essai Android et Safari iOS sur appareils réels. Caméra conservée durant la session, permissions, autofocus, visibilité de page et libération du flux à la sortie. Pause pendant la résolution d’un inconnu ; reprise sans fermeture. Distinguer doublon involontaire et exemplaire volontaire (retrait du cadre ou commande explicite).

Critères : EAN courants reconnus sur les deux plateformes ; session multi-articles ; changement de mode visible ; retour visuel/vibration après validation effective ; reprise après refus de permission ou interruption ; pas de double mouvement en cas de réseau lent ; annulation cohérente en concurrence. Saisie manuelle conservée.

## Étape 4 — Identification Open Food Facts

Créer une interface fournisseur indépendante de l’UI et du stockage. Ordre : catalogue personnel → fournisseur OFF → formulaire manuel. Ne pas appeler le fournisseur pour un code déjà connu. Prévoir timeout, cache, résultat incomplet, indisponibilité et absence de connexion.

Vérifier à ce moment la documentation officielle, l’identification du client, les limites API, les licences de données et d’images, et l’attribution requise. Ne pas inventer de limite stable dans le code. Les quantités proposées par le fournisseur restent éditables et ne fusionnent pas deux marques ou conditionnements différents.

Critères : catalogue prioritaire ; code inconnu enrichi quand possible ; pas de dépendance dure à OFF ; création manuelle toujours possible ; code mémorisé ; attribution et limites respectées ; pas de succès de mouvement avant écriture serveur.

## Étape 5 — Hors ligne, sauvegarde et restauration

Conserver le dernier état synchronisé privé pour consultation hors ligne. Afficher la date du dernier succès et désactiver les mutations sans connexion dans cette V1 ; une file d’écritures hors ligne n’est pas requise. Gérer les mises à jour du service worker sans interruption de saisie.

Créer export JSON versionné des produits, codes, courses et photos nécessaires. Import validé avec prévisualisation, confirmation, traitement explicite des identifiants et restauration transactionnelle. Documenter la récupération si le projet Supabase gratuit est mis en pause : conserver l’export hors de Supabase, réactiver le projet si possible, sinon recréer le schéma par migrations, rétablir comptes/membres puis importer la réserve sans secrets ni identifiants d’authentification réutilisés à l’aveugle.

Critères : consultation du dernier stock après coupure ; aucune promesse de mutation hors ligne ; séparation/effacement des caches entre comptes ; export puis restauration dans un environnement vierge avec égalité des quantités et liens ; import corrompu refusé sans perte ; procédure de pause/reprise vérifiée.

## Étape 6 — Validation PWA et livraison privée

Choisir un hébergement HTTPS privé et installer depuis Android et Safari iOS sans store. Tester affichage, safe areas, clavier, contraste, navigation tactile, permissions et ouverture depuis l’écran d’accueil. Documenter la mise à jour et la récupération.

Critères : installation et relance sur les deux plateformes ; scanner et consultation en conditions réelles ; deux appareils synchronisés ; aucune donnée publique ; budget et configuration validés ; toutes les règles métier testées ; sauvegarde restaurable avant usage quotidien.
