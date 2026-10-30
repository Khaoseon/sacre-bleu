> Historical French record. Dates, commands and approval states below belong to their original phase; do not use them as current setup instructions. See the [English documentation index](README.md), [current installation guide](INSTALL.md) and [translation inventory](README.md#organization-and-translation-inventory).

# Transmission — clôture de recette phase 3

État au **28 octobre 2026**. Implémentation et recette principale iPhone/Samsung livrées. L’utilisateur confirme les derniers réglages et demande la clôture. **Ne pas commencer Open Food Facts ni une autre phase sans nouvelle demande.** Historique et limites détaillés dans `VALIDATION.md` ; protocole reproductible dans `TESTS_TELEPHONES.md`.

## Validations physiques acquises

- Samsung Android 13 / One UI 5.1, Chrome ; iPhone 17 / iOS 26.6.2 déclarés, Safari. Versions précises des navigateurs et modèle Samsung non relevés.
- HTTPS privé, deux comptes distincts dans la même réserve, caméra réelle sur les deux téléphones. Aucun tunnel, déploiement ou service distant ajouté.
- Lecture de l’EAN-13 de la sauce tomate, maintien dix secondes sans doublon, ajustements et annulation ; interruption/arrière-plan puis reprise explicite sur les deux téléphones.
- Référence observée au début de la reprise : **stock 2 / courses 0**. Le précédent 1/0 était une déclaration antérieure à des essais personnels supplémentaires ; aucun audit direct de la base n’a été effectué. Nouvelle référence restaurée et confirmée sur les deux téléphones après les essais.
- Synchronisation réelle stock/courses : courses liées 5 ; scan Ajouter → stock 3 / courses 4 ; total traité 5 → 7/0 ; total 3 → 5/2 ; Annuler → 2/5 ; suppression de la seule ligne ajoutée → **2/0**. Confirmations utilisateur globales du parcours, pas de fixture ou d’écriture SQL Cloud.
- Sauts de page Safari lors des +/− corrigés : fin du bandeau transitoire déplaçant le contenu, statut d’enregistrement accessible dans la barre existante, erreurs/reprise toujours visibles. Retest physique réussi, état initial restauré.
- Objectifs validés : Samsung « camera 0, facing back » et iPhone « Double camera grand angle arriere ». Sélection automatique confirmée sur les deux appareils ; netteté iPhone jugée moyenne mais lecture fonctionnelle, aucun délai chiffré relevé.
- Préférences minimalistes confirmées par l’utilisateur après dernier build : titre/sous-titre Scanner retirés ; roue seule visible avec nom accessible ; choix caméra dans les préférences, mémorisé localement par id/libellé (secours par libellé si ID renouvelé). Palettes Automatique, Sauge claire/sombre, Ardoise, Rétro crème/pétrole à fonds unis ; actions de compte/données repliées.

## Garanties conservées et contrôles

Règles métier pures, stockage et contrats RPC inchangés. Aucune migration, type backend généré, authentification, dépendance ou lockfile modifié dans cette reprise. Aucun succès avant reçu et snapshot confirmé ; blocage pendant écriture/incertitude ; arrêt des pistes avant changement d’objectif et verrou anti-doublon conservé. Permission caméra explicite ; repli unique vers le choix arrière navigateur si l’objectif automatique est indisponible, pas de nouvelle tentative automatique après refus de permission.

- **183 tests applicatifs / 13 fichiers**, TypeScript strict, builds local/Cloud, formatage et `git diff --check` réussis.
- Deux tests `npm run test:phone` réussis. Les suites backend antérieures restent les validations de référence ; aucune nouvelle migration ni raison de remettre à zéro une base.
- Tests ajoutés : rendu pendant attente reçu/snapshot et reprise incertaine, préférence/choix/repli caméra, stockage bloqué/invalide, restauration des palettes avant React et contrastes.
- Démo isolée inspectée à 390 et 320 px, sans débordement horizontal constaté ; palette pétrole conservée après rechargement. Capture synthétique uniquement : `screenshots/preferences-retro-cream.png`. Aucun inventaire personnel, email ou capture de téléphone versionné.
- Avertissement Vite principal > 500 Ko conservé (~528 Ko, ~153 Ko gzip), lecteur différé ~478 Ko/~125 Ko gzip.

## Limites restantes

Pas de validation physique EAN-8/UPC-A, session multi-produits, retrait/représentation ou répétition explicite, mode Retirer/refus à zéro, inconnu/saisie de secours, refus caméra, navigation/déconnexion, rotation/clavier, lampe/vibration, conflit concurrent ou réponse RPC perdue sur téléphone. Une partie est couverte automatiquement et/ou en Cloud 2C ; ne pas l’assimiler à cette recette physique. Installation PWA et consultation privée hors ligne restent hors de cette recette. Pas de mesure de temps de reconnaissance ni de garantie universelle d’autofocus ; les libellés d’objectifs sont des préférences empiriques.

## Nettoyage et reprise

- Serveur HTTPS temporaire arrêté ; **zéro écoute sur 4443** contrôlée. Preview locale de contrôle également arrêtée.
- Autorité isolée de recette retirée du magasin **Windows CurrentUser/Root**, correspondance par empreinte exacte du certificat public puis absence contrôlée. Aucun magasin système ni autre autorité modifié.
- Dossiers dédiés `.tmp/phone-tls` (dont clés privées) et `.tmp/phone-public`, ainsi que `.tools/mkcert.exe`, supprimés après contrôle de leurs chemins. Clés jamais transférées ni versionnées. Autres fichiers temporaires/sauvegardes/outils GitHub préexistants préservés.
- **L’utilisateur confirme le nettoyage sur les deux téléphones** : profils/autorités de recette, copies publiques et messages de transfert, onglets fermés. Contrôle déclaratif, sans accès distant aux téléphones.
- Aucun changement de pare-feu ni de profil Public/Private. Deux règles Node.js larges préexistantes ont été constatées en lecture seule ; conservées, elles ne sont pas créées par cette recette.
- L’ancienne URL LAN ne sert plus l’app. Pour une future recette privée, préparer une nouvelle autorité isolée et demander les accords réseau/confiance ; ne pas récupérer ni transférer les anciennes clés. Les préférences locales de l’application ne sont pas des certificats.

## Git et périmètre

Dépôt `Khaoseon/App_reserve` confirmé **privé** à la clôture par le connecteur GitHub. Commit et push demandés sur `main`, sans force push ; contrôler après publication `HEAD = origin/main` et arbre propre. Pas de nouvelle phase, déploiement, opération Supabase ou mutation de stock à la clôture. Sauvegardes chiffrées antérieures préservées.
