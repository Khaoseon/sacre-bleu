# Validation — phases 1, 2A, 2B, 2C et 3

**Phase 5 publiée et clôturée le 30 octobre 2026 après accord global.** [PR #3](https://github.com/Khaoseon/App_reserve/pull/3) fusionnée, code approuvé `d2458dc`, [CI complète 41045964921 verte](https://github.com/Khaoseon/App_reserve/actions/runs/41045964921), publication applicative `6fc72c965482` / Cloudflare `8ae63b4b-e448-47c5-b07a-313a0105a116`. Seule migration `20261030000100` appliquée, sept versions alignées, onze empreintes identiques immédiatement après migration, sécurité et anciennes routines inchangées. Après publication, dix empreintes restent exactes et la différence Auth est prouvée limitée à `updated_at`, tous les autres champs identiques ; diagnostic en lecture seule, aucun import ni rollback. Auth/configuration/Edge v3 conservés. Quinze ressources HTTPS, six en-têtes, quatre refus de lectures anonymes et Chrome neuf/PWA hors ligne vérifiés ; aucun appel de mutation réelle ni session utilisateur. [Bilan et limites](HANDOFF_5.md). Les constats de préparation ci-dessous sont antérieurs à l’accord ; aucune phase 6/V1.1 ou nouvelle recette physique commencée.

**Phase 5 — 30 octobre 2026, préparation locale :** 293 tests applicatifs, 149 assertions pgTAP sur base vierge/sept migrations, dix tests multi-connexions, Auth/API et SDK/ancien client, douze tests de sauvegarde réussis. Chrome compilé et comptes fictifs : export/import avec égalité du domaine et liens, fichier corrompu refusé, aperçu sans mutation, téléchargement/confirmation requis, réponse perdue après commit puis reprise idempotente, conflit de révision, fermeture/relance PWA hors ligne avec jeton expiré, reconnexion, isolation de deux comptes et déconnexion multi-onglets/hors ligne. Aucune réponse privée en CacheStorage, requête externe ou erreur JS. Aperçu 320/390/1024 contrôlé, débordement intérieur corrigé et capture fictive inspectée. Navigation et mises à jour PWA existantes réussies. Audit Cloud en lecture seule : zéro violation, deux comptes/une réserve/deux membres, seule septième migration au dry-run, aucune application. [Preuves, limites et CI/livraison](HANDOFF_5.md), [contrat utilisateur et récupération](PHASE5.md). La phase 5 n’est pas publiée et aucun téléphone réel n’a encore été testé pour ces fonctions.

## Livraison technique et clôture V1 — 30 octobre 2026

Après autorisation globale : CI réussie sur le commit exact `455c047` ([run 41038008117](https://github.com/Khaoseon/App_reserve/actions/runs/41038008117)), restauration isolée complète déjà validée et empreintes Cloud comparées à l'archive originale. Deux migrations autorisées appliquées, définitions SQL/grants/search_path vérifiés, Edge v3 ACTIVE/JWT conservé, douze contrôles HTTP anonymes/CORS réussis sans appel OFF ni écriture métier. Audit RLS sans violation et aucune transaction longue détectée. Comptes/réserve/appartenances/catalogue/stocks/courses/journaux identiques ; Auth, secrets et origines inchangés, disable_signup=true.

PR #1 fusionnée en `62f7f92bcb01f3e5a38545fc091f776c5f17ceed` ; Cloudflare a publié ce commit avec succès. HTTPS, protections, manifeste/icônes/workers et version `0.1.0 · 62f7f92bcb01` dans l'interface publique vérifiés. Un contrôle temporaire choisissait le script de thème au lieu du module applicatif ; corrigé dans l'audit, sans changement de production. Aucun nouveau test physique Samsung/iPhone : dispense explicite et non-reproduction du bug exact conservées. [Rapport consolidé et limites](HANDOFF_V1_STABILISATION.md). Les recettes et anciens états ci-dessous gardent leur chronologie ; phase 5/V1.1 non commencées.

## Clôture de la recette principale phase 3 — 28 octobre 2026

**Dernier retour utilisateur : « Super tout fonctionne ! »**, incluant les préférences minimalistes, les thèmes et la mémorisation caméra après réouverture. Caméra réelle EAN-13, protection dix secondes, ajustements/annulation avec courses positives, interruptions/reprise et synchronisation des deux comptes confirmés sur iPhone/Samsung. Sauts de page Safari corrigés et retestés. État initial observé de cette reprise et état final restauré : **stock 2 / courses 0**, confirmation utilisateur sur les deux téléphones ; aucune écriture Cloud à la clôture ni audit direct de la base.

**Nettoyage effectué :** arrêt du serveur, zéro écoute TCP 4443 vérifié ; preview locale arrêtée ; seule autorité de recette retirée de Windows CurrentUser/Root par empreinte exacte et absence contrôlée ; clés/autorité/certificats dédiés dans `.tmp/phone-tls` et `.tmp/phone-public`, ainsi que binaire `.tools/mkcert.exe`, supprimés. Aucun certificat système, règle de pare-feu, profil réseau ou donnée Supabase modifié. Règles larges Node.js préexistantes conservées. L’utilisateur confirme le retrait des profils/autorités sur les deux téléphones, des copies publiques/messages de transfert et la fermeture des onglets (contrôle déclaratif). Aucun transfert de clé privée. Sauvegardes et outils sans rapport avec la recette préservés.

**Vérifications de livraison :** 183 tests / 13 fichiers, TypeScript strict, builds local/Cloud, formatage, diff ; deux tests du serveur privé. Aucun backend/migration/dépendance modifié dans cette reprise ; suites backend antérieures conservées comme référence. Capture de démo uniquement, aucun inventaire privé versionné. Dépôt GitHub confirmé privé avant publication demandée sans force push. Détail technique et reprise dans `HANDOFF_3.md`.

**Limites conservées :** pas de recette physique EAN-8/UPC-A, multi-produits, retrait/représentation/répétition explicite, Retirer/refus à zéro, inconnu/saisie de secours, refus caméra, navigation/déconnexion, rotation/clavier, lampe/vibration, conflit concurrent ou réponse RPC perdue sur téléphone. Netteté iPhone moyenne, aucune vitesse mesurée ; versions OS déclarées. Tests automatisés/2C ne remplacent pas ces observations. Installation PWA, déploiement et hors ligne privé restent hors de cette recette. **Clôture de la recette principale, pas certification de toute la matrice. Aucune phase suivante commencée.**

## Déroulement iPhone et synchronisation — 28 octobre 2026 (historique avant clôture)

**Complément le plus récent :** choix automatique des objectifs confirmé par l’utilisateur sur les deux téléphones après le build à 156 tests. À sa demande, évolution frontend supplémentaire : en-tête Scanner retiré, roue crantée seule visible avec nom accessible, panneau Préférences compact ; palettes Sauge claire/sombre, Automatique, Ardoise, Rétro crème/pétrole à fonds unis (contrastes testés, couleurs Ajouter/Retirer conservées). Sections de compte/données repliées. Choix manuel caméra déplacé dans les préférences du Scanner et désormais persisté dans le navigateur (`app-reserve.camera.v1`, id/libellé, secours par libellé si ID changé), sans transfert ni lien avec le stock ; erreur de mémorisation explicitement affichée sans remplacer le choix précédent. Démarrage caméra toujours explicite. Les mentions de choix limité à la session dans les paragraphes antérieurs décrivent l’étape précédente. **183 tests / 13 fichiers**, TypeScript, builds local/Cloud, formatage et diff vérifiés. Rendu du scanner, roue seule, panneau, thèmes rétro inspectés sur démo locale isolée à 390 et 320 px sans débordement horizontal ; capture synthétique `screenshots/preferences-retro-cream.png`. Ces contrôles ne valident pas la persistance réelle après réouverture sur Safari/Chrome : retest demandé. Aucun changement Cloud ou métier pour cette évolution, référence toujours stock 2 / courses 0.

Appareils déclarés par l’utilisateur : **iPhone 17, iOS 26.6.2, Safari**, et Samsung Android 13 / One UI 5.1, Chrome. Version iOS déclarative, modèle Samsung et versions exactes des navigateurs non relevés. Résultats physiques ci-dessous confirmés par l’utilisateur, sans pilotage distant des téléphones ni audit indépendant de la base.

- Accès HTTPS privé initialement bloqué : processus Node et écoute corrects, certificat valide pour l’IP du PC, mais timeout TCP même depuis le PC. Après accord, arrêt par le terminal d’origine et relance hors du bac à sable, paramètres identiques : vérification TLS locale réussie puis HTTP 403 attendu pour le PC non autorisé. Safari obtient ensuite l’application. Le confinement est la cause probable, sans traçage réseau le prouvant formellement. Aucun pare-feu ni profil réseau modifié. Deux règles Windows Node.js préexistantes TCP/UDP sur Private/Public, tous ports/adresses, ont été constatées en lecture seule ; elles ne sont pas créées par cette session.
- État réellement observé avant essais : **stock 2 / courses 0**, différent du dernier état rapporté à la session précédente. L’utilisateur indique avoir fait d’autres essais Samsung sans les rapporter ; aucune régression n’est déduite de cet écart. Cette nouvelle référence est conservée.
- Après autorisation d’accès au Samsung, deux comptes distincts de la même réserve affichent « Synchronisé », stock 2 et courses vides sur les deux téléphones.
- iPhone : autorisation caméra, aperçu, netteté sur texte ordinaire, arrière-plan dix secondes puis pause et reprise explicite confirmés globalement. Lecture physique du code de sauce tomate puis maintien dix secondes sans doublon confirmés lors du parcours suivant ; durée de reconnaissance et conditions optiques précises non relevées.
- Après accord pour les mutations Cloud temporaires : course liée ajoutée à 5, scan Ajouter (stock 3 / courses 4), total traité 5 (stock 7 / courses 0), puis 3 (stock 5 / courses 2), Annuler (stock 2 / courses 5), suppression de la seule ligne ajoutée. L’utilisateur confirme l’ensemble du parcours, la convergence des deux comptes et le retour à **stock 2 / courses 0**. Pas de fixture ni d’accès direct aux tables.

**Anomalie iPhone corrigée et retestée :** sauts/déplacements de page à chaque +/− du dernier scan, absents sur Samsung selon l’utilisateur. Le rendu insérait puis retirait un bandeau d’enregistrement au-dessus du contenu pendant chaque mutation, ce qui changeait sa position verticale. Correction ciblée : indication d’écriture dans la barre supérieure existante avec statut accessible ; bandeau principal réservé aux erreurs, états non synchronisés ou demandes à reprendre hors écriture active. Verrouillage et confirmation après reçu/snapshot conservés. Deux tests de rendu vérifient les phases d’attente et le maintien du parcours de reprise après réponse incertaine. **L’utilisateur confirme le retest Safari réussi**, parcours proposé scan (stock 3), + (4), − (3), Annuler puis contrôle final stock 2 / courses 0 sur les deux appareils. 148 tests, TypeScript, builds local/Cloud et formatage réussis avant ce retest.

**Choix d’objectif, amélioration en cours :** l’utilisateur identifie « camera 0, facing back » sur Samsung et « Double camera grand angle arriere » sur iPhone comme les objectifs donnant les meilleurs résultats de sa recette. La qualité reste moyenne sur iPhone. À sa demande, préférence automatique pour ces libellés (accents/casse normalisés, variante anglaise « Back Dual Wide Camera »), après permission et avant décodage. Si le navigateur a déjà choisi cet objectif, aucun second flux ; sinon fermeture du flux provisoire avant réouverture. En cas d’indisponibilité matérielle, une seule tentative de retour au choix arrière du navigateur ; refus de permission non relancé automatiquement. Choix manuel prioritaire, gardé uniquement pour la session. Liste manuelle repliée sous « Changer de caméra », contrôles clavier/toucher conservés. Cette préférence empirique n’est pas une mesure universelle de netteté et n’améliore pas par elle-même la qualité optique. Tests simulés ajoutés pour sélection, repli, priorité manuelle et cycle ; **choix automatique physique à retester sur les deux téléphones**.

**Session non clôturée :** serveur HTTPS privé encore actif, limité aux deux téléphones après accord. Nettoyage complet des éléments de recette autorisé par l’utilisateur : arrêt du serveur, retrait des autorités de recette sur les appareils et Windows utilisateur, suppression des clés/fichiers temporaires dédiés à contrôler en clôture. Aucune clé privée transférée, aucun certificat de recette modifié pendant ce diagnostic. Les règles Node.js préexistantes nécessitent une décision distincte avant modification. Pas d’Open Food Facts, déploiement ou nouvelle phase. Les scénarios complémentaires non effectués de la recette initiale restent ouverts ; le test réseau ci-dessus concerne l’accès au serveur statique, pas une réponse RPC perdue.

## Session de recette réelle Samsung clôturée — 27 octobre 2026

Téléphone personnel sous **Android 13 / One UI 5.1**, interface anglaise, navigateur **Chrome Android**. Modèle exact et version Chrome restent à relever. Résultats ci-dessous rapportés par l’utilisateur ; l’agent a préparé le serveur et examiné les captures fournies, sans piloter le téléphone.

### Résultats acquis à la fin de cette session

L’utilisateur confirme le succès du dernier parcours de quantités puis du test d’interruption. Ces confirmations complètent les constats historiques détaillés plus bas ; aucun audit SQL/API indépendant du stock final n’a été lancé.

| Essai physique Samsung                           | Résultat confirmé par l’utilisateur                                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| HTTPS privé, connexion existante, caméra réelle  | Écran synchronisé et aperçu obtenus ; cadrage corrigé confirmé                                                             |
| Lecture du code EAN-13 de l’emballage autorisé   | Produit reconnu et ajouté après correction autofocus/choix d’objectif                                                      |
| Même code maintenu dix secondes                  | Un seul ajout, pas de double lecture involontaire observée                                                                 |
| Quantités du dernier scan Ajouter                | Parcours proposé et confirmé globalement : stock initial 1, scan → 2 ; total traité 5 → stock 6 ; total traité 3 → stock 4 |
| Annuler après ajustements                        | Retour déclaré à **stock 1 / courses 0**, état initial de la recette                                                       |
| Passage à l’écran d’accueil pendant dix secondes | Arrêt de l’usage caméra, disparition de l’indicateur, retour en pause puis reprise normale confirmés                       |

**Clôture technique :** serveur HTTPS temporaire arrêté par l’agent et absence d’écoute sur le port 4443 contrôlée. Aucun changement de pare-feu à supprimer. Autorité de recette conservée dans le magasin du compte Windows et sur le Samsung pour la future reprise ; aucune clé privée transférée. Les fichiers TLS restent hors Git. Dépôt privé, documentation de cette session commitée et poussée après vérification.

**Reste non validé physiquement :** iPhone/Safari et installation PWA ; synchronisation du stock et des courses sur le second compte/appareil ; EAN-8/UPC-A et plusieurs produits successifs ; retrait/représentation du même emballage et répétition explicite ; mode Retirer et refus à zéro ; déduction/restauration de courses ayant une quantité positive au départ ; inconnu et saisie de secours sur téléphone ; panne/réponse réseau incertaine ; refus de permission et interruptions supplémentaires ; lampe et vibration. Les tests automatisés déjà décrits couvrent une partie de ces cas, sans remplacer leur recette physique. Aucun temps chiffré de reconnaissance, modèle précis, version Chrome ou objectif effectivement choisi relevé. La netteté est suffisante pour la lecture validée, sans isoler l’effet de l’autofocus de celui du choix d’objectif. Cette clôture porte sur **la session effectuée**, pas sur une validation complète Android/iOS de la phase 3.

**Contrôles de clôture :** 146 tests applicatifs / 11 fichiers, TypeScript, builds local/Cloud et formatage réussis ; règles de stock, RPC et migrations inchangées. Aucun Open Food Facts, service hébergé ou tunnel public ajouté.

### Déroulement de la session (historique)

- Essai USB abandonné : transfert de fichiers fonctionnel et interfaces USB/ADB sans erreur signalée par Windows, mais Chrome PC reste « Offline / Pending authentication ». La seule fenêtre photographiée était l’activation générale « Allow USB debugging? », pas une autorisation RSA de ce PC. Révocation des autorisations, reconnexion, mode PTP et réactivation n’ont pas fait apparaître la demande RSA. Cela ne valide aucun parcours du scanner par USB.
- Après accord explicite : mkcert 1.4.4 téléchargé depuis la publication officielle, SHA-256 vérifié contre le manifeste Microsoft Winget. Autorité de recette isolée dans `.tmp/phone-tls/ca`, clé privée conservée sur le PC et ignorée par Git. Confiance Windows confirmée dans **CurrentUser/Root uniquement** ; aucun ajout LocalMachine. Seul le certificat public, vérifié sans clé privée, a été préparé pour transfert. L’utilisateur confirme son installation comme certificat CA sur le Samsung.
- Après un accord distinct : serveur statique HTTPS démarré sur la seule IPv4 Wi-Fi privée du PC, port 4443, liste d’accès limitée à l’IPv4 du Samsung. TLS vérifié depuis le PC avec l’autorité locale ; requête du PC refusée 403 comme attendu. **Aucune modification du pare-feu**. L’utilisateur confirme l’écran de connexion sur Chrome Samsung, puis la connexion existante et l’état « Synchronisé » visible sur la capture.
- **Premier flux caméra réel obtenu sur Samsung**, après activation et permission. Capture transmise par l’utilisateur : vidéo portrait étroite au milieu d’un aperçu horizontal, avec bandes noires latérales ; cadre vert débordant sur ces bandes. Commandes Arrêter/Lampe visibles ; présence du bouton Lampe ne prouve pas son fonctionnement. Aucune lecture physique de code, vitesse de reconnaissance, quantité, vibration ou synchronisation entre comptes n’est encore validée. Aucune mutation de stock de test n’a été autorisée ou effectuée par l’agent à ce stade.

Correction ciblée après ce constat : aperçu en `object-fit: cover`, centré, sans étirement. Même taille de cadre, mais dimensions partagées entre la vue et le décodeur ; projection du cadre visible vers les pixels caméra après recadrage. Le décodage traite ainsi la zone indiquée, en portrait comme en paysage, au lieu d’une bande du flux entier. La largeur de traitement reste plafonnée à 960 px. **Cadrage corrigé confirmé par l’utilisateur sur le Samsung**, après actualisation, fermeture/réouverture de l’onglet et réactivation de la caméra. La réponse « Ça fonctionne, c’est bon » valide cette présentation, sans constituer encore un test de lecture de code-barres.

Vérifications du correctif : **138 tests applicatifs / 11 fichiers**, TypeScript, builds local et Cloud, formatage et `git diff --check` réussis. Treize tests de géométrie ajoutés : flux portrait dans aperçu horizontal, projection vers le cadre dans cinq rapports de dimensions, rotation et dimensions indisponibles. Les quatre rasters EAN/UPC passent encore par ZXing et vérifient la zone transmise à `drawImage`. Les tests existants de filtrage, cycle caméra et opérations stock/courses restent réussis. Aucune migration, RPC, authentification ou règle de stock modifiée ; tests backend de la livraison initiale conservés. Les captures de téléphone contiennent l’environnement personnel : **elles ne sont pas ajoutées au dépôt**. Ni clé/certificat local ni IP/MAC/identifiant d’appareil personnel n’est versionné dans ce compte rendu.

À ce stade intermédiaire, restaient le choix du produit, les quantités et les interruptions, validés ensuite dans le résumé de clôture ci-dessus. Les autres scénarios, le second compte et l’iPhone restent ouverts. Les paragraphes historiques ci-dessous décrivent l’état avant cette recette physique et ne remplacent pas ces nouveaux constats.

### Premier emballage physique : lecture bloquée par le flou

Après confirmation du cadrage, l’utilisateur autorise la sauce tomate existante pour les essais d’ajout/retrait, ajustement et annulation. État déclaré avant lecture : **stock 1, à acheter 0**. Consigne du premier essai : un ajout puis maintien du code dans le cadre pendant dix secondes, résultat attendu stock 2. **Ce résultat n’est pas obtenu ni validé** : l’utilisateur signale une image très floue dans l’application, empêchant la lecture, alors que l’appareil photo natif donne une image nette du même code-barres. Les deux captures personnelles sont examinées sans être copiées dans le dépôt. Aucun délai de reconnaissance ni anti-doublon réel n’est validé ; recontrôler le stock avant la prochaine tentative.

Cause non établie à distance : la sélection d’un objectif différent sur ce téléphone multi-objectifs et/ou le réglage de mise au point du navigateur sont des hypothèses, pas des diagnostics confirmés. Le code de l’application ne demandait pas de mode de mise au point. Correctif préparé : demander une définition idéale 1920×1080, sans minimum bloquant ; demander `focusMode: continuous` seulement si la piste l’annonce, avec poursuite normale en cas d’absence/refus ; proposer le choix de caméra après permission si plusieurs entrées vidéo sont exposées. Changer d’objectif ferme d’abord l’ancien flux, conserve le verrou du code et mémorise le choix uniquement pendant la session. Les identifiants et noms de caméras ne sont ni journalisés, ni persistés, ni transmis. La lampe conserve la demande de mise au point lors de son réglage. Ces options ne garantissent pas un objectif « principal » ou une netteté identique à l’application native. Références : [capacités et contraintes](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Constraints), [mise au point Image Capture](https://w3c.github.io/mediacapture-image/index.html).

**146 tests applicatifs / 11 fichiers**, types, builds local/Cloud et formatage réussis après ce changement. Huit tests ajoutés : contraintes idéales et autofocus annoncé, refus ou absence d’autofocus, fermeture pendant son réglage, inventaire après permission seulement, exclusion du micro/des identifiants vides, erreur/liste tardive non bloquante, changement d’objectif avec fermeture et sans nouveau scan involontaire, conservation du choix à la reprise. Les tests simulent le matériel ; **la netteté et la lecture réelles après ce correctif restent à vérifier sur Samsung**, puis sur iPhone. Les règles de stock et le backend sont inchangés.

**Retour réel après la mise à jour autofocus/choix d’objectif :** l’utilisateur confirme que la lecture fonctionne, que l’article s’ajoute et qu’un maintien du code pendant **dix secondes ne produit pas d’ajouts répétés**. Premier ajout physique et anti-doublon sur code maintenu validés par ce retour Samsung. La netteté est suffisante pour cette lecture ; le rôle exact de l’autofocus et de l’objectif choisi n’est pas isolé. Stock final chiffré, objectif sélectionné et délai de reconnaissance restent à relever. Quantités ajustées, compensation, retrait/représentation d’identiques, autre format, interruption, seconde session et iPhone restent à tester. Les mentions d’absence de lecture dans les paragraphes précédents décrivent les essais antérieurs au correctif.

## Phase 3 — 27 octobre 2026

Scanner caméra implémenté sans modification des migrations, RPC, Auth ou données Cloud. ZXing Browser 0.2.1 / ZXing JS 0.23.0, Node 24.20.0 utilisé pour les vérifications. Comparaison et seuils : `SCANNER.md` ; recette physique à exécuter : `TESTS_TELEPHONES.md`.

| Vérification                                 | Résultat                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm test`                                   | 125 tests réussis, 10 fichiers ; 44 tests supplémentaires par rapport à la clôture 2C        |
| `npm run typecheck`                          | TypeScript strict réussi                                                                     |
| `npm run build`, `npm run build:cloud`       | Réussis ; lecteur dans un chunk séparé, exclu du précache initial                            |
| `npm run format:check`, `git diff --check`   | Réussis à la clôture                                                                         |
| `npm run test:phone`                         | 2 tests du serveur HTTPS préparé : paramètres privés obligatoires et confinement des chemins |
| `npm run test:db`                            | 80 assertions pgTAP réussies sur la stack Docker locale existante                            |
| `npm run test:db:concurrency`                | 6 tests multi-connexions réussis                                                             |
| `npm run test:db:api`, `npm run test:shared` | Auth/API et parcours partagé avec Mailpit réussis, fixtures locales nettoyées                |
| Dépendances                                  | Versions exactes et lockfile ; npm ne signalait aucune vulnérabilité à l’installation        |

Tests caméra : format et clés EAN-13/EAN-8/UPC-A, zéros initiaux et équivalence UPC-A/EAN-13 ; stabilité, code maintenu 30 secondes sans répétition, A→B→A, retrait/représentation et répétition volontaire ; pause/changement de mode sans réarmement. Tests de flux avec `MediaStream` **simulé** : permission refusée, absence/occupation/interruption, HTTPS absent, annulation avec réponse tardive, un seul flux, libération des pistes/lecteurs/timers, visibilité/pagehide, reprise explicite, lampe facultative, échec de vidéo/chargement/décodage. Tests store supplémentaires : pas de succès avant reçu **et** snapshot ; nouvelle écriture bloquée pendant attente/incertitude, reprise de la même clé et mode de la prochaine intention. Les tests métier et backend existants couvrent stock/courses, ajustements, compensation, bornes et conflits.

Quatre **rasters synthétiques indépendants** EAN-13, EAN-8, UPC-A et EAN-13 préfixé de zéro passent réellement dans le lecteur ZXing livré, via une surface canvas simulée. Ce contrôle exerce le moteur de décodage, **pas un capteur, l’autofocus ni une caméra réelle**.

Recette UI dans le navigateur intégré, build local compilé sur origine de démonstration isolée `localhost:4184` :

- Ouverture du scanner sans demande automatique de caméra, puis activation restant en attente de permission dans cet environnement ; **Arrêter** annule correctement l’attente et rend le bouton d’activation. Aucun flux réel ni image de caméra obtenu.
- Saisie de secours : thon 0→1 ; compteur 1→3→2 avec cohérence visible de la liste de courses ; répétition explicite puis annulation conservant le mouvement précédent.
- Code inconnu EAN-8 : annulation du formulaire puis création manuelle, reconnaissance par répétition, passage Retirer à zéro conservant la fiche, puis Ajouter. Formulaire existant, sans appel externe d’identification.
- Thème sombre à 390×844 et clair à 320×740 ; saisie repliable, compteur compact, absence de débordement horizontal mesurée. Ces tailles ne simulent pas un vrai Safari/Chrome de téléphone. À 320 px un défilement vertical peut être nécessaire pour les actions sous le dernier produit.
- Journal navigateur sans erreur/avertissement au contrôle. Captures **de démonstration seulement**, sans inventaire privé : `screenshots/scanner-phase3-dark.png`, `screenshots/scanner-phase3-light-320.png`.

Limites : **aucune caméra réelle, aucun iPhone ni Samsung testé**. Permission et autofocus réels, rapidité, flou/reflets, plusieurs emballages identiques, interruption Safari/PWA, lampe, vibration et synchronisation depuis les téléphones restent à valider. Les seuils du filtre sont un compromis à éprouver, pas une garantie contre tout faux positif. Le serveur HTTPS a été préparé et testé pour ses options/chemins ; aucune autorité TLS installée et aucune écoute LAN exécutée. Les builds signalent le seuil Vite de 500 Ko pour le bundle principal (~523 Ko, ~152 Ko gzip) ; lecteur différé ~478 Ko (~125 Ko gzip). Aucun déploiement, tunnel, reset de base, migration, sauvegarde ou mutation Cloud réalisé. Les premiers lancements de tests backend dans le bac à sable ont échoué sur l’écriture du fichier de télémétrie CLI ; relancés hors bac à sable, tous les tests listés ont réussi. Pas de nouvelle base vierge nécessaire ici, aucune migration modifiée.

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

## Phase 4 — validation locale initiale avant activation, 28 octobre 2026

Implémentation locale depuis `ba18738`, sans migration ou déploiement Cloud. **246 tests applicatifs / 16 fichiers**, TypeScript strict, builds local/Cloud et formatage. Migration rejouée depuis une base locale vierge sans seed : **104 assertions pgTAP / 2 fichiers**, **7 tests de concurrence**, Auth/API, parcours partagé réel à deux comptes SDK/Mailpit, types régénérés et linter SQL sans erreur. **1 test runtime Edge local** vérifie Auth, appartenance, codes et origine sans appeler OFF. **1 parcours Chrome** avec fournisseur fictif vérifie catalogue prioritaire, stock/courses et annulation, préremplissage/correction/enregistrement, scan suivant sans fournisseur, fermeture/réponse tardive, absence, repli manuel, image en erreur et largeurs 390/320 px. Scripts reproductibles et prérequis dans `OPEN_FOOD_FACTS.md`.

Trois appels GET réels et identifiés sur **staging OFF v3.6**, espacés, HTTP 200 : `3017620422003`, `3274080005003`, `7613034626844`. Noms/marques reçus, deux conditionnements exploités ; aucune photo reçue dans ces réponses sélectionnées. Aucun inventaire transmis ni fiche Cloud créée. Les fiches staging ne garantissent pas la qualité de production ; le nom Cristaline reçu illustre le besoin de correction. Aucun essai de charge ou 429 provoqué.

Recette OFF sur iPhone/Samsung **non réalisée**, déploiement de fonction/migration **non effectué**, flux complet frontend → Edge → OFF en production **non validé**. La caméra physique, les permissions, la reprise continue et les images effectivement disponibles doivent être contrôlées après activation autorisée, avec périmètre de quantités jetables approuvé. Phase 3 physique conservée, phases 5/6 non commencées. Transmission complète et activation à approuver : `HANDOFF_4.md`.

### Première tentative de déploiement suspendue — historique

Projet lié et région Paris confirmés en lecture seule, historique des trois migrations aligné, seule phase 4 en attente ; dry-run ciblé sans anomalie. RLS/grants et identité du corps de la RPC historique contrôlés ; branches stock/courses/scanner inchangées dans la migration additive. **Déploiement suspendu** : l’archive du 27 octobre ne couvre pas les changements plus récents ; l’utilisateur demande une nouvelle sauvegarde. Free et origines HTTPS exactes restent à reconfirmer avant activation. Aucune mutation métier, nouvelle donnée de test Cloud ou modification de configuration distante.

Outil préalable adapté au cas strict de la phase 4 en attente : trois migrations appliquées archivées seulement, empreintes de toutes les tables avant/après export, refus des autres divergences. **8 tests de sauvegarde synthétiques**, dont chiffrement/déchiffrement GnuPG, réussis ; requête d’empreintes exécutée sur la seule base locale et dix empreintes SHA-256 valides constatées, sans contenu de ligne affiché. **246 tests applicatifs**, TypeScript strict, builds local/Cloud et formatage réussis ; parcours partagé local SDK/Mailpit relancé avec stock, scanner, ajustements, compensation et courses. Aucune recette de mouvement Cloud post-déploiement revendiquée. Procédure de sauvegarde dans `SAUVEGARDE_CHIFFREE.md`, recette physique préparée dans `TESTS_OFF_TELEPHONES.md`.

### Activation Cloud et recette ordinateur réalisées

Nouvelle archive chiffrée du 28 octobre fournie et vérifiée : fichier, empreinte et reçu cohérents, dix empreintes source identiques à la base actuelle. Free confirmé dans le Dashboard, Paris confirmé par CLI/Dashboard, trois migrations historiques alignées et phase 4 seule au dry-run. Migration unique appliquée, puis dix tables préexistantes identiques à la sauvegarde après projection des anciennes colonnes de catalogue ; champs OFF nouveaux tous nulls, RLS/grants et fonctions privilégiées conformes.

`product-lookup` version 1 déployée ACTIVE avec **verify_jwt=true**. Quatre origines locales exactes `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`, `http://127.0.0.1:4173` : preflights 204, en-tête d’origine exact ; origine étrangère 403 ; absence de token, token invalide et clé publishable utilisée comme token utilisateur : 401. Aucun joker, configuration SMTP/Auth/Storage inchangée, aucun certificat ou accès LAN recréé.

Depuis la preview Cloud sur la seule boucle locale 127.0.0.1:4173, après connexion faite par l’utilisateur, trois codes publics confirmés absents du catalogue ont ouvert une fiche enrichie via Edge et OFF production : Nutella (`3017620422003`), Cristaline nommé « isabelle » à la source (`3274080005003`, 1 500 ml) et Chocapic (`7613034626844`, 430 g). Photos Nutella et Chocapic chargées, attribution visible ; quantité proposée 1, correction du nom puis fermeture sans enregistrer. Le texte `400 g e` de Nutella reste indiqué à vérifier avec champ numérique vide, limite du parseur conservateur. **Aucun produit créé, aucune quantité/course/mouvement/annulation réel exécuté** ; huit tables applicatives préexistantes identiques aux empreintes de sauvegarde après ces essais. Connexion Auth normale exclue de cette dernière comparaison.

L’onglet avait initialement une ancienne version du scanner simulé en cache ; fermeture/réouverture a activé le build actuel avec la session conservée, sans modification de gestion de cache de phase 5. Aucun code soumis dans l’ancienne version.

Après migration, base locale recréée sans seed : **104 assertions pgTAP, 7 tests concurrents, Auth/API et parcours partagé SDK/Mailpit**, types régénérés sans différence et linter SQL réussis. **246 tests applicatifs**, TypeScript strict, builds local/Cloud, parcours navigateur fictif 390/320 px et deux tests du serveur téléphone réussis. Les tests d’écriture/compensation utilisent exclusivement l’environnement isolé ; ils ne prouvent pas une écriture Cloud post-déploiement. Pas de test Cloud non-membre/unverified avec nouveau compte ni de charge 429 réelle. Recette iPhone/Samsung préparée et encore non réalisée ; seules les origines locales sont actuellement actives. Transmission détaillée dans `HANDOFF_4.md`.

### Clôture documentaire du 29 octobre 2026

Phase 4 clôturée ; prochaine conversation consacrée à la phase 4B Cloudflare Pages Free, non commencée. Transmission créée dans `HANDOFF_4B_PREPARATION.md`. L’état initial de `main` est propre et aligné à `feda7f3`, sans commit local non poussé ; visibilité GitHub privée confirmée. Cette intervention modifie uniquement la documentation : revue des références/build/variables, formatage, liens locaux et diff Git, sans nouveau test Cloud ou rejeu des suites applicatives/backend déjà validées. Les validations fonctionnelles ci-dessus conservent leur date d’exécution ; elles ne deviennent pas des tests physiques OFF. Aucun changement de Supabase, données, interface ou règle métier.

## Phase 4B — hébergement et autorisations HTTPS, 29 octobre 2026

Frontend Sacré bleu publié sur https://sacre-bleu.pages.dev après accord, commit initial `b11d74a`. Cloudflare Free confirmé par l'utilisateur ; build réussi visible dans le Dashboard. Production automatique sur `main` conservée à sa demande, previews désactivées et variables Supabase retirées de Preview selon sa confirmation. Paramètres prévus : Node 24.22.1, image v3, `npm ci && npm run build:cloud`, `dist-cloud`. Le journal distant Node/npm reste à lire ; configuration et réussite ne valent pas inspection de ce journal.

Nom/logo/icônes/en-têtes préparés et validés localement : 246 tests, TypeScript, builds local/Cloud, formatage et diff sans erreur. Chrome du build compilé, en-têtes reproduits : connexion 320/390/1280 px, démo 320/390/1024/1280 px, thèmes et logos sans débordement constaté. Manifeste, worker prêt, chargement du décodeur, callback SPA/fragment invalide nettoyé et absence de violations CSP ; zéro requête externe. Le masque Android garde le dessin dans la zone sûre. Pas de caméra physique dans ce contrôle.

Sur le vrai site HTTPS : HTML et `/auth/callback` identiques (200), manifeste et six images conformes aux fichiers locaux, MIME corrects, worker et script principal accessibles. Les six en-têtes prévus sont effectivement servis, avec caméra `(self)`, refus d'iframe, anti-indexation et CSP ciblée. Bonne référence Supabase et clé publishable présentes dans le bundle public ; aucun motif de clé secrète détecté. Aucune session privée utilisée.

Après accord ciblé, l'utilisateur modifie Auth Site URL et Redirect URLs. La CLI confirme zéro différence déclarée avec la configuration minimale d'URL : origine canonique et callback HTTPS exacts, quatre callbacks locaux conservés. L'agent ne pousse pas de configuration Auth. Il modifie seulement `OFF_ALLOWED_ORIGINS`, avec les quatre origines locales conservées et la seule origine canonique ajoutée ; empreintes avant/après conformes. La plateforme expose ensuite `product-lookup` version 2 ACTIVE, `verify_jwt=true`, sans commande de redéploiement de code.

Contrôles réels sans session : cinq preflights 204 avec origine exacte ; origine étrangère et preview 403 sans CORS. Catalogue et RPC de lecture de snapshot sans session : 401 ; schéma privé non exposé : 406. OFF sans token, token invalide et clé publique utilisée comme token utilisateur : 401. Aucun appel fournisseur dans cette recette. Une unique requête SELECT vérifie l'absence des trois codes publics candidats, sans renvoyer de fiche ou quantité. Aucun stock, course, compte, SMTP, schéma ou règle métier modifié par l'agent.

**Restant :** connexion depuis la nouvelle origine avec les comptes existants, OFF connecté sans enregistrement, installation/relance/logo/caméra sur iPhone et Samsung, réseau mobile avec ordinateur éteint, reprise de session et observation d'une mise à jour. Essais préparés dans `TESTS_PAGES_TELEPHONES.md` et `TESTS_OFF_TELEPHONES.md`. Aucune validation physique nouvelle, aucun mouvement Cloud de test, aucune consultation privée persistante hors ligne et aucune phase 5 revendiqués.

### Ajustement de plein écran demandé sur Samsung

Après confirmation de connexion/consultation et capture Samsung privée (non ajoutée au dépôt), l'utilisateur demande le masquage des boutons système Android. Le manifeste utilise désormais `display: fullscreen` ; marges de sécurité mobile adaptées pour l'encoche et les bords. Ce mode peut aussi masquer la barre d'heure/batterie et les commandes restent réaffichables par le système. La compatibilité est celle du navigateur, sans modification globale du téléphone.

246 tests, TypeScript, builds local/Cloud, formatage et diff conformes. Le manifeste compilé contient `fullscreen`. Recette Chrome locale à petites/grandes largeurs, navigation interne, décodeur, worker et API Fullscreen sans erreur ni requête externe. Le mode d'affichage Android installé et ses barres système ne sont pas émulés par le Chrome headless : résultat physique à confirmer après mise à jour du manifeste sur Samsung. Aucun stock modifié, aucune modification Supabase, aucune phase 5.

### Identification de version et diagnostic d'affichage

À la demande de l'utilisateur après persistance des barres système sur Samsung, ajout discret dans les deux réglages (avant connexion et dans l'app) de la version réellement embarquée, de la référence source et de la date de compilation, avec modes demandé/détecté dans un détail. Le numéro fixe du pied de page est retiré. Métadonnées injectées au build ; référence Cloudflare réelle via `CF_PAGES_COMMIT_SHA`, repli Git marqué `-local` pour les modifications locales. Aucun rechargement ou mécanisme de gestion de cache ajouté.

Recette Chrome du build Cloud local : version/date/référence vérifiées, détail utilisable à Entrée, présent dans le gate et les préférences de démo, aucun changement du stockage. Diagnostic navigateur réel puis valeurs matchMedia standard/plein écran simulées correctement distinguées à 320 px. Tests de largeur, navigation, worker et décodeur conservés ; aucune erreur JavaScript, violation CSP ou requête externe. Aucune donnée personnelle enregistrée dans les captures de recette. Le résultat Android physique reste à diagnostiquer avec la version et le mode renvoyés par l'utilisateur.

### Retour physique Samsung — mise à jour et plein écran confirmés

Le 29 octobre 2026, l'utilisateur confirme le chargement de `2896ab88e57e` après fermeture des onglets du site et arrêt forcé de l'app/Chrome. Sa capture indique encore le mode installé standard malgré le plein écran demandé. Après mise à jour du WebAPK via `chrome://webapks`, lancement puis fermeture/arrêt de l'app et attente, il confirme que le plein écran fonctionne. La valeur finale du diagnostic n'est pas fournie ; modèle et versions système/navigateur non relevés. Procédure et libellé réel Scheduled documentés dans `TESTS_PAGES_TELEPHONES.md`. Aucune capture privée versionnée, aucun changement applicatif, Supabase ou de stock lors de cette validation. iPhone, OFF physique, réseau mobile avec ordinateur éteint et détails de sécurité d'affichage (clavier/encoches/gestes) restent à confirmer ; phase 5 non commencée.

### Compléments d'interface — balayage latéral et formulaire produit

À la demande de l'utilisateur, ajout du passage entre les trois écrans depuis les bords sur mobile, avec limites sans boucle et garde contre les modales, recherches, écritures et demandes incertaines. Les boutons existants restent accessibles. Aucun changement de règle métier, stockage, service worker ou configuration distante. Alignement des champs du formulaire corrigé par des marges flexibles avant les contrôles et des colonnes réductibles, sans retrait des aides facultatives ni changement des valeurs.

Recette reproductible `npm run test:ui:browser` (Chrome/Playwright disponible via `PLAYWRIGHT_PACKAGE` si hors dépendances du dépôt) : vrais événements tactiles injectés par CDP, parcours Stock → Scanner → À acheter et retour, extrémités, geste central/court/annulé, plusieurs doigts, défilements vertical et horizontal conservés. Caméra fictive activée volontairement puis pistes terminées après sortie de Scanner. Formulaire ouvert et brouillon conservés pendant un balayage ; navigation au clavier et absence de changement du catalogue fictif vérifiées. Mesure des hauts/bas/largeurs de chaque paire à 320, 390, 760 et 1 024 px, sans débordement ; captures locales claire/sombre inspectées, non versionnées. Zéro erreur JavaScript et zéro requête externe ; aucune session Supabase utilisée. Ces événements Chrome ne prouvent pas la priorité des gestes système iPhone/Samsung : recette physique préparée, non encore confirmée.

246 tests applicatifs, TypeScript, builds local/Cloud et contrôle de formatage réussis ; avertissement historique de taille du bundle Vite conservé. La gestion plus agréable des mises à jour est proposée séparément (avis disponible, Actualiser/Plus tard et vérification dans les réglages, sans interruption de saisie ou d'opération) ; elle n'est pas ajoutée ici et aucune phase 5 n'est commencée.

### Gestion accompagnée des mises à jour — extension approuvée

Après validation explicite de la proposition, ajout de l'avis Actualiser/Plus tard et du contrôle dans les réglages avant/après connexion. Inscription native unique du worker, contrôles au lancement/retour et toutes les trente minutes visibles, délai minimal d'une minute pour les contrôles automatiques. Mode prompt et cache statique Workbox conservés ; aucune nouvelle dépendance, aucune persistance de données privées ajoutée. Les refus pour saisies/opérations ne programment pas de rechargement ultérieur ; une nouvelle action explicite est nécessaire. Le worker refuse l'activation si une autre fenêtre de l'origine est ouverte. Scanner doit être quitté avant bascule pour arrêter la caméra et éviter une lecture concurrente.

`npm run test:pwa:browser` compile deux vraies versions locales A et B et les sert successivement sur la même origine avec les en-têtes CSP. Chrome réel : contrôle dès la première installation, pas de mise à jour disponible au départ, téléchargement B sans rechargement, refus avec email fictif préservé, Plus tard, reprise manuelle, formulaire produit resté ouvert avec son brouillon, refus de saisie de courses, refus depuis Scanner et d'une demande fictive dans le journal, refus avec une seconde fenêtre dont la saisie reste intacte. Hors connexion et réponse 503 du script worker : messages d'échec sans faux succès. Après fermeture de la seconde fenêtre, activation manuelle, rechargement sur la référence B et comparaison exacte des stockages local/session, inchangés. Bandeau sans débordement à 320/390/1 024 px, capture fictive inspectée hors Git. Zéro erreur JavaScript et zéro requête externe ; aucune session réelle ou RPC Supabase exécutée. Ce test ne prouve pas un renouvellement réel de session Auth sur téléphone.

246 tests applicatifs, TypeScript, builds local/Cloud, formatage, recette tactile/formulaire existante et smoke du build Cloud (CSP, route SPA, worker, décodeur, thèmes, diagnostic) réussis. Aucun rejeu SQL : règles métier et migrations inchangées. Validation physique de ce nouveau parcours iPhone/Samsung encore à confirmer. Les anciens clients doivent charger cette première version du gestionnaire par fermeture de leurs fenêtres ; les futures modifications du manifeste WebAPK Android gardent leur cycle distinct. Extension frontend ciblée, sans démarrage du hors ligne privé, export/import ou restauration de phase 5, sans modification distante Supabase ni de stocks.

## Clôture définitive de la phase 4B — 29 octobre 2026

L'utilisateur confirme être sur la version 43c8897428e4, puis confirme globalement que tous les derniers contrôles fonctionnent et demande explicitement la clôture. Samsung : accès en réseau mobile avec ordinateur éteint, scanner/OFF sans enregistrement, balayages, formulaire et contrôle manuel des mises à jour consignés comme confirmations déclaratives, sans mesures supplémentaires ni détail des codes. Plein écran, connexion et relance déjà confirmés séparément. Aucun mouvement de stock exécuté par l'agent.

iPhone non disponible pour les essais 4B : compatibilité supposée et limite de livraison acceptée explicitement par l'utilisateur ; aucune validation physique iOS 4B revendiquée. Bascule entre deux versions du gestionnaire validée dans Chrome local ; chargement du gestionnaire confirmé sur Samsung, sans nouvelle bascule physique revendiquée après clôture. Node 24.22.1 configuré, succès Cloudflare confirmé via le contrôle GitHub ; ce contrôle ne fournit pas le journal Node/npm détaillé, qui reste non inspecté.

Rapport complet dans HANDOFF_4B.md. README, plan, spécification, état Cloudflare et recettes actualisés, transmission de préparation marquée historique. Cette clôture ne modifie que la documentation : aucune configuration distante, migration, donnée ou fonctionnalité supplémentaire. Phase 5 non commencée. Les validations techniques précédentes gardent leurs dates et limites ; les contrôles requis du dépôt sont rejoués avant la poussée documentaire de clôture.

## Revue corrective post-4B — préparation locale du 29 octobre 2026

À la demande de l'utilisateur, audit en lecture seule : Auth public disable_signup=false, seul fournisseur email ; config diff globale cohérente avec enable_signup=true, anonymes et hook before_user_created désactivés. Comptages agrégés : 2 utilisateurs confirmés, 0 anonyme, 1 réserve, 2 membres distincts, aucun utilisateur sans appartenance. Aucun surplus numérique ; aucune identité affichée. Fonction create_reserve distante sans plafond global ; require_user et begin_request correspondent aux corps du dépôt. Aucune inscription, aucun email de test, aucune mutation ni suppression Cloud.

GitHub distant : zéro workflow, main non protégée, seul contrôle Cloudflare sur le commit de clôture. Les tests navigateur existants ne sont donc pas un verrou automatique de publication. Branche locale codex/revue-corrective-4b créée sans commit/push. Préparation d'une CI PR à un job, d'un garde-fou verify:cloud, de Playwright 1.62.1 verrouillé, des entrées Cloud sans auto-inscription/création de nouvelles réserves et du texte OFF de la démo. Aucun changement de thèmes, gestes, caméra, règles métier, stockage ou gestionnaire PWA. La RPC de création reste autorisée aux comptes confirmés : l'interface ne remplace pas le contrôle serveur ; fermeture des inscriptions et éventuel gel SQL sont distingués dans REVUE_CORRECTIVE_4B.md.

Vérifications locales : 246 tests, typecheck, format:check, builds local/Cloud réussis ; la commande verify:cloud a effectivement exécuté tests/types/format/build Cloud. Navigation tactile, défilements, formulaire et arrêt caméra fictive réussis avec Playwright depuis node_modules. Recette PWA à deux builds réussie : inscription masquée en mode Cloud, texte OFF corrigé dans les réglages de démo, A vers B après clic, brouillons/demandes/seconde fenêtre protégés, erreurs réseau et stockages conservés. Zéro requête externe et zéro erreur JavaScript dans les recettes navigateur. L'alerte Vite historique de taille de bundle reste présente. L'installation npm signale quatre vulnérabilités faibles ; aucune correction forcée ou mise à niveau annexe appliquée.

La CI préparée n'a pas été exécutée sur GitHub/Linux et le budget Actions n'a pas été vérifié ; aucun runner payant ni activation autorisé. À ce stade de la préparation initiale, aucun nouveau test physique iPhone/Samsung ni modification Auth n'avait été réalisé. Aucune migration n'était modifiée. Le diff Auth minimal annonçait une seule propriété déclarée, auth.enable_signup, true vers false. Les suites ci-dessous précisent les interventions ultérieures autorisées. Phase 5 non commencée.

### Fermeture des inscriptions — seule modification Cloud autorisée

Après accord explicite et nouvelle vérification du diff distant limité à `auth.enable_signup=true → false`, application de ce seul réglage. Le premier contrôle immédiat des paramètres publics n'a pas confirmé la valeur attendue : arrêt des mutations, puis diagnostic en lecture seule. Celui-ci a confirmé `disable_signup=true`, sans autre différence de configuration Auth ou de paramètres publics. Une propagation différée est possible mais n'a pas été démontrée.

Empreintes avant/après identiques pour les deux comptes confirmés, identités, réserve unique, deux appartenances, produits, stocks, courses, journal privé et migrations ; identités des sessions existantes préservées. Aucun logout, création de compte, envoi de mail, changement SMTP/JWT/callback ou fixture Cloud. L'utilisateur confirme ensuite que Samsung et iPhone accèdent à la même réserve avec les comptes existants. Cette confirmation porte sur l'accès actuel, pas sur le correctif de scans non publié.

### Scans simultanés et budget OFF — correction préparée, 29 octobre 2026

Branche `codex/revue-corrective-4b`, préparations sécurité/CI conservées, aucun commit/push/fusion ni déploiement. Rapport détaillé et recette physique : `SCANS_SIMULTANES_OFF.md`. Le symptôme exact de substitution entre téléphones n'est pas reproduit. Deux tests isolés sur le store de HEAD démontrent en revanche l'identité remplacée par une édition locale et l'attente non bornée d'une lecture avant mutation. Protection d'identité locale, refus d'un reçu incohérent, échéances réseau et rejet des résultats OFF obsolètes préparés. Les protections SQL des ajustements périmés restent intactes.

Migration `20261029000100_lookup_budget_details.sql` préparée et appliquée exclusivement à une base locale recréée sans seed. Budget atomique partagé de six secondes conservé, contrat détaillé de délai/cause et compatibilité de l'ancienne RPC. Fonction Edge et client préparés ; ni SQL Cloud ni Edge Cloud modifiés. Indicateur discret avec échéance serveur, compte à rebours local, sans interrogation périodique du serveur. Aucun appel à OFF réel, aucun test de charge ni mutation de réserve Cloud.

Résultats automatiques : **260 tests applicatifs / 18 fichiers**, TypeScript strict, builds local et Cloud réussis ; **119 assertions pgTAP**, **8 tests concurrents**, **1 Auth/API**, **1 parcours partagé SDK** réussis ; types régénérés et lint SQL sans erreur. **9 tests de sauvegarde** réussis, y compris GnuPG après exécution hors confinement ; aucune sauvegarde Cloud effectuée. Le plan de sauvegarde accepte explicitement quatre migrations appliquées et la cinquième en attente avec `--before-lookup-budget` ; son mode ordinaire refuse toujours une migration en attente.

Recettes navigateur OFF, navigation et PWA réussies ; la PWA conserve ses protections de brouillon, demande incertaine, seconde fenêtre et stockage. Nouveau parcours à deux vrais comptes Supabase locaux et deux contextes Chrome indépendants : codes distincts, identité locale, code maintenu sans doublon pendant plusieurs polls, scan suivant, court délai OFF fictif, saisie manuelle et caméra vivante. Réponse volontairement perdue après écriture locale puis reprise avec la même clé : aucun double mouvement, scan suivant possible sans fermeture. Trente recherches connues simulées et vingt-quatre mouvements locaux rapides ne consomment aucun appel OFF. Zéro requête externe et zéro erreur JavaScript dans ces recettes. Captures fictives claire/sombre à 390/320 px inspectées, hors Git. La vidéo et le décodeur sont simulés : cela ne valide pas le matériel ni Safari iPhone.

Le formatage et le diff sont contrôlés avant remise ; avertissement historique Vite de taille de bundle conservé. Les essais physiques de ce correctif restent à organiser après approbation, sur données jetables explicitement autorisées ou environnement isolé HTTPS. Les tests navigation/PWA sont préparés dans la CI antérieure mais n'ont pas tourné sur GitHub ; les nouveaux tests backend/scanners restent une recette locale avant fusion, sans infrastructure CI supplémentaire. Aucune phase 5.

### Préparation contrôlée de livraison V1 — blocage détecté

Commits locaux autorisés sur la seule branche corrective ; aucun push/PR/fusion ou déploiement. Nouvelle lecture GitHub : dépôt privé, main distant toujours `9eca5d11a42d`, branche corrective distante absente. Cloudflare : main automatique, previews None, aucun hook, production `9eca5d1` ; réglages lus sans sauvegarde. GitHub : Pro existant inclus, calcul Actions 0,41 $ sur 18 $ inclus, stockage 0 Go sur 2 Go, facturable 0 $, budget compte Actions 0 $ avec arrêt activé et aucun moyen de paiement. Aucun achat, activation ou changement de budget.

Contrôle de 43 fichiers modifiés/ajoutés non ignorés : revue des sources/configs, recherche de clés privilégiées, tokens, JWT et fichiers privés ; aucun secret ni donnée personnelle ajouté détecté. Les emails de tests utilisent example.test/example.invalid ; une adresse publique de métadonnée npm déjà présente dans le lock est distinguée des données privées. Aucun .env, archive, capture, diagnostic temporaire ou dump inclus dans les commits.

**261 tests applicatifs réussis**, dont un nouveau test explicite du nouveau client contre les réponses historiques Edge sans budget JSON : succès et refus 429/60 s, reprise après échéance. Typecheck, builds local/Cloud, navigation/PWA/OFF navigateur fictif, neuf tests sauvegarde et formatage réussis. Nouvelle exécution locale : **119 assertions pgTAP, huit tests de concurrence, Auth/API réussis**.

**Parcours SDK en échec répété**, au contrôle d'invalidation d'un ajustement périmé après écriture par l'autre compte : requête interrompue après 10 s, scan encore présent et demande incertaine. Diagnostic temporaire sans identités : TimeoutError ; contrôle pg_stat_activity sans attente de verrou observée, serveur local PostgREST 14.18. Les migrations historiques lèvent 40001 pour ce refus métier ; la note officielle Supabase décrit le risque de relance sur PostgREST 14. L'erreur SQL directe est bien refusée ; son transport HTTP n'est pas validé. L'instrumentation temporaire est retirée, les assertions et protections ne sont pas affaiblies. Les étapes du SDK après ce point ne sont pas exécutées lors de cette recette. L'ancien bilan positif SDK n'est pas reconfirmé et ne justifie pas la livraison.

Le nouveau parcours deux scanners, déjà réussi lors de l'investigation précédente, n'est pas relancé après ce blocage ; aucun résultat physique nouveau. Services Supabase locaux arrêtés, volumes conservés. Aucune boucle ou version PostgREST Cloud n'est diagnostiquée à distance ; aucun redémarrage ni terminaison de session Cloud. Le plan de migration/Edge/Pages et les six cas physiques obligatoires sont préparés dans `LIVRAISON_CORRECTIFS_V1.md`, **conditionnels à la résolution du blocage**. Pas de phase 5 ni V1.1.

Contrôle Cloud final en lecture seule : empreintes de comptes, identités, réserve, appartenances, produits, stocks, courses, journaux et historique identiques au début de cette préparation ; paramètres Auth et version/JWT Edge inchangés. `disable_signup=true` confirmé. Aucun contenu de ces tables ni empreinte privée n'est versionné. Commits locaux du lot conservés comme état à examiner, sans pousser une branche dont le parcours SDK échoue.

### Déblocage V1 — transport de conflit compatible, 29 octobre 2026

Après autorisation ciblée, nouvelle migration `20261029000200_scan_conflict_http.sql` préparée, aucune migration historique modifiée. Deux levées d'erreur métier passent de SQLSTATE 40001 à PGRST, statut HTTP explicite 409 et corps JSON code 40001 conservé. Ce mécanisme officiel PostgREST évite les relances de transaction tout en gardant l'explication et le refus définitif des anciens clients. PT409 seul n'est pas choisi : l'ancien classificateur ne le reconnaît pas. Aucun changement aux contrôles auteur/version/révision/stock/courses, à l'idempotence ou à la compensation ; un test de parité compare le corps historique entier, en n'autorisant que ces deux remplacements.

Base locale recréée sans seed et six migrations appliquées. **Parcours SDK précédemment bloquant réussi** : HTTP réel 409/code 40001 sous le seuil de 5 s, snapshot métier strictement identique avant/après refus, aucune demande rejetée enregistrée dans private.requests. Interface non busy, pending nul, scan invalidé, explication correcte, writable vrai puis nouveau scan possible. Ajustement et annulation périmés exercés aussi avec les véritables sources store/adapter/errors du commit publié `9eca5d11a42d`, extraites par la recette dans .tmp ignoré ; pas une simple imitation du classificateur. Identités locales indépendantes, scans distincts concurrents, stocks/courses cohérents, perte de réponse après commit puis reprise avec la même clé sans doublon conservés.

Résultats : **262 tests applicatifs / 19 fichiers**, **119 assertions pgTAP**, **8 tests concurrents**, **1 Auth/API**, **1 SDK partagé**, **1 Edge local**, **10 tests de sauvegarde** réussis ; types régénérés depuis la base locale sans différence, linter SQL, TypeScript strict et builds local/Cloud réussis. Navigation, mises à jour PWA, OFF navigateur fictif et deux navigateurs/scanners locaux réussis ; aucune requête externe ni erreur JavaScript dans les recettes navigateur. Aucun appel OFF réel. Les timeouts ne sont pas augmentés et aucune assertion métier n'est affaiblie : les assertions SQL directes vérifient désormais PGRST et le contrat JSON/HTTP de conflit. Les tests de sauvegarde couvrent les seuls suffixes V1 autorisés sur inventaire à six sources, sans export Cloud réel.

Contrôle local final pg_stat_activity : zéro session idle in transaction, zéro requête PostgREST active depuis plus de 5 s et zéro session bloquée. Aucun test d'écriture Cloud, compte créé sur Cloud, réglage Auth, Edge ou Cloudflare modifié. Les vérifications de branche Pages avant push confirment encore main automatique et previews None ; budget Actions 0 $ bloquant conservé, aucun achat ni relèvement. Push de la seule branche corrective et PR brouillon désormais autorisés par l'utilisateur sous condition de ces tests verts ; fusion et production restent interdites sans nouvel accord.

**Limite acceptée explicitement par l'utilisateur :** pas de nouvelle recette physique Samsung/iPhone avant cette publication. La substitution exacte n'a pas été reproduite, la caméra/décodeur des nouveaux tests navigateur sont simulés ; aucune certification matérielle nouvelle. Surveiller sa réapparition en usage réel après une publication séparément autorisée, relever référence et diagnostic si nécessaire. Les tests techniques restent obligatoires. Phase 5/V1.1 non commencées.

### Premier passage GitHub Actions après push autorisé — échec Linux

Tous les tests locaux obligatoires étant verts, commit `ea4d98b` poussé sur la seule branche `codex/revue-corrective-4b` et [PR privée brouillon #1](https://github.com/Khaoseon/App_reserve/pull/1) créée/attachée. Main reste `9eca5d11a42d`, Cloudflare reste sur le même déploiement 6ae15af5 ; aucune publication ni modification Supabase Cloud.

Le [run GitHub 40952789615](https://github.com/Khaoseon/App_reserve/actions/runs/40952789615) échoue sous Ubuntu 24.04/Node 24.22.1/Chrome 156.0.8078.73 au test `test:ui:browser`, scripts/browser/navigation.integration.mjs:180 : à 320 px, hauts des deux champs mesurés 269,5/271,5 px, bas identiques 315,5 px, largeurs 117 px. Les étapes npm ci, 262 tests applicatifs, types, format et builds local/Cloud passent ; installation Chrome réussie. Le test PWA suivant est skipped et n'est donc pas validé sur GitHub, même s'il passe localement. Le premier contrôle distant n'est pas vert : livraison toujours bloquée, aucun assouplissement d'assertion, nouveau push, relance CI, fusion ou déploiement après constat. Ce diagnostic est conservé localement sans nouveau commit/push ; correction d'alignement et validation Linux restent à préparer avant publication.

### Restauration de l'archive V1 — diagnostic et réussite du 30 octobre 2026

Archive originale privée `app-reserve-2026-10-29T21-42-54Z-51955119.json.gz.gpg`, non modifiée. L'extraction a été réalisée par l'utilisateur avec vérification cryptographique ; fichiers extraits revérifiés par leurs tailles et SHA-256 du manifeste avant les essais. Aucun nouvel export Cloud ni appel d'écriture distant.

Première erreur reproduite avec ON_ERROR_STOP et VERBOSITY verbose : SQLSTATE **23505**, unicité sur `private.product_lookup_gate` pendant l'import des données. Les quatre migrations recréent correctement les objets métier ; la quatrième insère déjà le singleton du limiteur. Le dump contient cette même ligne, d'où le doublon. Cause : préparation de la cible de restauration, pas données corrompues ni différence de colonnes Auth. Diagnostics bruts uniquement en mémoire du processus privé, jamais affichés ni versionnés. Rollback confirmé : zéro ligne Auth/métier/journaux partielle après l'échec, cible supprimée.

Correction locale minimale préparée dans `scripts/backend/restore-import.mjs` : vérifier une cible vierge et son singleton initial, retirer cette seule ligne dans la transaction puis importer le dump original inchangé. Les contraintes/RLS ne sont pas supprimées ; le mode replica est limité à la transaction de restauration et la session suivante est contrôlée en mode origin. Aucun changement aux scripts d'export ou à l'archive.

Nouvelle cible PostgreSQL vierge, PGDATA en tmpfs, aucun réseau/port publié. Schéma Auth depuis la référence locale compatible, puis uniquement les quatre migrations de l'archive ; schema.sql n'est pas ajouté aux migrations. Régression réelle : import complet suivi d'une division par zéro (22012) ; toutes les lignes importées sont annulées et le singleton initial est rétabli. Ensuite import intégral transactionnel réussi. **Onze empreintes de tables identiques au manifeste**, incluant auth.users/auth.identities, réserve/appartenances, catalogue/stock/courses, invitations/reçus/scan_operations et limiteur OFF : UUID, quantités, liens et contenus conservés sans affichage. Deux comptes, une réserve, deux appartenances. Audit RLS/grants sans violation, liens vérifiés, mode origin confirmé. Cette recette valide la restauration SQL, pas une nouvelle connexion HTTP Auth restaurée.

Les cibles privées jetables ont été supprimées après chaque tentative. L'archive originale et son extraction privée sont conservées. Aucun commit/push, migration Cloud, redéploiement Edge, fusion ou publication. Phase 5/V1.1 non commencées. Le résultat de recette expurgé reste dans .tmp ignoré ; le test de rollback est exécuté dans la recette locale privée de restauration, sans données de l'archive ajoutées au dépôt.

### Finalisation autonome de la préparation V1 — 30 octobre 2026

La correction de restauration est intégrée dans `backup:restore:local` avec garde hors Git et conteneur neuf contrôlé sans réseau/port publié, données en RAM et logs Docker désactivés. La commande ne contient aucun appel d'import Cloud ni chemin privé codé en dur. Répétition avec la même archive originale du 29 octobre : contrôle des fichiers extraits, quatre migrations de l'archive seulement, test d'échec après chargement complet avec rollback intégral, puis restauration intégrale réussie. Second import sur cible désormais remplie refusé avant suppression ; les onze empreintes restent identiques. Audit RLS/grants et liens conformes ; conteneur et données jetables supprimés. Cette recette constitue le test de régression reproductible du script intégré, avec une extraction privée comme entrée, sans contenu privé versionné.

Comparaison Cloud ultérieure strictement en lecture seule : les onze empreintes courantes correspondent encore toutes à l'archive, aucune table différente. Auth : inscriptions fermées, deux comptes confirmés, une réserve/deux appartenances, zéro différence déclarée du référentiel minimal et autres réglages Auth inchangés. Fonction Edge actuelle ACTIVE v2 avec verify_jwt=true. Dry-run limité à 20261029000100_lookup_budget_details.sql et 20261029000200_scan_conflict_http.sql ; aucune application. Source liée uznbnihmdzxdnlxanjcl. Tests applicatifs, types, builds et formatage rejoués avant commit ; la CI distante sur le dernier commit reste impérative avant demande d'accord de production. Aucune nouvelle recette physique requise, aucune phase 5/V1.1, aucune modification de production.

### Alignement natif input/select — correctif ciblé autorisé

Après examen du premier run, l'utilisateur autorise le correctif minimal, commit/push de la seule branche corrective puis attente de la CI complète, en corrigeant toute cause réelle d'échec sans relâcher les tests. Les deux compléments documentaires locaux précédents sont intégrés avec leur historique d'échec ; aucune fusion, écriture Supabase Cloud ou publication Pages autorisée.

Cause : tailles automatiques de contrôles natifs différentes selon plateforme ; min-height de 44 px seul n'égalise pas les hauteurs intrinsèques. À 16 px et interligne 1,5, l'input occupe 24 + 20 px de padding + 2 px de bordures = 46 px ; le select natif Linux restait à 44 px. Le margin-top auto existant alignait les bas, d'où les 2 px entre les hauts. Une seule déclaration CSS normalise le minimum commun avec `max(var(--touch-target), calc(1.5em + 22px))`. Pas de suppression du select natif, changement de padding, hauteur maximale, thème ou contrôle métier. La règle spécifique de checkbox reste prioritaire.

Recette navigation renforcée, tolérance inchangée de 1 px : huit combinaisons clair/sombre × 320/390/760/1024 px, trois paires de contrôles à chaque fois ; hauts/bas/largeurs/hauteurs alignés, zones ≥44 px, quatre aides facultatives et libellés conservés, pas de débordement. Mesures Windows : 46/46 px aux trois premières largeurs, 44/44 px à 1024, écart des hauts nul partout. Captures fictives locales des huit cas, exemples 320 clair et 1024 sombre inspectés ; rien de privé ni capture ajouté à Git.

Tests locaux rejoués : **262 tests / 19 fichiers**, TypeScript, builds local/Cloud, formatage, navigation tactile/formulaire, OFF fictif et PWA deux versions réussis. Protection des brouillons, demandes incertaines, seconde fenêtre et stockage conservée ; zéro requête externe et zéro erreur JavaScript dans ces recettes. Aucun changement SQL/backend dans cette correction CSS : les suites backend validées au commit ea4d98b ne sont pas répétées sans raison. Le résultat du workflow GitHub sur le dernier commit de PR doit confirmer les deux étapes test:ui:browser et test:pwa:browser ; un résultat local ne remplace pas ce passage Linux. Pas de nouveaux essais physiques demandés, risque résiduel accepté toujours conservé.
