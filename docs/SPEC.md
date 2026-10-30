# Spécification produit — App_reserve

**État courant — phase 5 livrée et clôturée le 30 octobre 2026 après autorisation globale :** consultation privée hors ligne, export JSON et restauration utilisateur guidée publiés via PR #3 et frontend applicatif `6fc72c965482`, seule septième migration additive appliquée. Aucune restauration réelle. [Contrat détaillé](PHASE5.md) et [bilan de livraison, données et limites](HANDOFF_5.md). Cet état remplace les anciennes mentions « phase 5 non commencée », « non publiée » et « cache uniquement en mémoire » ; les paragraphes suivants gardent leur contexte historique. Aucune phase 6/V1.1 commencée.

**État courant au 30 octobre 2026 : stabilisation V1 livrée et clôturée.** Frontend `62f7f92bcb01`, Edge v3 et six migrations Cloud ; inscriptions fermées, données et protections conservées. [Bilan V1](HANDOFF_V1_STABILISATION.md). Les mentions historiques de correctifs préparés/non publiés ci-dessous sont remplacées par ce bilan, sans modification du périmètre fonctionnel. Bug physique exact non reproduit, risque résiduel accepté ; phases 5/V1.1 non commencées.

Exigences fonctionnelles d’origine conservées ci-dessous. La phase 2B relie les écrans au backend Supabase local sécurisé de phase 2A. La phase 2C a validé le même backend sur Supabase Free à Paris, avec modes de configuration et sessions séparés ; résultats dans `HANDOFF_2C.md`. Le mode démo reste explicitement isolé. La phase 3 ajoute la caméra et conserve les contrats métier ; détails dans `SCANNER.md`, validations et limites dans `HANDOFF_3.md`. La phase 4 active Open Food Facts v3.6 via une Edge Function authentifiée après autorisation, avec préremplissage modifiable et priorité au catalogue personnel ; déploiement et tests réels ordinateur dans `OPEN_FOOD_FACTS.md` et `HANDOFF_4.md`. Quatre origines locales et `https://sacre-bleu.pages.dev` autorisées après accord ; frontend HTTPS publié en phase 4B, Auth configuré. Recette OFF et installation PWA sur téléphone encore à effectuer ; recette principale scanner iPhone/Samsung de phase 3 validée le 28 octobre 2026, limites complémentaires dans `VALIDATION.md`.

**Clôture 4B le 29 octobre 2026 :** hébergement et fonctionnalités livrés, derniers contrôles Samsung confirmés globalement par l’utilisateur. iPhone non testé en 4B, compatibilité supposée et limite acceptée. L’état de livraison actuel et les limites priment sur les indications chronologiques ci-dessous : [HANDOFF_4B.md](HANDOFF_4B.md). Phase 5 non commencée.

## Contexte du produit

**Préparation corrective post-4B, non publiée :** voir [SCANS_SIMULTANES_OFF.md](SCANS_SIMULTANES_OFF.md) pour l'identité locale du scan, les attentes réseau bornées, le budget OFF détaillé et son indicateur. Les protections SQL de compensation restent inchangées. Ne pas confondre ce code local avec la version actuellement installée sur les téléphones. La seule évolution Cloud déjà appliquée est la fermeture des inscriptions après accord, sans suppression de compte.

Les conflits de scan périmé gardent toutes leurs conditions et sont refusés rapidement via SQLSTATE PGRST/HTTP 409 avec code JSON 40001, reconnu par les anciens clients ; aucun succès ou mouvement supplémentaire en cas de conflit. Migration V1 préparée et testée uniquement localement. L'utilisateur accepte une publication après tests techniques sans nouvelle recette physique préalable, en conservant explicitement la limite du bug iPhone non reproduit.

Le nom public de l'application est **Sacré bleu**, choisi en phase 4B. Il apparaît dans l'interface, le titre du navigateur et les noms du manifeste PWA. `App_reserve` reste le nom technique du dépôt ; les identifiants de stockage, de session et du backend existants sont conservés.

Le logo fourni en phase 4B (sac bleu illustré) apparaît à côté du nom et sert aux icônes PWA, Apple et navigateur. La variante Android adaptative conserve une marge de sécurité. Source et dérivés documentés dans `assets/branding/README.md` ; installation physique à valider après hébergement HTTPS.

À la demande de l'utilisateur pendant la recette Samsung, le manifeste demande le mode `fullscreen` pour les navigateurs compatibles, afin de masquer les commandes système Android dans l'app installée. Ce mode peut également masquer la barre d'heure/batterie ; Android garde la possibilité de réafficher ses commandes par geste. Les marges de sécurité du téléphone sont respectées en plein écran. Ce n'est pas une garantie identique sur tous les navigateurs ; validation physique et mise à jour du manifeste installé restent nécessaires.

Les réglages affichent discrètement la version réellement chargée : version du paquet et référence du code injectées au build. Un diagnostic dépliable ajoute la date de compilation (affichée dans le fuseau du téléphone), le mode demandé par ce build et le mode détecté à l'exécution. Disponible aussi avant connexion, sans exposer de compte ou données de réserve. Aucun rechargement, effacement de cache ou appel réseau déclenché par ce diagnostic. Le numéro fixe `0.2` du pied de page est retiré pour éviter une fausse identification de version.

Après validation explicite pendant la phase 4B, une mise à jour du contenu disponible affiche un avis discret avec **Actualiser** et **Plus tard**. Les réglages proposent **Vérifier les mises à jour**, avant et après connexion. Vérification au lancement, au retour visible/en ligne (espacée d'au moins une minute) et toutes les trente minutes si l'app est visible ; aucun service de surveillance ni appel au backend pour ces contrôles. Plus tard masque l'avis pour cette session ; une vérification manuelle permet de le retrouver.

La page se recharge uniquement après clic sur Actualiser et activation effective du nouveau worker. Une saisie de compte, réserve, invitation, produit, code-barres ou courses, une opération en cours/incertaine ou un lien à traiter bloque l'actualisation avec une explication. Quitter Scanner avant d'actualiser. Les autres fenêtres de la même application doivent être fermées : le worker vérifie cette condition avant de remplacer la version active, même pour une ancienne fenêtre sans gestionnaire de mise à jour. Aucune bascule n'est mise en attente derrière un refus ; il faut cliquer à nouveau une fois la situation résolue. Aucune suppression du stockage Auth/démo, aucun nouvel accès hors ligne aux données privées. Le navigateur peut appliquer séparément les changements du manifeste Android (nom, icône, mode d'affichage).

App_reserve est une application personnelle, installable sur Android et iOS sans publication sur les stores.

Elle permet à deux utilisateurs de gérer une même réserve alimentaire, principalement composée de produits secs et de conserves.

L'objectif principal est de **connaître et modifier rapidement les quantités disponibles, avec un minimum de manipulations**.

L'application comporte trois écrans principaux :

- **Stock** : consulter, rechercher et modifier les produits.
- **Scanner** : ajouter ou retirer rapidement des produits à l'aide de codes-barres.
- **À acheter** : gérer une petite liste de courses partagée.

Sur mobile (largeur jusqu'à 760 px), un balayage horizontal partant des 32 px du bord droit vers la gauche ouvre l'écran suivant dans l'ordre Stock → Scanner → À acheter ; depuis le bord gauche vers la droite, il revient à l'écran précédent. Aucun passage circulaire entre les extrémités. Le geste doit parcourir au moins 64 px en moins de 850 ms, avec une trajectoire principalement horizontale. Les boutons de navigation restent disponibles, y compris au clavier. Les gestes système du navigateur ou du téléphone restent prioritaires.

Le balayage ne change pas d'écran pendant une fenêtre modale, une recherche de produit, une écriture en cours ou une demande partagée incertaine. Les contrôles interactifs, le défilement vertical, les listes horizontales et les gestes à plusieurs doigts sont préservés. Quitter Scanner suit le même cycle de fermeture caméra que les boutons ; y entrer ne l'active pas automatiquement. Le changement d'écran n'écrit pas dans la réserve.

Dans les formulaires produit, les deux contrôles d'une même ligne restent alignés en haut et en bas, même lorsqu'un seul libellé possède la mention facultatif. Les libellés et aides restent associés aux champs.

L'interface doit être mobile-first, très épurée et sans texte superflu. Évite les écrans chargés, les étapes de confirmation inutiles et les éléments purement décoratifs.

## Spécifications fonctionnelles

### 1. Produits et stock

Chaque produit possède :

- Un nom obligatoire.
- Un code-barres facultatif.
- Une marque facultative.
- Un conditionnement facultatif (valeur et unité : g, kg, ml, L ou pièce).
- Une photo et une catégorie facultatives.
- Une quantité en stock, exprimée en nombre d'emballages.
- Un seuil minimum facultatif, désactivé par défaut.
- Une date de dernière modification.

Exemple : `Pâtes Barilla — 500 g — ×3`.

Deux marques ou conditionnements différents peuvent correspondre à des produits distincts.

L'écran Stock doit permettre :

- La recherche par nom.
- Le tri alphabétique ou par dernière modification.
- La mémorisation du tri choisi.
- La modification des quantités par boutons + et −.
- L'ajout et la modification manuelle des produits.
- La suppression volontaire, avec confirmation.
- L'affichage des produits épuisés, grisés et regroupés en bas.
- Le réapprovisionnement d'un produit épuisé.

La quantité ne peut jamais être négative.

Une quantité à zéro ne supprime pas la fiche du produit.

La gestion des emballages entamés, des emplacements et des dates de péremption n'est pas demandée.

### 2. Scanner

Le scanner est central dans l'expérience utilisateur.

Fonctionnement souhaité :

- La caméra reste ouverte pendant toute la session.
- Deux modes : Ajouter (vert) et Retirer (rouge).
- Ajouter est sélectionné par défaut.
- Un code-barres reconnu applique automatiquement +1 ou −1, sans confirmation.
- Un aperçu du dernier produit apparaît sous la caméra, avec sa quantité actualisée.
- Sous le scanner, les boutons + et − ajustent le nombre d’exemplaires traités par le dernier scan réussi. Le stock actualisé reste affiché séparément. Les boutons de l’écran Stock continuent de modifier directement le stock.
- Le premier scan traite automatiquement un exemplaire. La quantité traitée reste au moins égale à 1 ; Annuler revient à zéro. En Retirer, elle ne dépasse pas le stock disponible avant ce scan.
- En Ajouter, chaque ajustement met à jour ensemble le stock et les courses liées. Une réduction restaure exactement l’effet correspondant sur les courses, y compris le cochage, sans créer de quantité supplémentaire lorsque les courses étaient déjà épuisées.
- Plusieurs articles peuvent être traités successivement sans fermer le scanner.
- Les lectures involontairement répétées doivent être bloquées, mais le scan volontaire de plusieurs exemplaires identiques doit rester possible.
- Prévoir un retour visuel immédiat, une vibration lorsque disponible et une action Annuler.
- Ne jamais afficher une opération comme réussie avant sa validation effective.

Prévoir également la saisie manuelle d'un code-barres.

### 3. Identification des produits

Ordre de recherche :

1. Catalogue personnel des produits déjà connus.
2. API Open Food Facts.
3. Création manuelle si aucune fiche n'est trouvée.

Pour un produit inconnu, mettre temporairement le scanner en pause et afficher un formulaire court : nom, conditionnement, unité, quantité et photo facultative.

Mémoriser le code-barres et la fiche créée afin de reconnaître immédiatement le produit lors des scans suivants.

La dépendance à Open Food Facts doit être isolée pour pouvoir remplacer ou compléter ce fournisseur ultérieurement. Respecter ses conditions d'utilisation et limites API.

### 4. Liste « À acheter »

La V1 inclut une liste de courses simple permettant :

- L'ajout de produits du catalogue ou d'articles libres.
- La modification des quantités.
- La suppression ou le cochage des articles.
- La suggestion d'ajout aux courses lorsqu'un produit passe sous son seuil minimum.

Les suggestions ne doivent pas être ajoutées automatiquement.

La quantité suggérée correspond au nombre d'emballages nécessaires pour retrouver le seuil minimum.

Lorsqu'un produit associé à la liste de courses est scanné en mode Ajouter, réduire automatiquement la quantité restant à acheter, sans passer sous zéro.

Ne pas associer automatiquement les articles libres à des produits sur la seule ressemblance de leur nom.

### 5. Partage et synchronisation

La version finale comportera :

- Deux comptes individuels.
- Une réserve commune accessible par invitation.
- Une synchronisation entre appareils.
- Des opérations de stock atomiques, protégées contre les conflits et les doubles traitements.
- Un accès privé aux données.

Supabase est la solution privilégiée, mais tu peux proposer une alternative si elle présente un avantage concret.

Pour la V1 finale, la consultation du dernier stock synchronisé devra fonctionner hors ligne. Les modifications hors ligne ne sont pas prioritaires.

Il faudra également prévoir un export de sauvegarde et une procédure de restauration, notamment en cas de mise en pause du projet Supabase gratuit.

## Architecture

Choisis et justifie brièvement une architecture adaptée à une PWA mobile légère.

Stack indicative, non imposée :

- React et TypeScript.
- Vite avec support PWA.
- Supabase.
- Open Food Facts.
- Bibliothèque de lecture des codes-barres compatible Android et Safari iOS.

Utilise des outils et dépendances actuels, stables et maintenus.

Sépare suffisamment l'interface, la logique métier et les accès aux données pour permettre l'évolution du projet, sans sur-ingénierie.

Évite les dépendances inutiles, les secrets dans le dépôt et les mécanismes complexes qui n'apportent aucun bénéfice concret.

## Périmètre livré : étape 1 locale

Trois vues, démo, stockage local versionné, stock et catalogue éditables, scanner par saisie et courses. Sans comptes, caméra, Open Food Facts ni Supabase. Le manifeste et le cache PWA sont présents ; l’installation sur appareils réels reste à valider.

### Précisions du scanner caméra de phase 3

Activation explicite, caméra arrière préférée, vidéo intégrée, décodage ZXing local et différé. Formats caméra EAN-13/EAN-8/UPC-A avec clé valide, au moins trois observations concordantes. Verrou sans expiration d’un code encore relu ; autre code stable accepté, réarmement après au moins cinq observations sans résultat sur une seconde ou répétition explicite. Les pauses (formulaire, réseau, changement de mode, arrière-plan) ne réarment pas le code. Conservation des chaînes et de leurs zéros, recherche exacte puis équivalence UPC-A/EAN-13 préfixé de zéro. La saisie personnelle 4–32 chiffres conserve son contrat et son délai historique ; elle reste le secours.

Un inconnu suspend la détection, conserve le flux et ouvre le formulaire existant. Toute écriture/incertitude partagée bloque les lectures ; même RPC, idempotence, reçu et snapshot cohérent avant succès. Quitter, se déconnecter ou masquer la page arrête les pistes ; reprise caméra explicite au retour. Lampe facultative selon capacités. Aucune image transmise. Ces précisions remplacent les seuls comportements de simulation ci-dessous ; le reste des règles demeure. Recette réelle et réglage des seuils à valider selon `TESTS_TELEPHONES.md`.

### Hypothèses et précisions du prototype

#### Préférences visuelles

La roue crantée ouvre les préférences : Automatique (par défaut), Sauge claire, Sauge sombre, Ardoise, Rétro crème et Rétro pétrole, à fonds unis. Automatique suit la préférence système et ses changements ; un choix manuel prévaut sur le système. Le changement est immédiat et la préférence est conservée dans la clé locale `app-reserve.theme.v1`, séparée des données de stock et de courses. Changer de thème n’invalide pas le dernier scan. Une préférence illisible revient à Automatique ; un échec d’écriture est signalé sans prétendre avoir mémorisé le choix.

Le scanner ne répète pas son titre/sous-titre au-dessus des commandes. Le choix manuel de caméra est conservé localement dans `app-reserve.camera.v1` (identifiant et libellé, secours par nom si l’ID change) ; aucun identifiant n’est transmis. Un stockage bloqué produit une erreur sans annoncer de mémorisation.

Le thème s’applique à tous les écrans, formulaires, modales, navigation mobile et contrôles natifs. Un script exécuté avant le premier rendu limite le flash d’un thème incorrect. Les palettes sont centralisées dans `src/theme.css`, sans nouvelle bibliothèque d’interface ; les verts Ajouter et rouges Retirer restent distincts. Les couleurs de texte, états épuisés et contrôles désactivés restent lisibles dans les deux thèmes.

#### Règles de gestion locales

- Quantités entières d’emballages entre 0 et 9 999, jamais négatives. Un seuil facultatif à zéro est valide et ne produit pas de suggestion.
- La recherche porte sur le nom, sans distinction de casse ni d’accents. Les catégories sont facultatives et servent aussi de filtre ; « Autres » est la valeur de formulaire par défaut.
- Les épuisés sont groupés après les produits disponibles, puis suivent le tri choisi. Le tri persiste même après fermeture.
- Un code-barres non vide est une suite de 4 à 32 chiffres, unique dans le catalogue. Les exemples sont des données de simulation, non vérifiées auprès d’un fournisseur.
- Une lecture Ajouter/Retirer connue applique exactement un mouvement de +1/−1 après sauvegarde. Le même code soumis à moins de 1,2 seconde est ignoré ; « Scanner à nouveau » exprime une répétition volontaire et contourne ce délai.
- Un inconnu met l’interaction en pause dans une fenêtre modale. En Ajouter, la quantité saisie est le stock final, 1 par défaut. En Retirer, elle vaut zéro par défaut et il n’y a pas de retrait automatique : aucun stock antérieur n’est connu. Nom, conditionnement, unité, quantité et photo suffisent ; les autres champs restent modifiables depuis Stock.
- Les boutons sous le scanner pilotent un **total traité**, indépendant du stock affiché. En Ajouter, le stock vaut stock initial + total traité ; les courses liées non cochées au départ sont réduites du même total, avec un plancher à zéro. En Retirer, le stock vaut stock initial − total traité et les courses restent intactes. Les effets sont recalculés depuis l’état de départ du scan, sans cumuler les déductions des ajustements précédents.
- Réduire le total traité restaure uniquement les quantités effectivement déduites par ce scan ; les articles libres et les articles déjà cochés avant ce scan ne changent pas. Si plusieurs lignes actives sont liées au même produit, le total est réparti entre elles dans leur ordre, sans double déduction.
- Le total traité reste entre 1 et la limite autorisée : 9 999 moins le stock initial en Ajouter, stock initial en Retirer. Le bouton − est désactivé à 1 ; Annuler restaure le stock et les courses d’avant ce scan, même après plusieurs ajustements. La fiche d’un produit épuisé est conservée.
- Un nouveau scan réussi, y compris « Scanner à nouveau », commence une nouvelle opération à 1 exemplaire. Son annulation conserve les effets des scans précédents. Changer de mode prépare le prochain scan et ne réinterprète pas le dernier mouvement : le compteur précise toujours s’il s’agit d’ajouts ou de retraits.
- Les boutons de l’écran Stock restent indépendants des courses. Toute autre mutation locale, ou un changement de sauvegarde dans un autre onglet, invalide l’ajustement et l’annulation du dernier scan. Le compteur devient indisponible avec un message explicite ; un nouveau scan est nécessaire. Une écriture périmée ou une sauvegarde supprimée entre-temps est refusée sans écraser le stockage.
- Pour un inconnu créé en Ajouter avec une quantité positive, cette quantité est le total initial traité et reste ajustable ; l’annulation supprime la création et ses effets. Une création à zéro ou en Retirer ne constitue pas un mouvement : le stock indiqué est conservé et un nouveau scan est nécessaire avant d’ajuster un total traité.
- Chaque opération possède un identifiant stable lors des ajustements, un total cible absolu et une révision attendue. Rejouer le même total sur la même révision n’applique aucun effet supplémentaire. Le contexte est conservé en mémoire après sauvegarde effective ; recharger la page ne rejoue aucun mouvement. Ces éléments préparent une future commande transactionnelle ; aucun journal idempotent durable ni service Supabase n’est ajouté ici.
- À zéro restant à acheter, l’article lié est coché et conservé. Le décocher rétablit au moins 1 ; modifier sa quantité le décoche. Cocher manuellement conserve la quantité indiquée.
- Les ajouts répétés d’un produit lié non coché cumulent la quantité. Les articles libres restent séparés, même en cas de nom identique au catalogue.
- Une suggestion vaut seuil moins stock et nécessite un clic. Un produit ayant déjà un article lié non coché n’est pas reproposé ; la quantité déjà prévue reste modifiable manuellement.
- Supprimer un produit exige une confirmation ; les courses qui le référencent sont conservées comme articles libres, sans référence cassée.
- Annuler le dernier scan restaure son état avant le premier exemplaire, stock et courses ensemble ou création de l’inconnu, même après ses ajustements. Une mutation extérieure à cette opération invalide cette annulation. La future synchronisation utilisera des opérations compensatrices, pas des snapshots globaux.
- Une écriture locale doit réussir avant d’actualiser l’interface ou de vibrer. Une sauvegarde illisible reste intacte, les mutations sont bloquées et un export brut est possible. Une réinitialisation explicite peut la remplacer.
- Persistance dans le navigateur, sans partage : suppression des données du navigateur = perte de ce cache. La détection de révisions entre onglets est une aide, sans garantie d’atomicité ; un seul onglet d’édition est recommandé.
- Photo JPEG/PNG/WebP facultative de 500 Ko maximum, conservée en data URL. Le futur stockage photo sera indépendant.
- Export JSON brut disponible. La restauration guidée et la procédure Supabase complète appartiennent à une étape ultérieure.

Voir `PLAN.md` pour les étapes futures et `VALIDATION.md` pour les vérifications effectuées.

## Backend de phase 2A

Le schéma PostgreSQL distingue catalogue et stock, limite les réserves à deux membres et impose la visibilité par appartenance via RLS. Les clients n’écrivent pas directement les tables : les RPC vérifient Auth, les droits, les bornes et les dépendances, puis traitent ensemble stock, courses et reçu d’idempotence.

Les invitations ciblent un email Auth vérifié, expirent après 24 h, n’ajoutent qu’un membre ordinaire et ne sont consommables qu’une fois. Le secret n’est jamais conservé en clair dans les tables ou reçus ; sa création ne le retourne qu’une seule fois. Une nouvelle création révoque les anciennes invitations encore utilisables.

Une clé est réutilisée seulement pour rejouer la même intention. Les ajustements d’un scan transmettent son identifiant, sa dernière version et un total absolu ; Annuler applique une compensation ciblée. Une modification de réserve postérieure invalide corrections/annulations et doit produire un refus explicite, jamais écraser des données récentes. Les replays retournent leur reçu historique ; le futur client doit relire le snapshot courant avant affichage.

Ces règles serveur sont utilisées par les écrans partagés, sans double source de vérité. Une fiche inconnue créée à stock zéro reçoit ensuite un mouvement identifié ; son annulation compensatrice conserve la fiche à zéro. API, références photos privées futures, garanties et limites sont détaillées dans `BACKEND.md`.

### Précisions de la phase 2B locale

Auth gère les sessions persistées et la confirmation email obligatoire. Les invitations ciblées se partagent par lien temporaire avec secret dans le fragment, consommé en mémoire puis retiré immédiatement de l’URL. Après inscription et confirmation, rouvrir le lien initial pour accepter ; un membre déjà présent peut rouvrir sa réserve sans consommer à nouveau l’invitation.

Les écrans partagés affichent un snapshot confirmé. Une mutation RPC est suivie d’une relecture ; une demande incertaine conserve UUID et paramètres en `sessionStorage` par compte/réserve et bloque toute nouvelle écriture jusqu’à reprise. Polling de cinq secondes lorsque l’application est visible, rafraîchissement au premier plan/reconnexion. Les échecs affichent la dernière lecture réussie ; aucune bascule silencieuse vers la démo.

Les boutons Stock sont indépendants des courses et du compteur de scan. L’édition d’une fiche existante porte sur ses métadonnées ; son stock se règle avec les boutons, sans écraser une quantité plus récente. Les modifications manuelles de courses/métadonnées sont partielles, dernière valeur explicitement envoyée gagnante.

Thème et tri locaux. Aucun catalogue privé sauvegardé durablement ; consultation pendant une panne limitée au snapshot en mémoire. Déconnexion : vues privées et demandes de reprise retirées. Photos partagées désactivées en attendant Storage privé ; références `photo_path` préservées. La restauration globale décrite pour le prototype concerne uniquement la démo ; les annulations partagées compensent les mouvements côté serveur.
