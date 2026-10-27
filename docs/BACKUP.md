# Sauvegarde et reprise — Supabase Free

Procédure administrative préparée pour deux utilisateurs, au 27 octobre 2026. **Pas encore exécutée sur Cloud ni validée par une restauration complète.** L’export JSON de démonstration ne sauvegarde pas la réserve partagée. L’import utilisateur avec prévisualisation reste une fonction future de phase 5.

## Quoi conserver et à quelle fréquence

Après une séance importante et au minimum chaque semaine d’utilisation, sauvegarder les données de `public` (réserve, membres, catalogue, stock, courses), les journaux `private` nécessaires à l’idempotence/compensation et les comptes Auth associés. Les UUID Auth sont référencés par les membres et les reçus : un dump métier seul ne suffit pas à une restauration identique. Les sessions, refresh tokens, historiques de livraison et traces de connexion ne sont pas nécessaires pour reprendre avec une nouvelle connexion.

Conserver aussi le commit Git et les migrations correspondantes, les versions PostgreSQL/pgcrypto/Auth, la liste des versions appliquées et les **réglages non secrets** Auth/API/SMTP. Ne jamais copier mot de passe DB, token CLI ou clé secrète dans ce manifeste. Aucun fichier Storage n’est utilisé en 2C ; les références `photo_path` sont conservées, mais ne constituent pas une sauvegarde d’images. Ajouter une sauvegarde des objets privés quand Storage sera implémenté.

Les exports Auth contiennent des adresses et empreintes de mots de passe, les journaux privés des paramètres métier : ce sont des fichiers **confidentiels**. Les conserver dans une archive chiffrée ou un volume chiffré, puis en faire une copie hors Supabase (support personnel chiffré, ou espace de sauvegarde privé déjà choisi par l’utilisateur). Garder par exemple les quatre derniers exports et une copie avant chaque changement de schéma. La perte possible correspond au temps écoulé depuis la dernière copie vérifiée. Le chiffrement de disque local ne chiffre pas automatiquement un fichier téléversé ailleurs.

`backups/`, `*.dump`, `*.backup` et les fichiers d’environnement sont ignorés par Git. Ne pas placer une sauvegarde sous `public/`, `dist/`, `dist-cloud/` ou dans un commit. Ne pas transmettre ces fichiers dans la conversation. `Compress-Archive` seul ne chiffre pas une archive.

## Export technique sans mot de passe dans une commande

Prérequis : Docker, CLI verrouillée et projet lié par la procédure de `CLOUD.md`. Comparer **avant chaque export** la référence dans `supabase/.temp/project-ref` avec le Dashboard. Suspendre les modifications dans les deux sessions pendant les exports pour simplifier la cohérence entre fichiers. Les commandes de dump lisent la base, elles n’y créent pas de données.

```powershell
$backupDirectory = Join-Path 'backups' (Get-Date -Format 'yyyyMMdd-HHmmss')
New-Item -ItemType Directory -Path $backupDirectory -ErrorAction Stop
npx --no-install supabase db dump --linked --schema public,private --file "$backupDirectory/schema.sql"
if ($LASTEXITCODE -ne 0) { throw 'Échec export schéma : sauvegarde incomplète.' }
npx --no-install supabase db dump --linked --schema public,private,auth --data-only --use-copy --exclude auth.sessions --exclude auth.refresh_tokens --exclude auth.mfa_amr_claims --exclude auth.one_time_tokens --exclude auth.flow_state --exclude auth.audit_log_entries --file "$backupDirectory/data.sql"
if ($LASTEXITCODE -ne 0) { throw 'Échec export données : sauvegarde incomplète.' }
npx --no-install supabase migration list --linked | Out-File -Encoding utf8 "$backupDirectory/migrations.txt"
if ($LASTEXITCODE -ne 0) { throw 'Échec inventaire migrations.' }
git rev-parse HEAD | Out-File -Encoding utf8 "$backupDirectory/commit.txt"
Get-FileHash -Algorithm SHA256 "$backupDirectory/schema.sql", "$backupDirectory/data.sql" | Format-List | Out-File -Encoding utf8 "$backupDirectory/checksums.txt"
```

Ne pas ajouter `--password` ou une URL avec mot de passe à ces commandes. Laisser la CLI utiliser sa connexion autorisée ou son invite masquée dans le terminal personnel. Si elle ne peut pas accéder à la base sans secret supplémentaire, terminer cette étape interactivement ; ne pas demander de secret dans le chat.

Vérifier les codes de sortie, la taille non nulle des fichiers, les en-têtes de tables attendues (cinq `public`, trois `private`, comptes dans `auth.users`/`auth.identities`) sans imprimer les lignes de données. Les exclusions retirent les sessions et les dépendances de session ; les autres tables Auth doivent être compatibles avec la version cible. Aucun rôle métier personnalisé n’est créé par App_reserve : les rôles de plateforme ne sont pas restaurés aveuglément. `schema.sql` sert de référence/audit ; les migrations versionnées restent la source du schéma.

Chiffrer et copier hors Supabase, puis vérifier que la copie peut être relue et que ses empreintes correspondent. Un fichier présent sur le même ordinateur ne suffit pas contre sa perte. La disponibilité d’un export ne prouve pas sa restaurabilité : exécuter l’exercice ci-dessous avant l’usage quotidien et après tout changement majeur.

## Reprendre un projet suspendu

Le Free peut être suspendu après une période de faible activité d’environ sept jours. Conserver les notifications de l’organisation actives. À la reprise, ouvrir le Dashboard, sélectionner le projet et utiliser **Resume project** ; attendre le retour des services puis vérifier connexion, réserve, deux membres et quantités. Reconnecter les comptes si nécessaire. Une panne ou une pause ne doit pas provoquer la recréation d’une réserve ou un import de démo.

La [documentation de pause consultée](https://supabase.com/docs/guides/platform/free-project-pausing) annonce actuellement une fenêtre de reprise d’un an. Une ancienne annonce mentionnait 90 jours : toujours suivre l’échéance affichée pour le projet et ne pas en faire une stratégie de sauvegarde. Si la reprise n’est plus proposée, télécharger les sauvegardes encore disponibles depuis le Dashboard et préparer une cible neuve. Après suppression du projet, la récupération de ses sauvegardes n’est plus possible. Les exports personnels restent donc nécessaires.

Aucune tâche de maintien artificiel d’activité n’est ajoutée. Des requêtes périodiques ne constituent ni sauvegarde, ni garantie de disponibilité ou de conservation ; un changement de politique reste possible. Supabase Pro évite la pause automatique, mais entraîne un abonnement à faire approuver séparément.

## Restauration après incident

Une restauration n’est jamais un reset du Cloud existant. Préparer une instance **neuve**, locale et isolée pour l’exercice, puis un projet de remplacement seulement après accord si nécessaire. Ne pas utiliser les fixtures 2A/2B sur l’hébergement.

1. Vérifier empreintes et date de l’archive, retrouver le commit/migrations associés. Contrôler compatibilité des versions PostgreSQL et Auth, schéma pgcrypto et colonnes des tables Auth. Une incompatibilité doit être analysée avant import, sans ignorer les erreurs. Le guide officiel couvre aussi les cas Vault/chiffrement : ils ne sont pas utilisés par le modèle métier 2C et demanderaient une procédure supplémentaire.
2. Recréer les **trois migrations**, puis les migrations ultérieures éventuelles jusqu’à la version sauvegardée. Pour une cible Cloud vide, suivre précontrôle, dry-run et accord de `CLOUD.md`. Ne pas importer `schema.sql` en plus des mêmes migrations : il ferait doublon. L’historique est recréé par leur application, pas par `migration repair`.
3. Garder frontend arrêté et inscriptions fermées pendant l’import, sans désactiver la confirmation des emails. La cible doit être sans comptes utilisateurs ni données applicatives ; sinon arrêter. Restaurer `data.sql` avec `psql`, en **une transaction** et arrêt à la première erreur. Utiliser les paramètres sans secret de Connect (direct ou Session pooler, pas Transaction pooler), le rôle administratif approprié, `sslmode=require` et l’invite `--password` ; aucun mot de passe en argument ou dans l’historique.

Exemple de **forme** de commande à adapter à la cible neuve examinée, à ne pas lancer aujourd’hui :

```powershell
# HOST et UTILISATEUR viennent du panneau Connect de la cible.
# Direct : postgres ; Session pooler : généralement postgres.REFERENCE_CIBLE.
psql "host=HOST port=5432 dbname=postgres user=UTILISATEUR sslmode=require" --password --single-transaction --variable ON_ERROR_STOP=1 --command "SET session_replication_role = replica" --file CHEMIN_PRIVE/data.sql --command "SET session_replication_role = origin"
```

Cette opération administrative suit la méthode du [guide officiel de restauration CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) : les triggers sont temporairement neutralisés dans la session d’import pour préserver les données techniques. Cela ne remplace pas les contrôles d’intégrité après import. En cas d’erreur, la transaction est annulée ; examiner la cause sur la cible de répétition et reprendre depuis une cible vide, sans relancer à l’aveugle sur des données partiellement connues.

4. Vérifier **avant réouverture** : aucun membre/réserve/reçu orphelin d’Auth, un owner conforme à `owner_id`, maximum deux membres, une ligne de stock par produit, liens de courses de même réserve, quantités 0–9999, versions/révisions préservées, contraintes et index. Comparer les tables métier/journaux avec la sauvegarde, par UUID, quantité et liens ; pas seulement leurs nombres de lignes. Relancer `cloud-audit.sql` en lecture seule (ou sa copie sur la cible locale de répétition). Le rôle de réplication doit être revenu à `origin` dans une nouvelle session.
5. Auth `users` et `identities` sont restaurés ensemble avec leurs UUID ; les membres et reçus continuent de les référencer. Aucun UUID n’est attribué au hasard à un nouveau compte. Les anciennes sessions sont exclues de l’archive : ouvrir un nouveau profil, se reconnecter normalement. Ne pas copier une ancienne session navigateur vers une nouvelle instance. Vérifier séparément toute donnée Auth chiffrée si le périmètre Auth évolue.
6. Reconfigurer API (jamais `private` exposé), Auth/confirmation, SMTP, modèle de message et URLs exactes sur le projet de remplacement. Les secrets de plateforme ne font pas partie de l’archive et ne sont pas réutilisés dans le frontend. Remplacer seulement URL publique/clé publishable dans `.env.cloud.local`. Révoquer/régénérer les invitations encore en attente via le parcours propriétaire avant de repartager un lien ; les anciennes URLs ne désignent pas le nouveau frontend.
7. Tester les deux comptes, un accès extérieur refusé, une RPC autorisée et la synchronisation. Reporter le résultat de la répétition dans `HANDOFF_2C.md` : date, version, égalité des données, contrôles Auth/RLS et limitations. Réaliser une nouvelle sauvegarde après reprise validée.

Cette méthode technique conserve les données et UUID originaux, sous contrôle administratif. Si seule une copie des produits/courses est récupérable et qu’Auth est perdue, elle nécessite une **restauration distincte** avec nouveaux comptes confirmés et remappage explicite des identifiants via une procédure examinée. Ne pas copier directement les anciens `owner_id`/`user_id`, ni inventer une validation email. L’import JSON utilisateur transactionnel prévu en phase 5 répondra à ce cas ; il n’est pas annoncé comme livré ici.

La [documentation des sauvegardes Supabase](https://supabase.com/docs/guides/platform/backups) recommande les exports CLI et copies externes pour Free. Cette préparation ne certifie pas encore une restauration : le projet doit rester en mise en service tant que l’exercice n’a pas réussi.
