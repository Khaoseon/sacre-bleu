# Livraison contrôlée des correctifs V1

Préparation du 29 octobre 2026. Branche `codex/revue-corrective-4b`, issue de `9eca5d11a42d`. Commits locaux autorisés ; aucun push, PR, fusion ou déploiement autorisé à ce stade. Aucune phase 5, V1.1 ou refonte. Diagnostic et validations détaillés dans [SCANS_SIMULTANES_OFF.md](SCANS_SIMULTANES_OFF.md) et [VALIDATION.md](VALIDATION.md).

**État final : livraison bloquée par la nouvelle exécution du parcours SDK local.** Les commits constituent un état de travail à examiner, pas un candidat validé pour fusion. La procédure future ci-dessous reste conditionnelle à la résolution de ce blocage. Aucun accord de push comme livraison prête n'est demandé.

### Blocage détecté lors de cette préparation

Sur PostgREST local **14.18**, le parcours SDK échoue de façon répétée au refus d'ajustement périmé (`shared.integration.test.ts`, après une écriture de l'autre compte). La requête expire à 10 s ; la demande est donc conservée comme incertaine et le scan ajustable n'est pas encore invalidé dans cette vue. Le test exige son invalidation et échoue. Les assertions de refus SQL directes passent, ce qui ne valide pas le trajet HTTP. Les premières étapes stock/courses/annulation du parcours SDK passent, sa suite n'est pas atteinte. La validation SDK annoncée à l'investigation précédente **ne suffit donc plus et n'est pas reconfirmée**.

Les fonctions historiques utilisent le SQLSTATE **40001** pour un refus métier définitif. La [note officielle Supabase](https://github.com/orgs/supabase/discussions/50151) décrit les nouvelles tentatives de transaction sur ce code avec PostgREST 14, corrigées en 16 ; les symptômes locaux concordent. Aucune attente de verrou n'a été observée lors du contrôle local. La version PostgREST Cloud et l'existence d'une boucle Cloud ne sont pas établies ; aucune requête de refus Cloud n'est provoquée pour les vérifier. Cela ne prouve pas la cause de la substitution de produit sur iPhone.

Ne pas augmenter arbitrairement les timeouts, désactiver les refus périmés, modifier les migrations historiques ou affaiblir les assertions pour obtenir un résultat vert. Préparer séparément une correction du transport de l'erreur, conservant exactement le refus transactionnel. Par exemple un code de conflit non relancé, avec traitement compatible pour anciens/nouveaux clients ; **PT409 n'est pas directement compatible avec l'ancien classificateur d'erreurs** et ne doit pas être adopté sans ce contrôle. Une telle migration additionnelle imposerait de revoir le plan de sauvegarde actuellement limité à la cinquième migration OFF, la matrice et les tests sur base vierge. Elle n'est pas improvisée dans ce lot de préparation.

## 1. Contrôles préalables et limites

Lecture complète des changements applicatifs, tests, configuration, sauvegarde, SQL et CI. Les quatre migrations déjà livrées, les RPC métier de stock/courses/scan, le modèle pur, les gestes et le gestionnaire PWA ne sont pas modifiés. Le reçu est suivi d'une lecture cohérente avant succès. Les demandes incertaines gardent leur clé et leur progression ; aucun retry automatique créant une nouvelle intention. Les ajustements/annulations périmés restent refusés.

Le problème précis de substitution Samsung → iPhone reste non reproduit. Les deux défauts locaux démontrés et les garde-fous supplémentaires ne constituent pas une preuve de résolution physique. La recette ci-dessous est obligatoire avant clôture du lot.

Contrôles distants effectués en lecture seule :

- GitHub confirme `Khaoseon/App_reserve` privé, branche par défaut main. Aucun workflow de déploiement Supabase ajouté ; aucun secret requis dans le workflow préparé.
- Cloudflare, panneau Branch control : production main automatique, Preview branch = **None (Disable automatic branch deployments)** ; aucun deploy hook. Projet `sacre-bleu`, production encore `9eca5d1`, déploiement `6ae15af5`. Commande effective inchangée : `npm ci && npm run build:cloud`, sortie `dist-cloud`, Node 24.22.1, image v3.
- GitHub Billing : abonnement Pro existant inclus sans souscription nouvelle ; panneau Actions : calcul **0,41 $ utilisés / 18 $ inclus**, soit 17,59 $ de crédit calcul affiché, stockage **0 Go / 2 Go**. Ne pas convertir cet affichage actuel en un nombre exact de minutes à partir d'un ancien tableau documentaire. Facturable affiché : 0 $. Budget Actions au niveau compte : **0 $, Stop usage when budget limit is reached coché** ; aucun moyen de paiement enregistré. Aucun budget n'a été modifié. Le quota est partagé avec les autres dépôts et doit être relu avant l'ouverture de PR ; son épuisement peut empêcher la CI, pas autoriser une dépense.
- Supabase Free Paris `uznbnihmdzxdnlxanjcl` : `disable_signup=true`, zéro différence déclarée du référentiel Auth minimal, empreinte des autres réglages Auth identique au contrôle de fermeture ; 2 utilisateurs confirmés, 1 réserve, 2 appartenances. Quatre versions appliquées : 20261026000100, 20261026000200, 20261026000300, 20261028000100. Edge `product-lookup` ACTIVE version 2, `verify_jwt=true`. Comptes/réserves/produits/stocks/courses/journaux/historique sont comparés par empreinte au début et à la fin de cette préparation, sans conserver de contenu privé dans Git.

Les paramètres URL/callback/SMTP/JWT ne sont pas réappliqués. Les inscriptions restent fermées. Les deux comptes existants peuvent encore appeler directement create_reserve : le masquage UI ne révoque pas ce droit et aucun gel SQL des réserves n'est inclus.

Sources officielles consultées : [contrôle des branches Pages](https://developers.cloudflare.com/pages/configuration/branch-build-controls/), [facturation Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [budgets bloquants](https://docs.github.com/en/billing/how-tos/set-up-budgets). Les données du Dashboard priment pour le quota disponible du compte.

## 2. Commits, push et PR

Deux commits locaux : code/tests/configuration/CI (`5e4ab38`), puis documentation de livraison. Leur référence finale est donnée par `git log`, sans auto-référence dans un fichier du même commit. Tous portent le préfixe **[CF-Pages-Skip]** en protection supplémentaire ; celui-ci ne remplace pas le contrôle des branches et ne désactive pas GitHub Actions.

Avant push : vérifier diff complet indexé, fichiers ajoutés, absence d'archives/.env/données privées/clé privilégiée ; comparer HEAD main distant à la base examinée ; vérifier de nouveau Preview=None et budget Actions bloquant. Ne pas utiliser `git push --all`, force ou une refspec vers main.

Après accord **push + PR privée uniquement** : pousser explicitement la branche corrective, ouvrir une PR vers main sans fusion automatique, attacher son URL au chat. La PR a la visibilité du dépôt privé, à préserver. Aucun déploiement Pages de branche attendu. Contrôler immédiatement les checks et l'absence de nouveau déploiement Cloudflare ; arrêter si la configuration a changé.

CI préparée : pull_request vers main et déclenchement manuel, un runner standard Ubuntu, timeout 15 min, actions officielles épinglées, permissions contents:read, variables de build factices. Tests unitaires/types/format/builds/navigation/PWA exécutés avant fusion ; **les suites PostgreSQL, SDK, Edge local et deux scanners restent des validations locales**, sans backend CI supplémentaire. L'activation réelle et le premier passage Linux restent à vérifier. Le déclenchement manuel peut n'être visible qu'une fois le workflow présent sur la branche par défaut.

Ne fusionner qu'après contrôle Application et PWA réussi sur le dernier commit de PR, revue et validation locale backend. Proposer séparément, puisque Pro est disponible, une protection main exigeant PR et ce contrôle après son premier passage ; ne pas modifier les permissions/règles maintenant. Sans protection, la discipline de fusion reste contournable. Le changement Pages proposé vers `npm ci && npm run verify:cloud` requiert aussi accord distinct ; il n'est pas appliqué et ne remplace pas les tests navigateur avant fusion.

**Attention à la fusion future :** employer un commit de fusion ou un titre de squash **sans [CF-Pages-Skip] ni [skip ci]** pour la publication voulue. Vérifier le contenu du commit fusionné et la référence déployée ; ne pas reprendre aveuglément le titre du dernier commit de branche.

## 3. Procédure ordonnée Supabase puis Pages — non exécutée

Chaque étape distante ci-dessous demande l'accord correspondant. Un accord de push/PR ne vaut pas accord SQL, Edge ou publication.

### A. Sauvegarder et vérifier avant migration

1. Prévoir une courte fenêtre sans écritures sur les deux téléphones ; terminer toute demande incertaine avec la même clé avant fermeture. Ne pas vider les sessions ou journaux pour simplifier la recette.
2. Après accord d'export des données/Auth, choisir avec l'utilisateur une destination privée **hors dépôt**, un mot de passe saisi uniquement dans son terminal interactif. Utiliser la procédure [SAUVEGARDE_CHIFFREE.md](SAUVEGARDE_CHIFFREE.md), avec l'exception explicitement contrôlée :

```powershell
npm run backup:cloud -- --destination CHEMIN_PRIVE_HORS_DEPOT --project-ref uznbnihmdzxdnlxanjcl --before-lookup-budget
npm run backup:verify -- --archive CHEMIN_ARCHIVE_CHIFFREE
```

3. Vérifier déchiffrement/intégrité, manifeste, empreintes, quatre sources réellement appliquées et seule cinquième en attente ; conserver une copie chiffrée indépendante. Le succès de verify prouve l'intégrité de l'archive, pas à lui seul sa restauration.
4. Après accord de copie privée locale, répéter la restauration sur une cible locale vierge isolée selon BACKUP.md, avec uniquement les quatre migrations sauvegardées et une transaction d'import. Comparer UUID, liens, quantités et empreintes, vérifier les contraintes ; supprimer la copie de recette après contrôle. Ne jamais restaurer sur le Cloud existant pour tester.
5. Conserver séparément les réglages non secrets Auth/API/SMTP/origines, la version Edge, les empreintes des sources déployées et les références Pages/Git. Les secrets restent dans leur stockage actuel ; aucune clé ni dump dans la PR.

**Arrêt :** export/verify/restauration non conforme, incohérence de données ou activité d'écriture pendant les empreintes. Aucun schéma n'est modifié tant que le point de sauvegarde n'est pas jugé exploitable.

### B. Précontrôler dépendances et versions

Vérifier cible exacte, branche propre et SHA approuvé, Supabase CLI verrouillée, PostgreSQL compatible, extension pgcrypto, objet singleton OFF et anciennes fonctions/grants conformes. La dépendance nouvelle est uniquement claim_product_lookup_slot ; aucun changement de signature métier.

```powershell
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Lire la cible liée avant ces commandes ; la liste/dry-run doivent annoncer **uniquement 20261029000100_lookup_budget_details.sql** à appliquer. Arrêter pour toute divergence, migration manquante, modification des quatre sources historiques ou commande demandant un changement inattendu. Ne pas employer migration repair pour forcer l'alignement.

Préparer également les sources de retour Edge depuis `9eca5d11a42d` : index **et tous ses imports transitifs locaux**, configuration de déploiement et version CLI. L'ancien index seul ne suffit pas, car il importe des fichiers src modifiés. Conserver ce paquet hors répertoire servi et hors données publiques. La version Edge 2 est la référence distante relevée, à revérifier.

### C. Appliquer la migration PostgreSQL — accord SQL séparé

Après nouveau dry-run exact, appliquer via la CLI liée au projet validé : `npx supabase db push --linked`. Ne pas lancer config push, reset ou fixtures sur Cloud.

La migration ajoute blocked_reason sur le singleton OFF et claim_product_lookup_slot ; claim_product_lookup conserve son contrat booléen et le même verrou partagé. Aucun ajustement de stock/courses, migration historique, compte ou appartenance n'est modifié. Contrôler la présence de la cinquième version, définitions/grants/search_path et empreintes métier avant de poursuivre. Ne pas invoquer la RPC de budget dans un audit dit purement en lecture seule : elle modifie le singleton.

Une erreur d'application impose de relire catalogue et historique : ne pas présumer une application nulle ou complète, ne pas relancer à l'aveugle. La migration est répétée localement sur base vierge ; ce n'est pas une garantie contre une interruption distante.

### D. Déployer Edge — accord séparé

Après confirmation SQL : `npx supabase functions deploy product-lookup --project-ref uznbnihmdzxdnlxanjcl`. Conserver la vérification JWT ; **ne jamais ajouter --no-verify-jwt** au déploiement Cloud. Conserver les secrets/env et les cinq origines exactes existantes ; aucun secrets set ni nouvelle origine requis.

Contrôler ACTIVE, nouvelle version, JWT et paquet réellement livré. Préflights autorisés/refusés et requêtes sans token/invalide peuvent être vérifiés sans appel OFF ni mouvement de stock. Une vérification connectée de créneau ou d'un code inconnu consomme le budget et peut appeler OFF : demander l'accord de recette correspondant, ne pas la présenter comme un contrôle sans écriture.

### E. Compatibilité et sécurité avant fusion

| État intermédiaire                             | Comportement attendu                                                                                                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ancien SQL + ancienne Edge + ancien frontend   | Production actuelle, avec ancienne attente OFF trop longue.                                                                                                                                         |
| Nouveau SQL + ancienne Edge                    | Ancienne RPC booléenne compatible ; stocks/scans connus inchangés. OFF conserve l'ancien comportement de minute. On peut s'arrêter ici sans publier le frontend.                                    |
| Nouveau SQL + nouvelle Edge + ancien frontend  | Recherches et scans restent compatibles. L'ancien client ignore budget et traite tout 429 comme rate-limit, avec son minimum 60 s ; aucune fréquence accrue.                                        |
| Nouveau SQL + nouvelle Edge + nouveau frontend | Délais/cause détaillés et protections scanner complètes. Anciens clients installés peuvent coexister jusqu'à leur mise à jour.                                                                      |
| Ancien SQL + nouvelle Edge, ordre incorrect    | RPC détaillée absente : recherche OFF indisponible, secours manuel ; aucun appel fournisseur sans créneau acquis. Stopper et rétablir l'ancienne Edge après accord, plutôt que publier le frontend. |
| Nouveau frontend + ancienne Edge               | Contrat ancien accepté ; attente 60 s encore possible, testée explicitement. La correction OFF complète n'est pas livrée.                                                                           |

Vérifier `disable_signup=true`, mêmes comptes/appartenances, callbacks/SMTP/JWT inchangés, données métier identiques pendant la fenêtre sans écriture. Pas de nouvel utilisateur Cloud pour tester un refus. La confidentialité reste fondée sur Auth/RLS ; la démo utilise des données fictives. Contrôler les refus de non-authentification et origines étrangères sans exposer de contenu privé.

### F. Fusion et publication Pages — accord explicite final

Après validation Supabase, checks de PR et accord, fusionner vers main. Cette fusion déclenche automatiquement Pages ; ne pas traiter fusion et publication comme des permissions indépendantes sans expliquer ce lien. Vérifier le message de fusion sans préfixe d'omission, Node/commande/sortie, build et SHA de production. Ne pas déclencher de publication manuelle supplémentaire.

### G. Contrôler après publication

Vérifier HTTPS, en-têtes, manifeste/worker et référence ; connexion des deux comptes, absence de bouton d'inscription Cloud, démonstration OFF correctement décrite. Charger volontairement la mise à jour sur chaque téléphone après fermeture des saisies/demandes en cours, contrôler la référence dans les réglages. Aucun effacement du stockage Auth ou du journal de reprise.

Exécuter la recette physique autorisée ci-dessous, relever résultats et divergences. L'ancien WebAPK et le contenu web peuvent se mettre à jour à des moments différents ; ne pas demander une réinstallation ou suppression de données pour masquer un problème. Documenter la référence réellement chargée par chaque appareil.

## 4. Arrêt et retour sûr

- Avant SQL : ne rien appliquer si un précontrôle échoue ; production inchangée.
- Après SQL seul : laisser les ajouts compatibles en place et garder l'ancienne Edge. **Pas de down migration automatique**, pas de suppression de colonne/fonction, pas de modification manuelle de l'historique.
- Après Edge : arrêter la livraison en cas de régression. Après accord, redéployer le paquet ancien complet contre le nouveau SQL compatible. Ne pas rouvrir signup, changer les clés ou raccourcir un blocage fournisseur pour faire passer un contrôle. Si une persistance de refus OFF échoue, son avertissement serveur doit être examiné ; aucune garantie de propagation durable ne peut être annoncée.
- Après frontend : arrêter les essais et les écritures en cas de produit erroné, doublon ou incohérence. Noter les intentions en attente ; ne pas les rejouer avec de nouvelles clés et ne pas corriger les quantités au hasard. Un retour Pages à la version de production conservée est une écriture distante nécessitant accord. Il ne retire pas instantanément les workers déjà installés ; guider chaque appareil avec son diagnostic, sans vider son journal. Le nouveau SQL peut rester en place ; l'ancienne Edge et l'ancien frontend restent compatibles.
- Restaurer une sauvegarde est un dernier recours préparé sur cible neuve, jamais une annulation SQL supposée sans conséquence. Elle peut perdre toutes les écritures postérieures et nécessiter une nouvelle connexion Auth ; décision et accord spécifiques, inventaire des écritures à préserver. Aucun reset de production.

## 5. Recette physique courte obligatoire

**Préparation, accord de données requis :** choisir une réserve de test accessible aux deux comptes ou deux produits jetables A/B explicitement autorisés dans la réserve actuelle. Ne pas créer une réserve, un compte ou des produits Cloud sans accord. Si la réserve actuelle est retenue, accepter explicitement que les essais modifient sa révision et invalident d'anciens ajustements ; réserver une fenêtre sans autre activité. A/B doivent avoir des codes distincts absents du catalogue, des quantités connues suffisantes (ex. 10) et une ligne de courses liée (ex. 5), relevées avant essai. Pas de données privées dans les captures de PR.

Relever modèle, OS/navigateur, même référence de build dans les réglages et état du diagnostic sur chaque téléphone. Tableau de résultats : heure, cas, code attendu/observé sur chaque appareil, quantités/courses attendues/observées, version, demande en cours/incertaine ; conserver ce relevé privé, ne publier que le verdict anonymisé.

| Cas                      | Manipulation et résultat attendu                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produits différents      | Scanner A sur Samsung et B sur iPhone au même signal ; répéter 5 fois avec retrait du cadre entre lectures. Chacun garde son produit local après plusieurs polls ; +1 par lecture volontaire, mêmes totaux sur les deux appareils.                                                                                                                                                                                                                               |
| Même produit             | Scanner A simultanément sur les deux ; total +2, jamais +1 ou +3. Chacun affiche A. Maintenir le code dans le cadre 10 s : aucun mouvement supplémentaire involontaire.                                                                                                                                                                                                                                                                                          |
| Scans rapides            | Alterner des présentations/retraits volontaires de codes connus, compter 24 lectures en environ une minute si physiquement réalisable. Aucun message de limitation OFF ne doit bloquer ces produits ; compter les succès confirmés, pas les images caméra.                                                                                                                                                                                                       |
| Ajustement et annulation | D'abord scan puis ajustement/annulation sur un appareil sans autre écriture : quantités et courses compensées. Ensuite scan local, écriture depuis l'autre appareil, tentative d'ajustement/annulation périmée : refus attendu sans retour arrière global. Deux tentatives concurrentes : seul ce qui reste valide peut réussir ; comparer aux reçus et état serveur, pas à une restauration supposée des deux actions.                                          |
| Inconnus et OFF          | Deux codes inconnus autorisés presque simultanément : l'un peut rechercher, l'autre reçoit le court délai restant ; un code connu reste scannable pendant ce délai. Après échéance, nouvelle recherche explicite possible ; saisie manuelle possible sans enregistrement automatique. Ne pas provoquer de vraie saturation fournisseur : son HTTP 429 est couvert par mocks.                                                                                     |
| Réseau et reprise        | Sur A/B uniquement : couper le réseau avant envoi → aucun faux succès. Pour une réponse incertaine, interrompre le réseau autour d'une demande, rétablir puis Reprendre avec la même clé ; vérifier un seul mouvement. Si aucune réponse incertaine n'a été obtenue physiquement, noter le cas non reproduit plutôt que prétendre l'avoir validé ; l'essai automatisé perd réellement la réponse après commit local. Vérifier le scan suivant sans fermer l'app. |

**Arrêt immédiat :** mauvais produit, quantité inattendue, doublon ou caméra durablement bloquée. Arrêter les deux scanners, relever diagnostics et référence, vérifier l'état confirmé avant toute action. Ne pas insister avec des codes inconnus.

**Nettoyage après accord précis :** attendre que toutes les demandes soient résolues ; vérifier les totaux par les deux comptes, nettoyer uniquement A/B et leurs courses jetables par les RPC autorisées. Ne jamais réinitialiser une révision, supprimer des journaux d'idempotence ou modifier les produits réels pour retrouver le total initial. Les traces métier peuvent légitimement rester dans les journaux ; « nettoyage » ne signifie pas effacement de l'historique. Valider l'absence d'effet sur les produits/courses personnels par empreintes prises pendant la fenêtre sans autre écriture.

## 6. Autorisations à donner séparément

1. Push de la branche corrective et ouverture de PR privée, avec exécution de la CI dans le budget existant bloquant ; aucune fusion.
2. Export chiffré Cloud/Auth et répétition de restauration locale privée.
3. Application de la seule migration approuvée après précontrôle et sauvegarde validés.
4. Déploiement du paquet Edge approuvé, sans changement de secrets, origines ou JWT.
5. Éventuelles protections main / commande de build Pages : réglages séparés, facultatifs, non appliqués.
6. Fusion main entraînant publication Pages automatique, après contrôles backend/CI et confirmation du contenu.
7. Création/utilisation/nettoyage des données jetables pour la recette physique. Aucun accord technique précédent n'autorise des mutations de stocks personnels.

Pour un incident, une autorisation de retour Edge/Pages ou de restauration doit préciser l'action et les références ; aucun retour destructeur implicite. Le lot V1 ne sera déclaré physiquement validé qu'après le résultat des deux téléphones.
