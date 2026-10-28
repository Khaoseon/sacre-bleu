# Recette Open Food Facts — iPhone et Samsung

**Préparée, non exécutée.** Activation Cloud suspendue à une sauvegarde actuelle vérifiée ; les tests physiques de phase 3 ne valident pas cette intégration. Cette recette ne commence pas la phase 5 ou une installation PWA de phase 6.

## Prérequis avant essai

1. Achever les précontrôles de `HANDOFF_4.md`, notamment sauvegarde, forfait Free, région Paris, historique et dry-run. Après réussite seulement, appliquer l’unique migration phase 4 et déployer `product-lookup` avec JWT plateforme conservé et contrôles Auth/RLS internes.
2. Relever l’origine HTTPS exacte utilisée par chaque téléphone et l’inscrire dans `OFF_ALLOWED_ORIGINS` ; ne pas autoriser `*`. Les anciens certificats/serveur de phase 3 ont été supprimés. La présente autorisation de déploiement ne demande pas de réinstaller une autorité, ouvrir le LAN ou créer un hébergement : préparer séparément l’accès privé nécessaire avec les accords correspondants, selon `TESTS_TELEPHONES.md`. Aucune origine LAN ancienne ne doit être supposée encore valide.
3. Choisir quelques **codes publics absents du catalogue personnel**, après contrôle de cette absence en lecture seule. Candidats : `3017620422003`, `3274080005003`, `7613034626844`. Ne pas les scanner dans le Cloud s’ils sont déjà personnels : un connu déclenche un mouvement automatique.
4. Aucune création de données de test Cloud n’est autorisée actuellement. Ne pas enregistrer la nouvelle fiche, ne pas scanner de produit connu et ne pas utiliser les boutons de stock, d’ajustement, d’annulation ou de courses dans la réserve réelle. Ces opérations sont vérifiées dans l’environnement local isolé. Une recette de mouvements Cloud exigerait un accord distinct sur une réserve/fiche jetable et son nettoyage.

## Parcours de consultation sans mutation d’inventaire

Relever pour chaque téléphone modèle, système, navigateur/version, heure, connexion, origine HTTPS et résultat, sans email, token ou capture d’inventaire personnel.

| Essai           | Action                                                                                        | Résultat attendu                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Nouveau code    | En Ajouter, présenter un code public préalablement confirmé absent du catalogue               | Détection suspendue, chargement discret, fiche préremplie si OFF répond ; quantité 1 ; aucun succès de stock et aucun produit créé |
| Correction      | Modifier nom, marque, conditionnement ou quantité proposée, **puis fermer sans enregistrer**  | Champs corrigibles, données personnelles inchangées ; fermeture sans mouvement                                                     |
| Photo           | Inspecter une proposition avec image et une sans image, si les réponses réelles le permettent | Photo avec attribution/source/licence ; pictogramme en absence ou erreur ; aucun téléchargement vers Storage                       |
| Reprise caméra  | Fermer la fiche, retirer le code du cadre puis présenter un autre code public absent          | Même flux conservé, aucune réactivation caméra nécessaire ; verrou de présentation conservé                                        |
| Réponse tardive | Fermer pendant la recherche, ou choisir « Saisir manuellement »                               | La réponse ne rouvre pas la fiche et n’écrase pas une saisie commencée                                                             |
| Indisponibilité | Simuler la panne dans l’environnement isolé, ou constater une vraie indisponibilité           | Formulaire manuel toujours disponible ; aucune création automatique ; ne pas couper le réseau au milieu d’une mutation réelle      |
| Absence         | Code public réellement absent d’OFF ou cas fictif dans l’environnement isolé                  | Nom obligatoire vide, champs facultatifs disponibles ; fermer sans enregistrer                                                     |
| Retirer         | Choisir Retirer puis présenter un code confirmé absent du catalogue                           | Quantité initiale 0, aucun retrait automatique ; fermer sans enregistrer                                                           |
| Limitation      | Vérifier les fixtures 429 et la pause du budget dans l’environnement isolé                    | Repli manuel, pas de boucle de requêtes ; ne pas provoquer de charge ou de bannissement réel                                       |
| Interruption    | Pendant une recherche, masquer l’app puis revenir                                             | Recherche annulée/ignorée ; pistes arrêtées en arrière-plan ; reprise caméra explicite comme en phase 3                            |

Espacer les quelques recherches réelles d’au moins six secondes. Un appel OFF et la mise à jour du budget technique sont possibles ; aucune ligne de catalogue, stock ou courses ne doit changer. Comparer avant/après leurs empreintes en lecture seule sans conserver de données brutes dans le dépôt.

## Régressions dans l’environnement isolé

Exécuter `npm test`, `npm run test:shared`, les suites SQL/concurrence/Auth/API locales et le parcours `test:off:browser`. Ils couvrent connu sans appel externe, création corrigée puis scan suivant, stock/courses, total 1 → 5 → 3 → annulation, refus à zéro, compensation périmée et demandes incertaines. Ne jamais rediriger les fixtures vers le Cloud.

Dans la réserve Cloud, les contrôles de non-régression restent des lectures de snapshots/RLS, comparaisons d’empreintes et refus d’accès sans effet. Une absence de mutation de test Cloud ne doit pas être présentée comme une validation réelle de mouvements Cloud post-déploiement.

Après la séance : arrêter les serveurs temporaires, confirmer l’absence de nouvelle fiche ou de quantité modifiée et consigner séparément les cas réussis, non réalisés et bloqués dans `VALIDATION.md`.
