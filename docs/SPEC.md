# Spécification produit — App_reserve

Exigences fonctionnelles d’origine conservées ci-dessous. La phase 2B relie les écrans au backend Supabase local sécurisé de phase 2A. La phase 2C a validé le même backend sur Supabase Free à Paris, avec modes de configuration et sessions séparés ; résultats dans `HANDOFF_2C.md`. Le mode démo reste explicitement isolé. La phase 3 ajoute la caméra et conserve les contrats métier ; détails dans `SCANNER.md`, validations et limites dans `HANDOFF_3.md`. Aucun déploiement PWA ni Open Food Facts ; recette principale iPhone/Samsung validée le 28 octobre 2026, limites complémentaires dans `VALIDATION.md`.

## Contexte du produit

App_reserve est une application personnelle, installable sur Android et iOS sans publication sur les stores.

Elle permet à deux utilisateurs de gérer une même réserve alimentaire, principalement composée de produits secs et de conserves.

L'objectif principal est de **connaître et modifier rapidement les quantités disponibles, avec un minimum de manipulations**.

L'application comporte trois écrans principaux :

- **Stock** : consulter, rechercher et modifier les produits.
- **Scanner** : ajouter ou retirer rapidement des produits à l'aide de codes-barres.
- **À acheter** : gérer une petite liste de courses partagée.

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
