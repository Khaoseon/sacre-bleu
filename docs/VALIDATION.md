# Validation de l’étape 1

Vérification du 26 octobre 2026, sur Windows avec Node 24.20.0 et npm 11.19.0.

## Contrôles automatisés

| Commande               | Résultat                                                 |
| ---------------------- | -------------------------------------------------------- |
| `npm test`             | 58 tests réussis, 4 fichiers                             |
| `npm run typecheck`    | Réussi, TypeScript strict                                |
| `npm run build`        | Réussi, compilation Vite et génération du service worker |
| `npm run format:check` | Réussi                                                   |
| Installation npm       | 0 vulnérabilité signalée au moment de l’installation     |

Les tests couvrent les bornes de quantité, le stock nul conservé, le réapprovisionnement, les codes dupliqués, la création d’inconnus, les tris/recherche/filtres, les suggestions explicites, la réduction des courses liées par scan Ajouter et ses ajustements, l’indépendance des articles libres, l’annulation stock/courses et son refus après modification, la suppression d’un produit lié, la persistance du tri, les révisions périmées, le quota de stockage et les sauvegardes corrompues.

## Finalisation : préférences visuelles et préparation GitHub privé

La logique corrigée du scanner a été relue et conservée sans modification supplémentaire. Les 41 tests métier et stockage restent réussis. Le thème ajoute 17 tests, sans dépendance d’interface supplémentaire ni changement de l’architecture métier.

### Préférences et contrastes

- Tests Automatique/Clair/Sombre, relecture après redémarrage, préférence invalide, stockage inaccessible et échec de mémorisation sans faux succès.
- Changement système appliqué uniquement en Automatique, détachement des écouteurs et conservation du choix manuel.
- Script réel `public/theme-init.js` exécuté dans un environnement de test avant React : thème et `color-scheme` corrects dès l’initialisation.
- Préférence visuelle enregistrée séparément : la sauvegarde de stock et sa révision restent intactes.
- Contrastes calculés sur les deux palettes : au moins 4,5:1 pour les paires de textes principales, secondaires, états épuisés/désactivés et statuts ; au moins 3:1 pour les bordures interactives et l’indicateur de focus.

### Vérifications dans le navigateur

Parcours exécutés sur la version compilée, avec des données de test séparées (`127.0.0.1:4177`, puis cache neuf sur `:4178`) :

- Thèmes Clair et Sombre inspectés à 390 × 844 ; paramètres et sélecteur vérifiés à 320 × 740, sans débordement horizontal ni texte tronqué dans les options.
- Sombre conservé après rechargement, y compris les contrôles natifs (`color-scheme: dark`). Automatique suit la préférence sombre actuelle du système ; les changements système sont également couverts par les tests automatisés.
- Formulaire de modification en sombre : champs, sélection, bouton de fichier, focus, actions Enregistrer/Supprimer et fenêtre modale lisibles. Navigation mobile, Stock et liste de courses opérationnels.
- Stock : bouton + sur les penne, quantité 3 → 4. Scanner en sombre : courses liées réglées à 5, scan Ajouter suivi de quatre +, compteur et stock à 5, courses à zéro.
- Passage en Clair pendant ce scan : contexte et Annuler conservés. Deux − rétablissent stock 3 et courses 2 ; Annuler rétablit stock 0 et courses 5. La logique des quantités du scanner n’a donc pas été réécrite pour le thème.
- Retirer conserve sa couleur rouge distincte du mode Ajouter vert. Produits épuisés et contrôles désactivés utilisent des couleurs lisibles, sans opacité réduisant les textes.
- Captures : `docs/screenshots/theme-light-mobile.jpg` et `docs/screenshots/theme-dark-mobile.jpg`.

### Audit avant publication

Le dépôt local ne contenait initialement aucun commit, fichier suivi ou remote ; aucun historique antérieur à auditer. Les fichiers sources, documents, icônes et captures de démonstration destinés au premier commit ont été examinés et analysés pour les formats usuels de secrets (clés privées, tokens GitHub/OpenAI, clés AWS, JWT et identifiants intégrés aux URL), sans détection. Les chemins locaux personnels ont été retirés du README.

`.gitignore` exclut dépendances, builds, fichiers `.env`, clés, configurations privées, outils de publication et fichiers temporaires. Les données applicatives restent dans le navigateur et ne sont pas incluses dans le dépôt. L’authentification de GitHub CLI a été réalisée interactivement et ses identifiants restent dans le gestionnaire sécurisé du système, hors du projet. La création et la publication visent exclusivement un dépôt privé ; ni Supabase ni déploiement public ne font partie de cette intervention.

## Correction fonctionnelle du dernier scan

Correction ciblée après validation documentaire de l’étape 1. Même architecture, mêmes styles et dépendances ; aucune intégration de l’étape 2.

### Tests ajoutés

22 tests supplémentaires portent sur le total traité et ses interactions avec les courses et le stockage :

- Augmentations et réductions successives, notamment 1 → 5 → 3 et dépassement de la quantité à acheter. Restauration des quantités et du cochage depuis l’état initial, sans déduction cumulée.
- Minimum de 1 et rejet des valeurs invalides ; plafond de stock à 9 999 en Ajouter, limite du stock initial en Retirer. Les erreurs laissent intact le dernier état validé.
- Articles libres et articles préalablement cochés inchangés ; répartition d’un seul total entre plusieurs lignes liées, sans double déduction ; absence de création de courses non demandées.
- Annulation complète après ajustements, nouveaux scans indépendants et reconnaissance/création d’un produit inconnu ajustable. Le mode du dernier mouvement reste attaché à son opération.
- Identifiant stable entre ajustements et rejeu du même total sans effet supplémentaire ; refus d’ajustement ou d’annulation à révision périmée ; conservation des états de départ.
- Sauvegarde puis relecture après chaque ajustement et annulation ; quota d’écriture, sauvegarde plus récente ou supprimée : aucune écriture partielle ni écrasement de données récentes.

### Parcours de correction exécutés dans le navigateur

Version compilée testée séparément sur `127.0.0.1:4175`, avec ses propres données locales. Le contrôle final de l’affichage a utilisé `127.0.0.1:4176` pour partir d’un cache PWA neuf :

1. Courses liées au thon réglées à 5, stock initial 0. Scan Ajouter puis quatre appuis sur + : compteur 5, stock 5, courses 0 et article coché.
2. Deux appuis sur − : compteur 3, stock 3, courses 2 et article décoché. Annuler : stock 0, courses 5 ; ajustements et annulation désactivés.
3. Stock réglé directement à 3 sans modifier les courses. Scan Retirer puis deux appuis sur + : compteur 3, stock 0, bouton + désactivé. Un appui sur − : compteur 2, stock 1. Annuler restaure stock 3 et courses 5.
4. Nouvelle opération Ajouter, puis modification des penne depuis un deuxième onglet : message explicite d’invalidation dans le premier, compteur indisponible et annulation retirée. Un nouveau scan rétablit un contexte ajustable.
5. Après plusieurs ajustements, rechargement : stock et courses cohérents conservés, sans rejouer le scan.
6. Création d’un produit inconnu avec quantité 2, ajustement à 3 et annulation : la fiche créée disparaît. Nouvelle création et scan répété : produit reconnu sans rouvrir le formulaire.
7. Aucune erreur ou alerte de console remontée pendant ces parcours.

La compilation finale affiche un tiret et un message explicite lorsque le contexte est invalidé, plutôt qu’un total zéro qui pourrait laisser penser que le mouvement a été annulé. Capture de la correction : `docs/screenshots/scanner-correction.jpg`.

Le contexte du dernier scan reste en mémoire ; il n’est pas un journal durable de transactions. Les identifiants, totaux cibles et révisions préparent la future intégration, mais la synchronisation concurrente et l’idempotence serveur restent hors périmètre.

## Parcours initiaux exécutés dans le navigateur intégré

- Affichage ordinateur et navigation mobile entre les trois écrans.
- Mise en page inspectée à 390 × 844 et 320 × 740 ; aucun débordement horizontal de la page à 320 px. Les catégories défilent à l’intérieur de leur propre zone.
- Ajout d’un emballage de penne depuis Stock : 3 → 4.
- Recherche `PELEES` : seules les tomates pelées sont affichées.
- Scan thon en Ajouter : stock 0 → 1, courses 2 → 1. Répétition volontaire : stock 1 → 2, courses 1 → 0 et article coché. Annulation : stock 2 → 1 et courses 0 → 1.
- Scan thon en Retirer jusqu’à zéro ; le retrait suivant est refusé avec message d’erreur.
- Création de « Haricots blancs » via un code inconnu, quantité 2, puis reconnaissance au scan suivant : quantité 3.
- Courses : ajout libre de « Sacs congélation », quantité 2 → 3, cochage ; ajout explicite de la suggestion pois chiches.
- Sur la version compilée : tri récent et quantité des penne conservés après rechargement ; création de « Semoule test », modification 4 → 5, suppression avec confirmation et disparition vérifiée.
- Version compilée accessible en HTTP 200 sur `127.0.0.1:4173`.
- **Cache PWA vérifié** : après chargement de la version compilée, arrêt du serveur preview, rechargement réussi ; stock sauvegardé et navigation vers les courses disponibles alors que le serveur est arrêté.
- Aucune erreur ou alerte de console remontée lors du contrôle de la version compilée.

Le serveur de développement a redémarré lors du formatage de sa configuration, interrompant momentanément son onglet de test. La validation finale a été poursuivie sur un serveur preview indépendant de la configuration de développement.

## Limites de cette validation

Captures conservées dans `docs/screenshots/` : stock sur mobile et ordinateur, scanner mobile. La démonstration a été réinitialisée après les parcours de test.

- Les parcours de navigateur ont été exécutés manuellement par automation UI ; ils ne constituent pas une suite E2E versionnée.
- Le test hors ligne simule l’indisponibilité du serveur local. Il ne valide ni la gestion de synchronisation distante, ni une déconnexion réelle sur appareil mobile.
- Ni Android ni Safari iOS réels n’ont été utilisés. Installation PWA, clavier virtuel, vibration et comportement système restent à vérifier sur ces appareils.
- La protection temporelle de 1,2 seconde contre les lectures rapprochées est présente ; la répétition volontaire a été exercée. L’anti-doublon d’une caméra réelle reste à concevoir et tester à l’étape correspondante.
- La saisie et les photos restent locales. Aucun service distant n’a été intégré ou créé.
