> Historical French record. Dates, commands and approval states below belong to their original phase; do not use them as current setup instructions. See the [English documentation index](README.md), [current installation guide](INSTALL.md) and [translation inventory](README.md#organization-and-translation-inventory).

# Clôture du lot de stabilisation V1 — 30 octobre 2026

**Lot livré et clôturé après autorisation globale explicite de l'utilisateur.** Sacré bleu reste accessible sur [sacre-bleu.pages.dev](https://sacre-bleu.pages.dev). Phase 5 et V1.1 non commencées. Ce bilan décrit l'état courant ; les rapports de préparation conservent leur historique daté.

## Références de livraison

| Élément                   | Résultat vérifié                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR privée                 | [#1](https://github.com/Khaoseon/App_reserve/pull/1), fusionnée le 30 octobre à 10:16:55 UTC                                                          |
| Commit approuvé et testé  | `455c04735fde2b0b50d5baa3b4950b33c7e059c8`                                                                                                            |
| CI avant fusion           | [41038008117](https://github.com/Khaoseon/App_reserve/actions/runs/41038008117), terminée avec succès sur ce commit exact, navigation et PWA incluses |
| Commit de fusion publié   | `62f7f92bcb01f3e5a38545fc091f776c5f17ceed` ; aucun marqueur d'omission dans le message de fusion                                                      |
| Cloudflare production     | `de611bc3-412c-4277-b13a-c8418f5a0241`, succès à 10:17:35 UTC, durée affichée 37 s                                                                    |
| Version réellement servie | `0.1.0 · 62f7f92bcb01`, vérifiée dans le module HTTPS et les réglages de l'interface publique                                                         |
| Build Cloudflare          | Node 24.22.1, `npm ci && npm run build:cloud`, `dist-cloud`                                                                                           |
| Supabase                  | Projet Free Paris existant `uznbnihmdzxdnlxanjcl`                                                                                                     |
| Migrations appliquées     | Uniquement `20261029000100` puis `20261029000200` ; six versions historiques désormais alignées                                                       |
| Edge product-lookup       | Version **3**, ACTIVE, `verify_jwt=true`                                                                                                              |

Le code applicatif du commit de fusion est identique au commit approuvé. La documentation de clôture est consignée séparément, sans nouveau déploiement applicatif. Production automatique depuis main conservée ; les entrées de la branche corrective étaient ignorées, sans prévisualisation publiée. Aucun forfait ni réglage Cloudflare modifié.

## Séquence exécutée et données préservées

Avant SQL : PR non fusionnée, main encore à `9eca5d1`, CI exacte verte, cible liée contrôlée, dry-run limité aux deux migrations autorisées. L'archive chiffrée originale déjà vérifiée et restaurée n'a pas été remplacée. Les onze empreintes distantes correspondaient encore à son manifeste. La restauration complète sur cible locale isolée avait validé les données, les liens, les protections, le rollback d'un import volontairement défaillant et le refus d'un second import sur cible remplie ; cible jetable supprimée.

Après migrations, après Edge puis après publication : les **dix tables métier/Auth** sauvegardées conservent leurs empreintes exactes. Elles couvrent comptes/identités, réserve/appartenances, catalogue, stocks, courses, invitations, reçus idempotents et opérations de scan. Le singleton technique OFF est exclu de cette comparaison après migration, puisque l'ajout autorisé de blocked_reason change sa représentation ; aucune différence métier inexpliquée. Deux comptes confirmés, une réserve et deux appartenances conservés. Aucune fixture ou mutation métier de test exécutée sur Cloud.

Les paramètres Auth sont inchangés par rapport au précontrôle : **disable_signup=true**, zéro différence déclarée du référentiel minimal et mêmes autres réglages qu'après fermeture. Aucun changement de callbacks, email/SMTP, récupération, JWT ou révocation de session demandé/exécuté. Les empreintes des secrets Edge sont inchangées. Une nouvelle connexion physique n'a pas été testée pendant cette livraison ; les vérifications de conservation sont techniques, sans utilisation des mots de passe.

Les trois définitions SQL déployées (mutate_reserve et les deux contrats de budget OFF) correspondent exactement aux corps approuvés ; modes de sécurité et search_path vide conformes. Audit RLS/privilèges : **zéro violation**. Aucune transaction longue ou idle in transaction détectée aux contrôles. Aucun reset, restauration Cloud, rollback SQL, terminaison de session ou migration supplémentaire.

## Correctifs livrés et validations

- Identité locale des scans, protection contre les réponses tardives et délais bornés ; demandes incertaines reprises avec leur clé initiale.
- Refus métier périmés : SQLSTATE **PGRST**, HTTP **409**, code JSON **40001**. Les gardes auteur/version/révision/stock/courses et l'idempotence restent identiques. Les anciens clients reconnaissent le code ; pas de relance PostgREST infinie pour ces refus.
- Budget OFF partagé de six secondes, motifs et délais réels, blocage fournisseur distinct, indicateur discret ; ancienne RPC booléenne conservée pour la transition.
- Interface Cloud réservée aux comptes autorisés, textes de démonstration OFF corrigés, hauteur input/select alignée sans affaiblir les tests.
- CI simple de PR exécutant application, types, format, builds, navigation et PWA ; suites PostgreSQL/SDK/Edge et deux scanners validées localement avant livraison, pas revendiquées comme exécutées dans GitHub Actions.

Validation préalable conservée : 262 tests applicatifs, 119 assertions pgTAP, huit tests concurrents, Auth/API, SDK avec ancien/nouveau client et perte réelle de réponse après commit local, Edge local, recettes navigateur navigation/OFF/PWA/deux scanners et dix tests de sauvegarde. Le premier échec CI Linux reste documenté dans VALIDATION.md ; aucun test supprimé ni tolérance relâchée.

Contrôles Cloud de livraison : **12 vérifications HTTP** sans session utilisateur, sans appel fournisseur et sans mutation métier : cinq préflights autorisés, deux origines étrangères/prévisualisation refusées, trois accès Edge sans authentification valide refusés et deux accès API anonymes refusés. Origines exactes conservées : adresse HTTPS canonique et quatre adresses locales existantes.

Après publication : HTTPS, en-têtes CSP/nosniff/DENY/no-referrer/noindex, manifeste plein écran, icônes et workers accessibles. Aucune règle de cache privé Supabase ajoutée au worker. Interface publique de connexion affichée sans inscription, référence exacte visible dans les réglages. Un premier contrôle temporaire examinait le script de thème au lieu du module applicatif : script d'audit corrigé, version réellement publiée conforme, aucun correctif de production supplémentaire.

## Limites et suivi

**Le bug physique exact de substitution Samsung/iPhone n'a pas été reproduit.** L'utilisateur a explicitement dispensé une nouvelle recette physique avant cette publication et accepté une surveillance en usage réel. Les essais locaux avec caméra/décodeur fictifs et deux clients ne prouvent pas sa résolution sur matériel. Aucun nouveau test physique n'est revendiqué ni exigé pour clôturer ce lot.

Pour charger la livraison sur un appareil déjà ouvert : terminer les saisies, résoudre les demandes en attente, quitter Scanner et fermer les autres fenêtres, puis utiliser la notification de mise à jour ou Paramètres → Vérifier les mises à jour. La référence attendue est `62f7f92bcb01`. Ne pas vider le stockage, supprimer le journal de reprise ou réinstaller pour forcer une mise à jour. Le WebAPK Android peut évoluer séparément du contenu web.

En cas de mauvais produit, doublon ou quantité inattendue : interrompre les scans/écritures, conserver référence et diagnostics sans données personnelles, examiner les reçus et l'état confirmé. Aucun retour SQL automatique. Toute restauration ou retour Edge/Pages demande une décision spécifique ; garder la migration de transport pour ne pas réintroduire les relances. Procédure de référence : [LIVRAISON_CORRECTIFS_V1.md](LIVRAISON_CORRECTIFS_V1.md).

Les comptes existants gardent leurs droits API de création de réserve ; la fermeture des inscriptions et le masquage UI ne constituent pas un plafond SQL global. Aucun gel global des réserves ni refonte visuelle ajouté. Aucun service payant, dépassement facturé volontaire ou nouvelle infrastructure créé. Les travaux futurs restent soumis à une nouvelle conversation et un nouveau périmètre.
