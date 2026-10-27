# Backend Supabase — phases 2A, 2B et passage Cloud 2C

Le backend est implémenté et testé **localement**. La phase 2B branche les écrans React sur les RPC, avec sessions Auth et démo explicitement isolée, en conservant l’interface et les thèmes. En phase 2C, les trois migrations inchangées ont été appliquées, après accord, sur Supabase Free `uznbnihmdzxdnlxanjcl` à Paris. L’état de recette Auth/SMTP et les limitations sont dans `HANDOFF_2C.md` ; procédures Cloud et sauvegarde dans `CLOUD.md` et `BACKUP.md`.

## Démarrage reproductible

Prérequis : Node 24+, npm et Docker Desktop avec moteur Linux opérationnel. La CLI officielle est verrouillée dans les dépendances de développement ; aucune installation globale ni connexion Supabase distante n’est nécessaire. La phase 3 réutilise ce backend sans modification de migration ou de contrat RPC ; voir `SCANNER.md`.

```powershell
npm ci
npm run db:start
npm run db:reset
npm run test:db
npm run test:db:concurrency
npm run test:db:api
npm run db:types
npm run db:lint
npm test
npm run typecheck
npm run build
npm run format:check
npm run db:stop
```

`db:reset` utilise explicitement `--local --no-seed` : il recrée la base **locale du projet** et efface ses données. Il ne touche ni au navigateur, ni aux données d’un projet hébergé. Ne pas utiliser ce reset pour conserver des données locales irremplaçables. `db:stop` conserve les volumes locaux ; aucune option de suppression n’est ajoutée.

Ports du projet : API `http://127.0.0.1:55321`, PostgreSQL `127.0.0.1:55322`, base de comparaison des migrations `55320`, boîte mail de test `http://127.0.0.1:55324`. La plage habituelle 543xx était réservée par Windows sur l’environnement de validation ; les ports 553xx évitent ce conflit sans changer le système. Les scripts de tests lisent le port PostgreSQL dans `supabase/config.toml` et imposent la boucle locale. Aucun paramètre d’environnement ne peut les rediriger vers une base distante.

La stack locale emploie des identifiants de développement fournis par la CLI. Ils ne doivent pas être réutilisés en hébergement ni publiés dans les journaux ou le client. Ne pas exposer les ports de cette stack de développement sur un réseau public. Studio, Realtime, Storage, analytics et Edge Functions sont désactivés car non nécessaires à 2A. Les emails Auth sont capturés par Mailpit et ne sont pas envoyés à des destinataires réels.

## Modèle et accès

| Schéma / table            | Responsabilité                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `public.reserves`         | Réserve, propriétaire, révision monotone                                           |
| `public.reserve_members`  | Membres et rôle owner/member, maximum deux                                         |
| `public.products`         | Catalogue : nom, marque, code, conditionnement, catégorie, référence photo         |
| `public.product_stock`    | Stock 0–9999, seuil nullable, version, date                                        |
| `public.shopping_items`   | Article libre ou produit lié, restant à acheter, cochage, version                  |
| `private.invitations`     | Destinataire, empreinte du secret, expiration, utilisation/révocation              |
| `private.requests`        | Reçus d’idempotence, par utilisateur et UUID de requête                            |
| `private.scan_operations` | Total traité, versions et seules données de courses nécessaires à une compensation |

Le catalogue et le stock sont distincts, reliés en un-à-un. Un code non nul est unique **par réserve**. Les clés étrangères composites empêchent les associations entre deux réserves. Une seule ligne de courses non cochée par produit est autorisée ; les ajouts répétés à cette ligne cumulent les quantités. Les articles libres ne fusionnent jamais par nom.

Toutes les tables applicatives ont RLS activée. Les tables exposées accordent **SELECT seulement** à `authenticated`, avec une politique vérifiant la présence effective de `auth.uid()` parmi les membres. `anon` n’a ni lecture, ni mutation, ni exécution des RPC applicatives. Les tables techniques n’ont aucun accès client et leur schéma n’est pas exposé via l’API.

Les mutations sont exclusivement des RPC à autorisation explicite : connexion non anonyme, email confirmé, appartenance à la réserve, puis propriétaire lorsque nécessaire. Les fonctions privilégiées ont `search_path = ''` et des références de schéma qualifiées ; les autorisations d’exécution publiques sont révoquées. Le rôle demandé dans `user_metadata` n’est jamais utilisé pour attribuer des droits. Les privilèges par défaut sont fermés pour les nouveaux objets.

## Interface de commandes

| Fonction publique                                                 | Usage                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `create_reserve(p_request_id, p_name)`                            | Crée une réserve vide et son membre propriétaire                                      |
| `invite_member(p_request_id, p_reserve_id, p_email)`              | Propriétaire uniquement ; produit une invitation de 24 h                              |
| `accept_invitation(p_request_id, p_invitation_id, p_token)`       | Accepte avec le compte vérifié correspondant au destinataire                          |
| `get_reserve_snapshot(p_reserve_id)`                              | Lecture cohérente en une instruction SQL, sous RLS ; aucun résultat pour un extérieur |
| `mutate_reserve(p_request_id, p_reserve_id, p_action, p_payload)` | Commandes de catalogue, stock, scanner et courses                                     |

Les actions disponibles et leurs charges utiles sont typées dans `src/backend/contracts.ts` :

- `create_product` : nom, champs facultatifs et quantité initiale (0 par défaut). Le catalogue et sa ligne de stock sont créés ensemble. `size` et `unit` doivent être ensemble renseignés ou nuls.
- `update_product` : champs de catalogue et/ou seuil. Un champ absent est conservé, un champ nullable explicitement nul est supprimé. La quantité n’est pas modifiable par cette action.
- `delete_product` : détache les courses en articles libres, puis supprime la fiche et son stock dans la même transaction. Le journal technique est conservé.
- `add_shopping`, `update_shopping`, `delete_shopping` : aucune association par ressemblance. Cocher conserve la quantité ; décocher un article à zéro rétablit au moins un. Modifier sa quantité le décoche sauf choix explicite de cochage. Les champs inconnus ou sensibles sont rejetés.
- `stock` : `product_id` et `delta` entier non nul, positif ou négatif. Ne touche pas les courses.
- `scan` : mêmes paramètres ; en positif, réduit les courses liées non cochées et coche à zéro. En négatif, les courses sont inchangées. Le reçu donne `scan_id`, `scan_version` et `processed`.
- `adjust_scan` : `scan_id`, `expected_version` du dernier reçu et **total absolu** `quantity` entre 1 et 9999.
- `undo_scan` : `scan_id` et `expected_version`. Applique le delta inverse de la quantité totale traitée et restaure seulement les déductions de courses correspondantes.

Le seuil minimum ne déclenche jamais une écriture de courses. La phase 2B réutilise les suggestions sur la projection de lecture. `photo_path` est uniquement une référence future de type `reserve_uuid/product_uuid/fichier.webp`, limitée à cette réserve/ce produit et sans traversée `..`. Aucun bucket ni URL publique n’est créé ; les photos devront être servies via un stockage privé et des liens temporaires lors d’une étape ultérieure.

## Transactions, concurrence et replays

Chaque intention possède un UUID `p_request_id`, créé une seule fois côté appelant et conservé lors d’une reprise réseau. Un verrou transactionnel sur utilisateur + clé sérialise les replays. Le reçu et les effets métier sont enregistrés dans **la même transaction**. Une même clé avec d’autres paramètres est rejetée, même en concurrence. Une requête échouée ne laisse aucun reçu de réussite.

Chaque changement du total traité et chaque annulation est une nouvelle intention avec sa propre clé ; `scan_id` reste l’identifiant de l’opération initiale, et `expected_version` provient de son dernier reçu confirmé. Ne pas réutiliser le `scan_id` comme nouvelle clé de commande.

Toutes les écritures d’une réserve prennent ensuite le verrou de sa ligne avant de modifier stock et courses. Cette sérialisation est adaptée à deux membres et simplifie l’ordre des verrous. Deux ajouts réussis cumulent leurs deltas ; deux retraits au dernier emballage produisent un succès et un refus, jamais un stock négatif. Les bornes 0 et 9999 sont également imposées par contraintes.

Le journal de scan conserve le total précédent et les versions observées. Une correction applique au stock `mode × (nouveau total − ancien total)` et projette les courses depuis leur état au début de ce scan. Exemple depuis stock 0 / courses 5 : scan +1 → 1 / 4, total 5 → 5 / 0, total 3 → 3 / 2, Annuler → 0 / 5. Réduire un total supérieur au besoin n’invente pas de quantités de courses. Les articles libres et ceux déjà cochés au début restent intacts.

La correction ou l’annulation est limitée à l’auteur du scan. Elle exige la bonne version du scan, la révision de réserve attendue, la version du stock et l’état des courses inchangés. Une modification ultérieure d’un autre produit ou article de la réserve invalide aussi cette correction, volontairement de façon prudente. Un conflit `40001` impose une actualisation et un nouveau scan ; ne pas le contourner en recréant automatiquement une commande d’annulation. L’opération compensatrice modifie seulement les lignes concernées, sans restaurer un ancien état global ni d’anciennes versions. Une fiche épuisée reste au catalogue.

Un replay réussi retourne le reçu historique d’origine, pas une promesse de stock encore actuel : le client 2B relit le snapshot et compare les révisions avant affichage. Le journal doit être conservé tant que l’on promet l’idempotence de ces clés ; aucune purge automatique n’est ajoutée.

Principaux codes SQL : `42501` accès refusé, `22023` paramètres ou clé réutilisée différemment, `23514` borne/capacité, `23505` unicité, `P0001` invitation invalide/expirée, `P0002` produit/article absent, `40001` compensation devenue périmée.

## Invitations et Auth

Les comptes sont gérés par **Supabase Auth**. La configuration locale exige confirmation de l’adresse, mots de passe d’au moins 12 caractères avec majuscules/minuscules/chiffres et rotation des refresh tokens. Les connexions anonymes sont désactivées. Aucun mot de passe applicatif ni profil parallèle n’est créé dans le schéma métier.

Le propriétaire génère un secret aléatoire de 256 bits ; seule son empreinte SHA-256 est enregistrée. L’acceptation exige le secret et une adresse Auth vérifiée identique à l’adresse invitée. Le verrou de réserve et l’invitation verrouillée empêchent une seconde consommation ou un troisième membre. Le rôle ajouté est toujours `member`. Un membre ne peut ni inviter ni modifier ses droits.

Le jeton n’est retourné qu’à la première création et n’est pas conservé dans le reçu d’idempotence. Rejouer la création retourne les métadonnées avec `token: null`. Si cette réponse initiale est perdue, générer une nouvelle intention avec une nouvelle clé : elle révoque les anciens liens non consommés de cette réserve. L’acceptation rejouée avec la même clé est idempotente ; une autre requête visant une invitation utilisée est refusée.

La phase 2B fournit l’interface et le lien de partage avec secret dans le fragment URL (`#invite=...`), retiré immédiatement après lecture. Ne pas journaliser, mettre en cache ou persister le secret ; le retirer de l’URL après lecture. Le destinataire devra d’abord se connecter et confirmer son email. Aucun email d’invitation n’est envoyé par ces RPC.

## Validation exécutée

Le 26 octobre 2026 : CLI Supabase 2.122.0, Docker Engine 29.9.2, PostgreSQL 17.11. Migrations appliquées par `start`, puis réappliquées depuis une base vierge avec `db:reset --local --no-seed`.

- **80 assertions pgTAP réussies** : rôles et RLS, invitations, compte non vérifié, limite de membres, unicité par réserve avec coexistence du même code dans deux foyers, refus d’accès à un produit étranger par changement d’identifiant, écritures refusées, replays, ajustements et annulations, bornes, articles libres, suppression et échec de courses injecté avec rollback du stock et du reçu.
- **6 tests de concurrence réussis** : les deux connexions sont réellement superposées ; le test observe `pg_stat_activity.wait_event_type = 'Lock'` avant de laisser terminer la première transaction. Ajouts, retraits, même clé, clé réutilisée différemment, double acceptation et refus d’annulation périmée.
- **1 parcours réel Auth/API réussi** : inscriptions locales, refus de connexion avant confirmation, sessions signées, propriétaire/extérieur, accès anonyme refusé, invitation acceptée et écriture directe/escalade refusées. L’email est confirmé **par la fixture SQL** : ce test historique ne valide pas la livraison ni le callback. Le nouveau `npm run test:shared` valide les emails réellement livrés dans Mailpit et la confirmation depuis un client neuf ; les clics/callbacks ont aussi été exercés dans le navigateur en 2B.
- **Linter officiel Supabase réussi**, sans erreur de schéma. Types publics générés depuis la base réellement appliquée avec `db:types`.

Les fixtures ne sont jamais des seeds de vraies réserves. pgTAP annule sa transaction ; les tests multi-connexions et API suppriment seulement leurs UUID de test après exécution. Voir aussi `docs/VALIDATION.md` pour les contrôles de non-régression de la PWA.

## Passage à la phase 2B : une source de vérité

`src/backend/database.generated.ts` provient de la CLI ; ne pas l’éditer manuellement. `contracts.ts` s’appuie sur ces types et définit le port `ReserveBackend`, les noms de RPC et les commandes autorisées. `adapter.ts` implémente ce port avec le SDK officiel typé ; `Root.tsx` gère Auth et partage, `store.ts` les snapshots confirmés et demandes de reprise, `usePantry.ts` le polling et ses écouteurs.

Les types génériques Insert/Update générés décrivent la structure SQL, pas les autorisations d’écriture : leur présence ne change pas l’obligation de passer par les RPC.

Règles mises en place en phase 2B :

1. Écrans/session Auth et adaptateur Supabase implémentant ce port, avec validation des réponses JSON et des erreurs.
2. Choisir explicitement au démarrage le mode **démo** ou **réserve partagée**, jamais deux dépôts actifs écrivant le même état. Une mutation partagée passe uniquement par RPC ; aucun `localStorage` de démonstration n’est mis à jour en parallèle et aucun échec serveur ne bascule silencieusement en mutation locale.
3. Relire le snapshot confirmé avant un succès visible. Réutiliser la même clé pour une reprise de requête incertaine ; générer une nouvelle clé pour une intention différente et transmettre la dernière `scan_version` lors d’une correction.
4. Snapshot privé uniquement en mémoire, scoped par utilisateur/réserve, avec révision/date du dernier succès. Consultation pendant une panne tant qu’il reste en mémoire ; pas de cache persistant ni de nouvelles éditions hors ligne. Déconnexion/changement de compte retire les vues privées et écouteurs. Le journal `sessionStorage` conserve seulement les demandes incertaines, sans secret d’invitation.
5. Garder thème et tri comme préférences d’appareil. Le catalogue de démonstration n’est ni migré ni importé automatiquement. Un import explicite éventuel demandera une prévisualisation et des validations.
6. Préparer l’inconnu dans le catalogue avec stock zéro, puis créer son mouvement de scan. Si le mouvement échoue, la fiche reste à zéro et la reprise utilise sa clé initiale. Une annulation compense le mouvement et conserve cette fiche ; elle ne supprime pas globalement la création comme le snapshot du prototype local.

Les mises à jour de métadonnées et les réglages manuels de courses sont des écritures partielles sérialisées, avec dernière valeur explicitement envoyée gagnante. Les ajustements/annulations de scans ont les contrôles de versions plus stricts décrits ci-dessus. Transfert de propriété, retrait de membres, suppression de comptes, import/restauration et Storage privé complet ne sont pas des interfaces de cette phase.

## Passage à Supabase Free (phase 2C)

Les instructions historiques de préparation ci-dessous sont complétées par `CLOUD.md`, qui utilise la CLI verrouillée, un dry-run `--skip-vault`, des configurations Cloud ciblées distinctes de Docker et des audits SQL sans mutation. La création/liaison/migration ont désormais été réalisées en 2C après accord ; ne pas rejouer cette procédure comme une nouvelle installation sur la réserve existante. Le modèle email est séparé car Free refuse sa modification sans SMTP personnalisé.

1. Créer ultérieurement un projet Free vide avec la bonne région ; vérifier sa version PostgreSQL et les règles Auth (confirmation email, URLs exactes, limites, éventuel SMTP) avant usage. Prévoir la sauvegarde/restauration décrite dans le plan avant de dépendre du service.
2. Se connecter à la CLI dans son terminal, sans copier de token dans une conversation ; lier uniquement le bon projet avec `npx supabase link --project-ref <ref-du-projet>`.
3. Examiner `npx supabase db push --dry-run` et les migrations. Après validation et sauvegarde, appliquer `npx supabase db push`. Ne pas utiliser de reset distant. Garder `private` hors des schémas API exposés, désactiver l’exposition automatique et vérifier à nouveau grants/RLS sur ce projet.
4. Lors du passage Cloud autorisé, configurer l’URL HTTPS et la clé **publishable** dans l’environnement local ignoré du frontend. Une ancienne clé `anon` est aussi publique ; une clé secrète ou `service_role` ne doit jamais entrer dans `VITE_*`, le bundle ou le dépôt. Les mots de passe DB et identifiants CLI restent réservés aux outils administratifs.
5. Vérifier les politiques, sessions, invitations, callbacks et les deux identités depuis cette instance avant mise en service. Ne pas exécuter les scripts destructifs de fixtures locales sur l’hébergement.

## Références officielles consultées

- [Développement local et CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), [migrations](https://supabase.com/docs/guides/local-development/database-migrations).
- [Sécurité Data API](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [fonctions SQL et permissions](https://supabase.com/docs/guides/database/functions).
- [Supabase Auth](https://supabase.com/docs/guides/auth), [authentification par mot de passe](https://supabase.com/docs/guides/auth/passwords), [tests pgTAP](https://supabase.com/docs/guides/database/testing).
