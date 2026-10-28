# Validation — phases 1, 2A, 2B, 2C et 3

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

## Phase 4 — Open Food Facts, 28 octobre 2026

Implémentation locale depuis `ba18738`, sans migration ou déploiement Cloud. **246 tests applicatifs / 16 fichiers**, TypeScript strict, builds local/Cloud et formatage. Migration rejouée depuis une base locale vierge sans seed : **104 assertions pgTAP / 2 fichiers**, **7 tests de concurrence**, Auth/API, parcours partagé réel à deux comptes SDK/Mailpit, types régénérés et linter SQL sans erreur. **1 test runtime Edge local** vérifie Auth, appartenance, codes et origine sans appeler OFF. **1 parcours Chrome** avec fournisseur fictif vérifie catalogue prioritaire, stock/courses et annulation, préremplissage/correction/enregistrement, scan suivant sans fournisseur, fermeture/réponse tardive, absence, repli manuel, image en erreur et largeurs 390/320 px. Scripts reproductibles et prérequis dans `OPEN_FOOD_FACTS.md`.

Trois appels GET réels et identifiés sur **staging OFF v3.6**, espacés, HTTP 200 : `3017620422003`, `3274080005003`, `7613034626844`. Noms/marques reçus, deux conditionnements exploités ; aucune photo reçue dans ces réponses sélectionnées. Aucun inventaire transmis ni fiche Cloud créée. Les fiches staging ne garantissent pas la qualité de production ; le nom Cristaline reçu illustre le besoin de correction. Aucun essai de charge ou 429 provoqué.

Recette OFF sur iPhone/Samsung **non réalisée**, déploiement de fonction/migration **non effectué**, flux complet frontend → Edge → OFF en production **non validé**. La caméra physique, les permissions, la reprise continue et les images effectivement disponibles doivent être contrôlées après activation autorisée, avec périmètre de quantités jetables approuvé. Phase 3 physique conservée, phases 5/6 non commencées. Transmission complète et activation à approuver : `HANDOFF_4.md`.

### Précontrôle du déploiement autorisé sous conditions

Projet lié et région Paris confirmés en lecture seule, historique des trois migrations aligné, seule phase 4 en attente ; dry-run ciblé sans anomalie. RLS/grants et identité du corps de la RPC historique contrôlés ; branches stock/courses/scanner inchangées dans la migration additive. **Déploiement suspendu** : l’archive du 27 octobre ne couvre pas les changements plus récents ; l’utilisateur demande une nouvelle sauvegarde. Free et origines HTTPS exactes restent à reconfirmer avant activation. Aucune mutation métier, nouvelle donnée de test Cloud ou modification de configuration distante.

Outil préalable adapté au cas strict de la phase 4 en attente : trois migrations appliquées archivées seulement, empreintes de toutes les tables avant/après export, refus des autres divergences. **8 tests de sauvegarde synthétiques**, dont chiffrement/déchiffrement GnuPG, réussis ; requête d’empreintes exécutée sur la seule base locale et dix empreintes SHA-256 valides constatées, sans contenu de ligne affiché. **246 tests applicatifs**, TypeScript strict, builds local/Cloud et formatage réussis ; parcours partagé local SDK/Mailpit relancé avec stock, scanner, ajustements, compensation et courses. Aucune recette de mouvement Cloud post-déploiement revendiquée. Procédure de sauvegarde dans `SAUVEGARDE_CHIFFREE.md`, recette physique préparée dans `TESTS_OFF_TELEPHONES.md`.
