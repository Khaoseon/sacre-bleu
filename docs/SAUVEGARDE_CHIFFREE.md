# Sauvegarde chiffrée de la réserve

Prérequis : Node, Docker actif, dépendances installées par `npm ci`, CLI connectée et projet lié selon `CLOUD.md`. GnuPG 2.4+ est requis ; le script détecte notamment celui fourni par Git for Windows. Suspendre les modifications dans les deux sessions pendant l’export et jusqu’au contrôle préalable au déploiement. Le script lit la production et refuse un historique de migrations divergent.

## Créer et conserver

Dans un **terminal personnel interactif**, choisir un dossier privé absolu hors de tout dépôt Git, puis lancer (adapter le chemin) :

```powershell
npm run backup:cloud -- --destination "D:\Sauvegardes\App_reserve" --project-ref uznbnihmdzxdnlxanjcl
```

Choisir une phrase secrète unique d’au moins 20 caractères, idéalement six mots aléatoires. La saisir aux deux invites invisibles, puis la ressaisir pour le contrôle indépendant. La conserver dans un gestionnaire de mots de passe séparé. Aucun secret en argument, variable d’environnement, fichier de script ou conversation.

### Sauvegarde préalable au déploiement de phase 4

Le 28 octobre 2026, la vérification distante confirme les trois migrations historiques appliquées et la seule migration `20261028000100` en attente. Le mode normal refuse cet écart. Le mode explicite ci-dessous accepte **uniquement cet état précis**, pas une divergence ou une autre migration manquante :

```powershell
Set-Location 'C:\Users\david\Documents\App_reserve'
npm run backup:cloud -- --destination (Read-Host 'Dossier prive absolu hors Git') --project-ref uznbnihmdzxdnlxanjcl --before-phase4
```

Indiquer un dossier personnel absolu hors de tout dépôt Git, idéalement le dossier des sauvegardes existantes. Ne pas saisir la phrase secrète dans le chat. L’archive contient les données actuelles et **les trois migrations appliquées seulement** ; la phase 4 en attente est mentionnée dans les métadonnées et le reçu, sans être incluse parmi les migrations de restauration. Aucune migration distante n’est appliquée par ce script.

Le script compare les empreintes SHA-256 des dix tables sauvegardées avant et après l’export et refuse une modification pendant cette fenêtre. Les empreintes, la liste des migrations appliquées et la version en attente figurent dans le reçu privé `.verification.json`, en plus des vérifications de chiffrement existantes. Il faut garder les trois fichiers ensemble et communiquer seulement le **chemin** de l’archive pour le contrôle préalable ; aucune archive, donnée SQL, empreinte Auth ou phrase secrète à coller dans la conversation.

Après application de la phase 4, retirer `--before-phase4` : le mode normal exige les quatre migrations alignées et inclut aussi la table technique `private.product_lookup_gate`. Le mode préalable refuse de fonctionner si la phase 4 est déjà appliquée. Les empreintes permettront de comparer l’archive à l’état courant avant une mutation distante ; elles ne dispensent pas de la vérification du fichier chiffré et de son reçu.

L’export reste en mémoire ; seuls l’archive chiffrée OpenPGP AES-256, son empreinte `.sha256` et son reçu `.verification.json` sont écrits. GnuPG utilise une dérivation salée et itérée SHA-512, sans cache de phrase secrète. Aucun dump en clair n’est créé. Voir les [options officielles GnuPG](https://gnupg.org/documentation/manuals/gnupg/OpenPGP-Options.html).

« Sauvegarde vérifiée » confirme : déchiffrement avec une nouvelle saisie, intégrité OpenPGP, égalité exacte du paquet avec l’export et empreintes SHA-256 de tous les fichiers internes. Un mauvais mot de passe ou une archive altérée est refusé. Les erreurs n’impriment pas les sorties SQL ou les secrets. En cas d’échec, ne pas considérer un fichier isolé comme une sauvegarde validée ; vérifier le reçu et relancer après diagnostic.

Copier **les trois fichiers** sur un autre support privé (disque externe déconnecté, par exemple). Une copie sur le même PC ne protège pas de sa perte. Garder quatre versions récentes et une avant chaque changement de schéma. Conserver la phrase séparément : sa perte empêche la récupération. Les empreintes détectent une altération ; elles ne remplacent pas la protection du support et du mot de passe.

## Vérifier et récupérer

Pour contrôler une copie sans extraire son contenu ni toucher une base :

```powershell
npm run backup:verify -- --archive "D:\Sauvegardes\App_reserve\NOM.json.gz.gpg"
```

Pour une récupération uniquement, extraire dans un **dossier privé neuf hors Git** :

```powershell
npm run backup:extract -- --archive "D:\Sauvegardes\App_reserve\NOM.json.gz.gpg" --destination "D:\Recuperation\reserve-neuve"
```

L’extraction vérifie le chiffrement et les empreintes ; elle ne se connecte à aucune base. Les fichiers extraits contiennent des données personnelles en clair : accès restreint et suppression après récupération. Garder la copie chiffrée originale. Suivre ensuite [la restauration transactionnelle éprouvée](BACKUP.md#restauration-après-incident), sur une cible Supabase **neuve**, compatible PostgreSQL/Auth. Appliquer les migrations ; `schema.sql` est une référence, pas un second schéma à appliquer. Aucun reset de production.

## Périmètre et limites

Avant phase 4 : exactement cinq tables `public`, trois tables `private`, `auth.users` et `auth.identities`. Après phase 4 appliquée, la table technique privée du budget s’y ajoute, soit onze tables. Les comptes email et leurs empreintes de mots de passe sont nécessaires à la conservation des UUID et restent confidentiels. Toutes les autres tables Auth, notamment sessions, tokens de renouvellement et journaux de connexion, sont exclues. Le script s’arrête si un fournisseur autre qu’email, des facteurs MFA ou une dépendance Auth incompatible apparaissent.

L’archive inclut le schéma de référence, les migrations et configurations non secrètes du commit Git, ainsi qu’un guide de récupération. Aucun secret de plateforme, paramètre SMTP privé ou fichier d’environnement. Aucun objet Storage n’est utilisé en 2C. Taille maximale du paquet en mémoire : 64 Mio ; réexaminer la méthode au-delà ou après évolution Auth/Storage. Les réglages SMTP et secrets de plateforme seront reconfigurés séparément lors d’une reprise.

Git ignore archives, reçus et dumps ; le script refuse en plus tout emplacement situé dans un dépôt Git. Les migrations SQL restent versionnées. `npm run test:backup` vérifie sur données synthétiques manifeste, chemins, bon/mauvais mot de passe et corruption. Ces contrôles ne relancent pas la restauration déjà validée en 2C, dont les limites figurent dans `BACKUP.md`.
