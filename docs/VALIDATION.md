# Validation — phases 1, 2A, 2B et 2C

## Clôture 2C — 27 octobre 2026

Projet Supabase Free `uznbnihmdzxdnlxanjcl`, Paris, PostgreSQL 17.11 et pgcrypto 1.3. Historique Git synchronisé sur dépôt privé. Trois migrations inchangées appliquées après précontrôle, dry-run et accord explicite ; historique distant concordant. API limitée à `public`, Auth avec confirmation obligatoire et callbacks exacts. Aucune donnée de démonstration, aucun reset distant ni déploiement PWA.

| Vérification                               | Résultat                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `npm test`                                 | 81 tests applicatifs réussis, 7 fichiers                                                           |
| `npm run typecheck`                        | Réussi                                                                                             |
| `npm run build`, `npm run build:cloud`     | Builds local et Cloud réussis, fichiers séparés                                                    |
| `npm run format:check`, `git diff --check` | Réussis                                                                                            |
| Base locale vierge isolée, sans effacer 2B | 80 assertions pgTAP, 6 tests concurrence, Auth/API et partagé Mailpit réussis ; linter sans erreur |
| Types régénérés                            | Identiques aux types versionnés, aucune modification manuelle                                      |
| Audit Cloud SQL                            | 8 tables RLS, 14 fonctions applicatives, 47 contraintes, 5 politiques ; aucune violation détectée  |
| API Cloud anonyme                          | 5 SELECT, RPC de création et mutation directe sans ligne cible refusés 401/42501                   |
| Profil `private`                           | Refus 406/PGRST106                                                                                 |
| Auth public                                | Email activé, autoconfirmation désactivée                                                          |

Les compteurs après recette anonyme étaient nuls dans les huit tables et Auth. Supabase Free a d’abord refusé le modèle email avec le fournisseur intégré ; les réglages de base ont été appliqués séparément. Après configuration personnelle du SMTP Gmail, le contenu et le sujet du modèle ont été appliqués avec succès. L’utilisateur a confirmé la **réception réelle du premier email et la confirmation du compte**, corroborée par le compteur de compte vérifié. Aucun succès Mailpit n’est assimilé à cette livraison Gmail.

La **connexion réelle**, la **création RPC d’une réserve vide** et la **persistance après rechargement** ont ensuite été observées dans l’UI Cloud. Le second compte confirmé ne voyait pas cette réserve avant invitation. Les assertions SQL complémentaires sous rôle extérieur ont validé cinq lectures vides, snapshot absent et refus RPC/écriture directe ; ce contrôle de rôle SQL est distinct d’un appel HTTP signé.

L’invitation ciblée a ensuite été créée et acceptée dans les deux sessions, sans journaliser son secret. Owner/member contrôlés, produit réel autorisé créé, passage à zéro conservant la fiche, réapprovisionnement membre et deux ajouts cumulés avec convergence des écrans. Scanner Ajouter 1 → 5 → 3 → annulation avec courses liées : cochage à zéro, restauration exacte des quantités/cochage et retour au stock initial. Retirer à zéro puis refus supplémentaire sans changement des courses ; stock initial rétabli par commande normale. Replay SQL d’une vraie intention : même reçu sans nouvel effet, paramètres différents refusés. La perte de réponse HTTP reste un test local, pas un test Cloud exécuté ici.

Après accord explicite, la seule course d’essai est supprimée. État final contrôlé : deux comptes vérifiés, une réserve à deux membres, un produit à sa quantité initiale, zéro course. Audit final sans violation. Déconnexion/rechargement du membre : aucune donnée privée ; propriétaire toujours connecté.

La répétition de restauration réelle a d’abord été refusée avant lancement par Auto-review, puis explicitement autorisée par l’utilisateur pour la copie locale temporaire d’Auth et des données privées. **Restauration réussie sur PostgreSQL local vierge, sans réseau ni port, données en RAM**, après recréation du schéma Auth et des migrations. Dix tables métier/techniques et Auth identiques par nombre de lignes et SHA-256 ; tri binaire explicite, intégrité/UUID/grants/RLS conformes et retour à `origin`. Copie jetable supprimée, aucun dump en fichier ou journal, aucune écriture Cloud. Une archive externe chiffrée reste à constituer ; la pause réelle du projet et une connexion HTTP au service Auth restauré n’ont pas été testées. État détaillé : `HANDOFF_2C.md`.

Les sections suivantes restent l’historique des étapes précédentes.

## Clôture 2B — 27 octobre 2026

Frontend branché sur Supabase local, sans projet hébergé ni déploiement. Interface et thème existants conservés. Les sections historiques ci-dessous décrivent les validations de leur étape respective ; leurs limites ne remplacent pas le présent état 2B.

| Vérification de clôture | Résultat                                                    |
| ----------------------- | ----------------------------------------------------------- |
| `npm test`              | 77 tests applicatifs, 6 fichiers                            |
| `npm run test:shared`   | 1 parcours complet réel à deux comptes réussi               |
| `npm run typecheck`     | TypeScript strict réussi                                    |
| `npm run build`         | Compilation Vite et génération PWA réussies                 |
| `npm run format:check`  | Réussi après formatage                                      |
| GitHub existant         | `Khaoseon/App_reserve` confirmé **PRIVATE**, origin correct |

Le test partagé a été réexécuté à la reprise car la toute dernière invocation avait été refusée avant exécution par Auto-review à cause de la limite d’utilisation. Il couvre aussi les derniers changements : références `photo_path` préservées, édition de métadonnées sans réécriture du stock, et relecture suffisante après reçu. Un test unitaire supplémentaire vérifie explicitement qu’un snapshot plus ancien que le reçu ne produit pas de succès et conserve la clé pour reprise.

Build final : bundle JavaScript de 513,09 Ko minifié (148,03 Ko gzip), avertissement Vite non bloquant au seuil de 500 Ko ; optimisation du découpage différée, sans refonte de clôture. Audit des 70 fichiers destinés au commit : aucun secret ou chemin personnel détecté ; `.env.local`, outils et journaux temporaires ignorés. `git diff --check` sans erreur. Le frontend déjà ouvert a été relu à la clôture : réserve partagée synchronisée, riz et quantité serveur présents, sans réinitialisation des données ni nouvelle mutation.

### Parcours automatisé réel partagé

SDK officiel et mêmes adaptateur/store que l’application, contre Supabase local uniquement. Deux comptes fictifs, email réellement livré dans Mailpit, connexion non confirmée refusée, confirmation PKCE par token hash depuis un client neuf sans vérificateur d’origine, connexion puis réserve vide. Invitation ciblée, acceptation idempotente, deux membres, accès extérieur et invitation par membre non propriétaire refusés.

Création visible des deux comptes ; scan Ajouter 1 → 5 : stock 5, courses 0 cochées ; réduction à 3 : courses 2 ; annulation : stock 0, courses 5. Deux incréments simultanés sans perte, Stock indépendant des courses, Retirer jusqu’au stock disponible, puis annulation ; conflit après écriture d’un autre membre explicitement refusé. Réponse perdue simulée **après commit serveur** : aucune annonce de succès, reprise même clé, exactement un mouvement. Fiche inconnue conservée à zéro après annulation, modifications des courses, suppression détachant les références, déconnexion et accès privé refusé. Les fixtures nettoient leurs propres comptes/réserves ; aucun secret imprimé ni service distant utilisé.

Les 80 assertions pgTAP, 6 tests multi-connexions, 1 parcours Auth/API historique et le linter sans erreur ont également été exécutés pendant l’implémentation 2B. Ils ne sont pas répétés à la clôture : aucune migration n’a changé depuis. Les trois migrations validées de 2A n’ont pas été réécrites. Le test Auth/API historique confirme par SQL ; le test partagé ci-dessus confirme via les emails réellement reçus.

### Parcours exécutés dans l’interface pendant 2B

- Deux sessions distinctes sur `127.0.0.1:5173` et `localhost:5173` ; inscription, messages Mailpit, clic de confirmation et retour Auth. Invitation ouverte avant inscription, puis lien initial rouvert après confirmation, acceptation réussie ; fragment retiré de l’URL.
- Réserve initialement vide ; création d’un riz à zéro, visible dans l’autre compte via polling ; deux membres affichés dans les paramètres.
- Courses liées réglées à 5 ; scan 1 puis quatre + → 5 ; l’autre compte voit courses 0 cochées. Deux − → 3 ; Annuler → stock 0 et courses restaurées. Changement de thème sans invalider le scan.
- Recherche `RIZ`, tri récent conservé et session restaurée après rechargement. Thèmes Clair et Sombre sur largeur 390 px ; formulaire sombre, contrôles natifs, épuisés et navigation mobile lisibles. Captures `screenshots/shared-mobile-light.jpg` et `screenshots/shared-mobile-dark.jpg`.
- **Interruption réelle de PostgREST local** avec Docker, sans effacer la base : stock précédent conservé, écritures bloquées, erreur et date de dernière lecture réussie. API rétablie, page rechargée avec demande en attente ; reprise avec clé conservée, quantité augmentée exactement d’un exemplaire. Délai réseau borné à huit secondes par requête. L’autre session récupère par polling.
- Déconnexion du membre : stock privé immédiatement retiré, toujours absent après rechargement ; écran de connexion conservé.

### Refus Auto-review et limites

Le lancement sur `0.0.0.0` a été refusé pour exposition réseau inutile. Il a été remplacé par un lancement sur `127.0.0.1`, sans contournement. Une invocation de `test:shared` a ensuite été refusée faute de quota d’examen automatique ; elle n’avait pas été exécutée et a réussi après reprise. Aucune action nécessaire ne reste bloquée.

Pas de validation Android/Safari iOS réels, cloud, installation PWA réelle, Storage privé ou consultation privée persistante hors ligne. La suite automatisée teste SDK/adaptateur/store, sans automatiser les clics navigateur ; les parcours UI ci-dessus ont été exercés séparément. Les données de test UI locales peuvent subsister ; les tests automatisés ne les effacent pas. Aucun push effectué à la clôture. La transmission et les commandes de reprise sont dans `HANDOFF_2B.md`.

## Historique des validations précédentes

Vérification du 26 octobre 2026, sur Windows avec Node 24.20.0 et npm 11.19.0.

## Phase 2A — Backend local et sécurité

Le frontend de l’étape 1, y compris thème sombre et compteur de scan, est conservé sans changement. Dépôt propre au départ, remote `Khaoseon/App_reserve` confirmé **PRIVATE** avant intervention ; aucun projet Supabase hébergé ni déploiement n’a été créé.

Environnement réellement utilisé : CLI Supabase 2.122.0 installée localement et verrouillée, Docker Engine 29.9.2, PostgreSQL 17.11. Le moteur Docker a été démarré, puis les ports 543xx réservés par Windows ont été remplacés par 553xx dans la configuration de ce projet uniquement.

| Vérification backend            | Résultat exécuté                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| Migrations initiales            | 3 migrations appliquées avec succès                                                         |
| `npm run db:reset`              | Base locale vierge recréée, 3 migrations réappliquées, aucun seed                           |
| `npm run test:db`               | **80 assertions pgTAP réussies**, 1 fichier, transaction de test annulée                    |
| `npm run test:db:concurrency`   | **6 tests réussis**, 2 connexions effectivement en concurrence, attente PostgreSQL observée |
| `npm run test:db:api`           | **1 parcours Auth/Data API réussi**, 2 utilisateurs et sessions réelles                     |
| Linter Supabase local           | Aucune erreur de schéma                                                                     |
| `npm run db:types`              | Types publics générés depuis la base appliquée et formatés                                  |
| Tests PWA existants             | **58 tests réussis**, 4 fichiers                                                            |
| TypeScript, build PWA, Prettier | Réussis                                                                                     |

Les tests SQL vérifient RLS/grants, comptes non vérifiés, propriétaire et membre, métadonnées de rôle non fiables, invitations ciblées/expirées/invalides/utilisées, absence de secret d’invitation en clair dans les reçus, limite de membres, accès anonyme et extérieur refusés, écritures directes interdites, codes-barres simultanément identiques dans deux réserves mais uniques dans chacune, refus d’un produit étranger par changement d’ID, catalogue et stock distincts, seuil sans ajout automatique, articles libres, ajouts/retraits et limites, répétitions idempotentes, compensations et ajustements successifs, suppression avec courses détachées et panne de courses injectée annulant aussi stock et reçu.

Les tests multi-connexions exécutent ajouts simultanés, retraits au dernier emballage, requête identique concurrente, même clé avec paramètres différents, double acceptation d’invitation et refus de compensation/ajustement après la modification d’un autre membre. Le parcours HTTP vérifie réellement GoTrue, les sessions signées, RLS et les RPC via PostgREST, ainsi que l’impossibilité de promouvoir le destinataire en administrateur.

Limites : dans le test Auth, l’email est confirmé **par la fixture SQL**, après vérification du refus de connexion non confirmée ; l’envoi réel, le clic et le callback d’interface ne sont pas validés de bout en bout. Aucun écran n’est connecté au backend et aucune synchronisation distante, gestion complète de Storage, export/restauration serveur ou suppression de compte n’est livrée. Le cache de démonstration du navigateur n’est pas modifié. Les fixtures SQL sont annulées et les autres tests suppriment uniquement leurs propres utilisateurs/réserves de test.

Voir `BACKEND.md` pour les transactions, interfaces, commandes reproductibles et la future transition à une seule source de vérité en phase 2B.

Après les tests, la base contenait zéro réserve et zéro utilisateur de fixture. La stack Supabase a été arrêtée avec `npm run db:stop`, volumes conservés ; `npm run db:start` la redémarre. Les modifications de phase 2A restent locales, sans push ni publication distante.

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
