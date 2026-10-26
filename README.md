# Réserve · App_reserve

Prototype local d’une PWA de gestion de réserve alimentaire, en français et pensée pour le téléphone. **Étape 1 uniquement : aucune authentification, caméra, API Open Food Facts ou synchronisation distante.**

## Installer et lancer

Prérequis : Node.js **22.12 ou plus récent** (Node 24 LTS conseillé), npm. Depuis le dossier qui contient le projet :

```powershell
cd App_reserve
npm ci
npm run dev
```

Ouvrir l’adresse affichée par Vite, habituellement **http://127.0.0.1:5173/**. Le serveur écoute seulement sur l’ordinateur local.

Pour tester la version compilée, le manifeste et le cache PWA :

```powershell
npm run build
npm run preview
```

Ouvrir **http://127.0.0.1:4173/**. Le service worker est activé uniquement en production/preview ; visiter une première fois en ligne, puis recharger pour tester le cache. Les origines `:5173` et `:4173` possèdent des données distinctes.

## Ce qui fonctionne

- **Stock** : huit produits d’exemple, recherche insensible aux accents et à la casse, filtres de catégorie, tri alphabétique ou récent mémorisé, boutons +/−, création, modification, photo locale facultative et suppression confirmée. Les produits épuisés restent grisés en bas.
- **Scanner simulé** : saisie successive de codes, modes Ajouter/Retirer, aperçu du stock et compteur d’exemplaires traités par le dernier scan. Les boutons +/− modifient ce total en mettant à jour ensemble stock et courses liées. Formulaire court pour les inconnus, reconnaissance au scan suivant, retour visuel, vibration lorsque disponible, annulation complète du dernier scan ajusté.
- **À acheter** : articles libres ou liés au catalogue, quantités, cochage, suppression et suggestions explicites selon les seuils. Un scan Ajouter et ses ajustements déduisent le total traité des courses liées ; réduire ce total restaure la déduction correspondante. Les articles libres ne sont jamais rapprochés par leur nom.
- **Données locales** : sauvegarde après chaque mutation, réglages et export JSON via le bouton de statut en haut ou le menu latéral. Réinitialisation confirmée de la démonstration.
- **Base PWA** : manifeste, icônes Android/iOS et cache des fichiers de l’application. La version compilée reste utilisable sans réseau après son premier chargement.
- **Apparence** : Automatique, Clair et Sombre dans les paramètres (bouton de statut en haut ou menu latéral). Le mode Automatique suit les changements de préférence système ; le choix manuel est immédiat et mémorisé sur cet appareil, indépendamment du stock.

Les quantités représentent des emballages entiers, limités à 9 999. Les photos JPEG/PNG/WebP sont limitées à 500 Ko pour préserver le stockage du navigateur. Les pictogrammes par catégorie ne sont pas des photographies commerciales.

## Parcours de démonstration

1. Dans Stock, modifier les quantités puis rechercher `pelees`. Vérifier que les tomates restent visibles malgré l’accent de leur nom.
2. Scanner → code `8076802085738` : les penne passent de 3 à 4. « Scanner à nouveau » traite volontairement un autre exemplaire, même immédiatement.
3. Code `3019081234567` : le thon passe de 0 à 1 et la quantité liée aux courses passe de 2 à 1. « Annuler » restaure les deux. Retirer à zéro affiche une erreur sans mutation.
4. Code `1234567890128` : créer un produit inconnu. Son code sera reconnu aux prochains scans. Les boutons d’exemples remplissent la saisie ; « Valider » applique l’opération.
5. À acheter → ajouter un article libre, modifier sa quantité, le cocher ; ajouter les pois chiches proposés sous le seuil.
6. Recharger : stock, courses et tri sont conservés. Les données de démonstration ne sont pas réinjectées si la liste devient vide.

Le même code soumis à moins de **1,2 seconde** d’intervalle est ignoré ; la commande explicite de répétition permet d’enchaîner les exemplaires identiques. Sous le scanner, +/− règlent le total traité par la dernière opération, au minimum 1 ; Annuler restaure son état de départ, stock et courses ensemble. Une autre mutation invalide ces ajustements et leur annulation, avec un message explicite. Les boutons de Stock continuent de régler directement le stock. Un nouveau produit en mode Retirer est créé à la quantité saisie, zéro par défaut, **sans retrait automatique**.

## Architecture

React et TypeScript strict pour les vues et formulaires, Vite pour le développement et la compilation, `vite-plugin-pwa` pour le manifeste et Workbox. Styles CSS sans bibliothèque d’interface ; Lucide fournit les pictogrammes. Aucun routeur ou gestionnaire d’état supplémentaire n’est nécessaire pour trois vues.

- `src/model.ts` : modèles et règles métier pures (stock, courses, suggestions, recherche/tri, annulation).
- `src/storage.ts` : lecture, validation et écriture versionnées de la sauvegarde locale.
- `src/demo.ts` : données d’exemple reproductibles.
- `src/components.tsx` : composants accessibles et formulaire produit.
- `src/App.tsx` : navigation, vues et orchestration des mutations.
- `src/style.css` : styles et adaptations mobile.
- `src/theme.css` : palettes et valeurs visuelles partagées ; `src/theme.ts` : préférence et suivi du thème système. Le petit script `public/theme-init.js` applique le choix avant le premier rendu pour éviter un flash de thème incorrect.
- `src/*.test.ts` : tests métier et stockage avec Vitest.

Le stockage utilise une seule clé `app-reserve.local.v1` dans `localStorage`. Une mutation métier produit un nouvel état ; l’écriture de cet état doit réussir avant le rendu et le retour de succès. L’annulation restaure stock et courses ensemble. Une sauvegarde corrompue bloque les mutations et reste exportable, sans remplacement silencieux.

## Vérifications

```powershell
npm test
npm run typecheck
npm run build
npm run format:check
```

`npm run format` reformate les sources. Les versions exactes et le fichier de verrouillage rendent l’installation reproductible. Le compte rendu des parcours manuels est dans [docs/VALIDATION.md](docs/VALIDATION.md).

## Limites et suite

La persistance de démonstration est **propre au navigateur et à l’origine**, sans compte ni réserve partagée. Elle peut être effacée avec les données du navigateur. Un export JSON brut est disponible ; sa restauration guidée est prévue ultérieurement. Ne pas y stocker des données irremplaçables sans sauvegarde.

L’écoute d’événements `storage` actualise les autres onglets et la révision détecte des écritures périmées. Ce mécanisme n’est **pas une transaction entre onglets ou appareils** : utiliser un seul onglet pour modifier la réserve. Les transactions et clés d’idempotence du futur serveur remplaceront ce mécanisme.

L’installation Android/iOS et la caméra nécessiteront une origine HTTPS accessible au téléphone. `localhost` est accepté comme contexte sûr sur l’ordinateur, mais l’adresse IP d’un PC en HTTP ne suffit pas. Aucun hébergement ni certificat n’est créé à cette étape. Une validation réelle sur Android et Safari iOS reste nécessaire.

Prochaine étape : évaluer les parcours sur téléphone, puis mettre en place Supabase et les opérations atomiques privées après validation du prototype. Voir [docs/SPEC.md](docs/SPEC.md) et [docs/PLAN.md](docs/PLAN.md).
