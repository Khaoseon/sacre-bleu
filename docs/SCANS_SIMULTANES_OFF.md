# Scans simultanés et créneau OFF — correctif préparé

**29 octobre 2026 — branche locale `codex/revue-corrective-4b`.** Investigation initialement remise sans commit ; préparation ultérieure des commits locaux autorisée, sans push, fusion ou déploiement : [livraison contrôlée V1](LIVRAISON_CORRECTIFS_V1.md). Les préparations de sécurité/CI précédentes sont conservées. Les inscriptions Supabase restent fermées ; aucune écriture ni test de charge sur Supabase Cloud ou OFF réel pendant cette investigation. Phase 5 non commencée.

L'utilisateur confirme désormais que les deux comptes existants se connectent depuis Samsung et iPhone à la même réserve. Cela confirme l'accès iPhone actuel, pas la recette physique de ce correctif non publié.

**Contrôle ultérieur de livraison :** le parcours SDK réexécuté échoue désormais sur l'expiration d'un refus périmé via PostgREST local 14.18. Les succès ci-dessous décrivent l'investigation initiale, pas une validation finale reconfirmée. Voir le blocage, les résultats actuels et la procédure conditionnelle dans [LIVRAISON_CORRECTIFS_V1.md](LIVRAISON_CORRECTIFS_V1.md). Aucun push ni déploiement autorisé sur la foi de l'ancien bilan.

## 1. Ce qui est démontré, ce qui reste hypothétique

Le symptôme exact « le scan Samsung remplace celui de l'iPhone » **n'a pas été reproduit** avec deux comptes locaux, deux SDK et deux contextes Chrome indépendants. La caméra/son cycle de vie sont exécutés, mais la vidéo et le décodeur sont fictifs. Le snapshot partagé ne comporte pas l'identité d'un dernier scan distant ; le store possède normalement une identité locale et les réponses OFF sont déjà vérifiées contre le code demandé. Aucune preuve ne permet donc d'attribuer le symptôme réel au seul polling, à une réponse OFF d'un autre produit ou au cache PWA.

Défauts démontrés sur le store de `HEAD` avant correction, par deux tests temporaires isolés :

- Une sauvegarde locale de fiche, sans scan, remplaçait `lastProductId` : le panneau Dernier produit pouvait alors désigner la fiche éditée. Cela n'explique pas à lui seul une substitution **entre téléphones**.
- Une lecture de polling non terminée était attendue avant l'envoi d'une nouvelle mutation, sans échéance propre. Le store pouvait rester busy/lecture bloquée tant que la requête ne se terminait pas. La possibilité est démontrée ; une telle panne réseau n'a pas été mesurée sur l'iPhone réel.

Limiteur ancien confirmé par lecture et tests : six secondes partagées, refus interne annoncé comme rate-limit avec Retry-After 60, minimum client 60 secondes, et cache d'échec par code 30 secondes. L'en-tête Retry-After n'était pas exposé au navigateur par CORS. Ces attentes pouvaient rendre OFF indisponible beaucoup trop longtemps ; elles ne sont pas une limite sur les scans connus et ne démontrent pas un arrêt matériel de caméra.

Une révision distante invalide volontairement les ajustements/annulations antérieurs. C'est la protection SQL contre une compensation périmée ; elle doit rester en place. Elle ne doit pas changer l'identité locale ni interdire un **nouveau** scan.

## 2. Correctifs scanner préparés

- L'identité du dernier scan n'est plus remplacée par une simple édition de catalogue ; la création issue du scanner conserve son comportement. Polling et invalidation d'ajustement gardent l'identité locale.
- Si un reçu annonce un autre produit que la demande locale, pas de faux succès ni affichage de ce produit : intention conservée comme incertaine, reprise avec la même clé. Ce garde-fou de protocole ne prouve pas qu'un tel reçu incorrect ait été observé.
- Attentes bornées : AbortSignal 10 s sur les RPC SDK, échéance indépendante 12 s par appel dans le store. Une opération peut comporter plusieurs appels ; ce n'est pas une promesse de durée totale de 12 s. Une écriture incertaine reste à vérifier explicitement, sans nouveau mouvement ni nouvelle clé automatique.
- Une erreur d'ancien polling ne publie plus un état concurrent pendant la mutation ; une réponse arrivant après son échéance ne peut plus revenir en arrière. Les snapshots plus anciens restent refusés.
- Une génération locale protège le formulaire contre un résultat OFF devenu obsolète après fermeture, changement de page ou saisie manuelle. Le verrou de présentation ne dépend plus des nouveaux snapshots pour réappliquer l'intention en attente.
- Diagnostic repliable dans Scanner : référence du build, révision synchronisée, nombre d'actions locales confirmées, présence d'une identité locale, ajustement possible/désactivé et demande en cours/à vérifier. Aucun nom de compte, token, UUID, code-barres ou contenu d'inventaire dans ce diagnostic ; aucun journal de télémétrie créé.

La caméra reste volontairement en pause durant une modale ou une demande incertaine. La reprise vérifie la même intention ; on ne réactive pas des écritures aveugles pour contourner un problème réseau. Aucun changement aux filtres caméra/anti-doublon, à la sélection d'objectif ou aux règles de compensation SQL.

## 3. Budget OFF : comportement exact

Le catalogue personnel est toujours recherché **avant** le fournisseur : aucun appel Edge/OFF ni consommation de créneau pour un connu, même en limitation OFF. Trente recherches connues en simulation et vingt-quatre mouvements réels locaux rapides sont couverts.

Migration préparée `20261029000100_lookup_budget_details.sql` : une colonne de motif sur le singleton privé et une RPC `claim_product_lookup_slot` retournant allowed, reason et retry_after_seconds. Même verrou de ligne et **six secondes minimum partagées entre tous les membres/instances**, sans augmentation de fréquence. L'ancienne RPC booléenne reste compatible et utilise le même créneau. Aucune RPC de stock/scan, table de quantités/courses ou règle d'accès n'est modifiée.

| Situation                    | Réponse et reprise                                                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Créneau déjà occupé          | HTTP 429, raison cooldown et délai réel restant (1 à 6 s normalement), pas une fausse minute                                                                           |
| Vrai HTTP 429 du fournisseur | Raison rate-limit ; Retry-After honoré, secondes ou date HTTP ; 60 s seulement par défaut si délai absent/invalide ; politique interne six secondes toujours respectée |
| Échec réseau/service/budget  | Raison network, aucune fausse annonce de quota épuisé                                                                                                                  |
| Auth ou appartenance refusée | HTTP 401/403 distingué côté client, sans cache d'échec                                                                                                                 |
| Après échéance               | Prochaine recherche explicite possible, revendication atomique vérifiée de nouveau ; aucun retry automatique ni rafale                                                 |

Le client ne met plus les erreurs en cache trente secondes. Il garde seulement les métadonnées publiques found/missing et les échéances de blocage pertinentes. JSON expose aussi le budget ; CORS expose Retry-After. Si la persistance d'un refus fournisseur échoue, le client reçoit toujours ce refus et son délai connu ; un avertissement serveur statique `OFF_SHARED_COOLDOWN_UNCONFIRMED`, sans données personnelles, signale que la propagation durable n'a pas été confirmée. Le verrou interne reste acquis ; aucune architecture ne doit promettre la propagation d'une écriture réseau qui a échoué. Les revendications suivantes doivent toujours réussir côté base avant d'appeler OFF.

Source primaire vérifiée : [documentation OFF des limites](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/) : 15 lectures produit/minute/IP, distinctes des recherches textuelles. Les six secondes restent notre politique conservatrice ; l'IP de sortie Edge peut être partagée et il n'existe pas ici de compteur fiable « restant sur 15 ».

## 4. Indicateur discret

Une ligne sous Ajouter/Retirer, police 11 px et couleurs des thèmes existants, sans compteur de scans ni bouton supplémentaire :

- « OFF · délai vérifié à la recherche » avant information connue ; « OFF · aucun délai connu » après expiration, sans garantir que l'autre téléphone n'a pas utilisé le créneau.
- « Recherche OFF dans ~5 s » pour le créneau interne.
- « Open Food Facts temporairement limité ~17 s » pour un refus fournisseur connu.
- « Dernière recherche OFF indisponible » ou « OFF · connexion à vérifier » selon la cause ; démo explicitement désactivée.

Échéance locale issue du serveur, horloge locale une fois par seconde jusqu'à expiration, **aucune requête serveur de compte à rebours**. Le label d'état est annoncé poliment ; la seconde variable n'est pas une annonce live répétitive, la balise time décrit l'heure de reprise. Saisie manuelle conservée, sans création de fiche automatique.

## 5. Vérifications réalisées

- **260 tests applicatifs / 18 fichiers**, TypeScript ; refus périmés, clé de reprise après timeout, absence de publication de reçu incohérent, réponses tardives, catalogue connu sans OFF et protocole de délais/cause. Trois tests de rendu de l'indicateur.
- Base locale recréée sans seed : **119 assertions pgTAP / 3 fichiers**, **8 tests de concurrence**, **1 Auth/API**, **1 parcours SDK** avec deux vrais comptes. Scans différents simultanés, polling retardé pendant mutation, vingt-quatre scans rapides, quantités/courses cohérentes, ajustements/annulations périmés et reprise idempotente. Types générés avec db:types, lint SQL sans erreur.
- Deux contextes Chrome / deux vrais comptes locaux, vidéo et décodeur simulés : identités propres, code maintenu pendant polling sans doublon, produit suivant reçu, erreur OFF interne et saisie manuelle, caméra vivante, réponse volontairement perdue **après commit local**, reprise avec la même clé et scan suivant sans recharger. Zéro requête externe, aucune erreur JavaScript. Vues claire/sombre 390/320 px inspectées dans des captures fictives temporaires, hors Git.
- Runtime Edge local Deno : Auth et entrées refusées avant OFF. Fournisseur réel jamais appelé. OFF navigateur avec fournisseur fictif : préremplissage, corrections, réponse tardive ignorée et secours manuel réussis.
- Sauvegarde : **9 tests**, dont chiffrement GnuPG, réussis hors confinement ; le premier essai confiné ne pouvait lancer GnuPG. Adaptation contrôlée du plan aux cinq migrations et ajout de l'option avant migration `--before-lookup-budget`, sans sauvegarde Cloud effectuée. Le mode ordinaire refuse toujours les migrations en attente.
- Builds, format et recettes PWA/navigation sont rejoués avant remise ; voir bilan final dans VALIDATION.md. Aucun nouvel essai physique de ce code non publié. Les tests de régression locale ne certifient pas un objectif/lecteur Safari matériel.

## 6. Implications Cloud et ordre futur, soumis à accord

1. Examiner/approuver ce diff ; préserver les corrections sécurité/CI distinctes. Ne pas rouvrir les inscriptions, ne pas pousser main par défaut.
2. Avant toute migration Cloud autorisée séparément : sauvegarde chiffrée vérifiée avec le mode `--before-lookup-budget`, inventaire exact des quatre migrations distantes et cinquième en attente, précontrôle/dry-run. Appliquer seulement la migration préparée après accord ; comparer les empreintes des données métier. Les fixtures restent locales.
3. Déployer ensuite la fonction Edge préparée, accord séparé et JWT/origines exactes conservés. Aucun changement de fréquence, de clé ou d'origine demandé. Déployer l'Edge avant la migration provoque un échec de budget, donc un secours manuel, pas une ouverture du budget.
4. Publication frontend après nouvel accord. Le client sait lire les anciennes réponses ; l'ancien Edge garde cependant son comportement ancien tant qu'il n'est pas mis à jour. Le correctif complet OFF nécessite les trois couches. Tests de stock connus indépendants d'OFF.
5. Les scripts de CI antérieurs sont conservés : leurs tests navigateur ordinaires ne provisionnent pas PostgreSQL. Pour cette migration, les suites SQL/locales et le nouveau test scanners sont obligatoires dans la recette de fusion ; aucune infrastructure CI supplémentaire créée.

## 7. Recette iPhone/Samsung à organiser après autorisation

Prévoir d'abord un environnement de recette isolé accessible aux téléphones en HTTPS, ou faire approuver explicitement deux produits factices et leur nettoyage dans une réserve de test. **Aucune mutation de la réserve personnelle n'est autorisée par ce document.** Ne pas improviser de nouveaux comptes Cloud, tunnels, origines, services payants ou volumes de requêtes OFF.

Sur les deux appareils, charger la même nouvelle référence dans les réglages, relever versions OS/navigateur et diagnostic scanner. Présenter un code connu distinct sur chacun ; vérifier deux identités locales et quantités communes. Maintenir les codes dans le cadre, attendre plusieurs polls, puis présenter d'autres codes ; vérifier absence de doublon et continuité du flux. Tester les ajustements périmés attendus sans les contourner. Sur les seules données jetables autorisées, simuler une interruption puis reprendre la demande, sans rescanner pour refaire une intention incertaine.

Pour OFF, deux codes inconnus autorisés suffisent : une recherche occupe le créneau, l'autre doit annoncer le court délai. Fermer sans enregistrer ou saisir manuellement. Ne pas provoquer de vrai 429 fournisseur : sa recette utilise les mocks. Comparer manuellement le code lu et l'emballage si un mauvais produit réapparaît ; transmettre référence/version et diagnostic, sans tokens, comptes ni captures d'inventaire dans Git. En cas de caméra interrompue par le système, la reprise explicite demeure normale.
