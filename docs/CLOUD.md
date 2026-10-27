# Supabase Cloud — procédure de phase 2C

Procédure de phase 2C au 27 octobre 2026. Le projet `uznbnihmdzxdnlxanjcl` est créé à Paris, lié et migré après accord ; voir `HANDOFF_2C.md` pour l’état effectif et les validations. Les trois migrations 2A et la configuration Docker locale sont conservées.

## 1. Créer le projet (action manuelle)

Dans [Supabase Dashboard](https://supabase.com/dashboard), choisir une organisation au plan **Free**, puis créer un projet vide `app-reserve`. Le plan de l’organisation compte : un petit projet dans une organisation payante n’est pas gratuit. Aucun abonnement, add-on IPv4, domaine ou hébergement n’est commandé par cette procédure.

Choisir la région **précise Paris `eu-west-3`**, sinon Francfort `eu-central-1`, plutôt que le regroupement « Europe » si l’on souhaite une implantation dans l’UE. Générer un mot de passe DB fort et le conserver dans un gestionnaire ; ne pas le coller dans le chat, les scripts, l’historique du terminal ou `VITE_*`. Attendre que le projet soit opérationnel. Relever seulement référence publique, région et version PostgreSQL.

Le [tarif Free](https://supabase.com/pricing) consulté annonce 0 USD/mois, deux projets actifs et 500 Mo de base par projet. La [liste officielle des régions](https://supabase.com/docs/guides/platform/regions) distingue les régions précises des regroupements. Vérifier ces conditions dans le tableau de bord au moment de la création.

## 2. Connexion administrative et contrôles avant migration

La CLI **2.122.0** est déjà verrouillée par `package-lock.json`. Ne pas la mettre à niveau pour cette étape. Dans un terminal interactif personnel à la racine du dépôt :

```powershell
npx --no-install supabase login
npx --no-install supabase link --project-ref REFERENCE_PUBLIQUE_DU_PROJET
```

Terminer la connexion dans le navigateur et fournir, si demandé, le mot de passe uniquement à l’invite masquée de la CLI. Aucun token administratif ne doit être envoyé dans la conversation. Les métadonnées de liaison sont ignorées dans `supabase/.temp/` ; cette liaison ne change pas la cible des commandes explicitement `--local`. Ne pas afficher de sortie `--debug`, de chaîne de connexion ou de JSON brut `status`.

Comparer la référence dans le Dashboard avec `supabase/.temp/project-ref`. L’URL publique sera exactement `https://REFERENCE.supabase.co`. **Arrêter si ce n’est pas le projet Free vide prévu.**

```powershell
npx --no-install supabase db query --linked --file scripts/backend/cloud-preflight.sql
npx --no-install supabase migration list --linked
npx --no-install supabase db push --linked --dry-run --skip-vault
```

`cloud-preflight.sql` contient une seule requête SELECT de métadonnées, compatible avec `db query` et sans écriture. La base locale validée est **PostgreSQL 17.11**, extension **pgcrypto 1.3 dans `extensions`**. Les fonctions utilisées sont `extensions.gen_random_bytes`, `extensions.digest`, `gen_random_uuid`, JSONB, verrous transactionnels et RLS. pgTAP est réservé aux tests locaux et n’est pas une dépendance Cloud. Vérifier PostgreSQL majeur 17 et les extensions sur la cible ; toute différence impose une revue avant application. Si pgcrypto est absente, la migration l’installe dans `extensions` ; si elle est déjà installée ailleurs, arrêter et examiner sans modifier les migrations déjà validées.

Les listes de relations/fonctions applicatives doivent être vides avant le premier déploiement. Sur ce projet neuf, la plateforme a créé `public.rls_auto_enable()` et l’event trigger `ensure_rls` : leur définition a été examinée, elle active la RLS des nouvelles tables publiques et ne remplace pas nos politiques. Ils sont conservés. Tout autre objet existant ou historique distant inattendu impose une revue, jamais un reset ni une réparation d’historique automatique. Le dry-run inventorie les migrations ; il ne prouve pas que tout leur SQL s’exécutera. La CLI installée expose `--skip-vault` : l’utiliser aussi en simulation pour exclure la synchronisation de secrets Vault.

Dans **Data API / API Settings** (libellé susceptible de varier), vérifier séparément :

- Data API activée ; seul **`public`** comme schéma applicatif exposé ; **jamais `private`**. Ne pas confondre `extensions` dans le search path avec un schéma à exposer.
- Exposition automatique des nouvelles tables désactivée si l’option existe.
- Ne pas copier globalement `supabase/config.toml` vers le Cloud : ses ports, Mailpit et limite locale de 100 emails/h sont propres au développement. Ne pas utiliser `config push` sans revue ciblée.

La configuration ciblée et versionnée est dans `config/cloud/supabase/config.toml`. Elle déclare seulement les paramètres API/Auth approuvés, sans SMTP ni limite Mailpit. La CLI 2.122.0 laisse les propriétés non déclarées inchangées. Après revue et accord :

```powershell
npx --no-install supabase config diff --workdir config/cloud --project-ref REFERENCE_PUBLIQUE_DU_PROJET --output-format json
npx --no-install supabase config push --workdir config/cloud --project-ref REFERENCE_PUBLIQUE_DU_PROJET
```

Ne pas lancer la stack Docker depuis ce dossier. Le modèle email est volontairement séparé dans `config/cloud-email` : **Supabase Free refuse les modifications de modèle tant que le fournisseur email intégré est utilisé**. Après configuration manuelle du SMTP et accord pour ce modèle :

```powershell
npx --no-install supabase config diff --workdir config/cloud-email --project-ref REFERENCE_PUBLIQUE_DU_PROJET --output-format json
npx --no-install supabase config push --workdir config/cloud-email --project-ref REFERENCE_PUBLIQUE_DU_PROJET
```

Le modèle doit rester à l’intérieur de ce dossier pour satisfaire le contrôle de chemins de la CLI. Un test vérifie que sa copie est identique au modèle local validé. La comparaison CLI des propriétés ne montre pas toujours le contenu du fichier : le push doit aussi vérifier son envoi effectif.

Une valeur SQL `pgrst.db_schemas = NULL` est **inconclusive** : vérifier le Dashboard et, après déploiement, le refus effectif d’un accès API au profil `private`.

## 3. Écritures initiales : accord explicite requis

Présenter le résultat du précontrôle et du dry-run, la référence exacte et ces migrations :

| Migration                                 | Effet                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `20261026000100_reserve_schema.sql`       | Schémas, pgcrypto, cinq tables métier et trois tables techniques, contraintes, RLS, privilèges et fonctions internes |
| `20261026000200_reserve_membership.sql`   | Création de réserve, invitations ciblées, acceptation, limite de deux membres                                        |
| `20261026000300_reserve_transactions.sql` | RPC de catalogue/stock/courses/scanner, idempotence, compensations et snapshot soumis aux RLS                        |

**Demander l’accord avant l’application sur ce projet précis.** Après accord seulement :

```powershell
npx --no-install supabase db push --linked --skip-vault
npx --no-install supabase migration list --linked
npx --no-install supabase db query --linked --file scripts/backend/cloud-audit.sql
```

Ni `--include-seed`, ni fixtures, ni `db reset --linked`, ni tests d’intégration locaux contre cette cible. Les trois versions doivent apparaître des deux côtés de la liste. Le résultat `violations` doit être `[]` ; revoir aussi contraintes, cinq politiques SELECT/membre, index uniques et `get_reserve_snapshot` en SECURITY INVOKER. Toutes les fonctions privilégiées gardent leur `search_path` vide ; `authenticated` n’a que SELECT sur les tables publiques et EXECUTE sur les cinq RPC et `private.is_member`. Le droit USAGE sur `private` sert aux politiques ; il n’autorise ni lecture de tables techniques ni exposition API.

L’audit ne remplace pas les scénarios API. Aucun changement de migration n’est nécessaire à ce stade. Si un changement devient nécessaire : nouvelle migration versionnée, base **locale** vierge volontaire, pgTAP, concurrence, Auth/API, puis `npm run db:types` ; jamais d’édition manuelle des types générés.

## 4. Frontend : deux environnements explicites

Local inchangé :

```powershell
npm run db:start
npm run env:local
npm run dev -- --strictPort
```

`env:local` écrit `.env.local` avec les paramètres publics de Docker. Le fichier local existant n’est pas remplacé par la configuration Cloud.

Pour le Cloud, copier le modèle puis saisir **localement** l’URL et la clé **publishable** obtenues dans le panneau Connect / API Keys du projet :

```powershell
Copy-Item docs/cloud-env.example .env.cloud.local
# Éditer .env.cloud.local dans son éditeur, sans afficher son contenu dans les journaux.
npm run dev:cloud -- --strictPort
# Ou une preview compilée, toujours sur cet ordinateur :
npm run build:cloud
npm run preview:cloud -- --strictPort
```

`.env.cloud.local` est ignoré par Git. Le mode `cloud` charge ses valeurs avant `.env.local`. Le démarrage/build échoue si les paramètres Cloud manquent, pointent sur Docker ou contiennent une clé JWT/secret/service_role. Les autres modes acceptent seulement un backend local ou la démonstration sans backend. Une URL contenant des identifiants, un chemin API, une requête ou un fragment est refusée. Les variables `VITE_*` entrent dans le bundle : n’y mettre que les deux paramètres publics.

Les builds sont séparés : `dist/` en local, `dist-cloud/` pour Cloud. `preview:cloud` utilise uniquement ce dernier. Aucun build n’est téléversé. Redémarrer Vite après modification d’environnement. La clé de session Auth Cloud est séparée par origine de projet ; les sessions locales 2B gardent leur clé existante. Utiliser aussi des profils navigateur distincts pour éviter de confondre des onglets et les versions du service worker sur une même origine.

## 5. Auth, URLs et emails

Dans **Authentication**, conserver Email/Password, confirmation email obligatoire, comptes anonymes désactivés, minimum 12 caractères et majuscule/minuscule/chiffre, rotation des refresh tokens et confirmations sécurisées des changements d’adresse. Le frontend conserve les sessions ; une connexion par mot de passe ne doit pas nécessiter un nouvel email à chaque ouverture.

Avant les premières inscriptions, régler **URL Configuration** :

| Paramètre               | Valeur actuelle pour les essais sur ordinateur |
| ----------------------- | ---------------------------------------------- |
| Site URL                | `http://127.0.0.1:5173`                        |
| Redirect URL            | `http://127.0.0.1:5173/auth/callback`          |
| Redirect URL            | `http://localhost:5173/auth/callback`          |
| Redirect URL de preview | `http://127.0.0.1:4173/auth/callback`          |
| Redirect URL de preview | `http://localhost:4173/auth/callback`          |

Pas de joker. Le frontend compose `emailRedirectTo` depuis son origine réelle. Après SMTP, appliquer `config/cloud-email` ci-dessus, ou copier **le contenu exact de `supabase/templates/confirmation.html`** dans le modèle « Confirm signup » du Dashboard ; sujet « Confirmez votre adresse — réserve. ». Le lien doit utiliser `{{ .RedirectTo }}#confirm={{ .TokenHash }}`. Le callback consomme le token par `verifyOtp` et retire le fragment. Le modèle Cloud par défaut avec `ConfirmationURL` n’est pas le modèle validé par cette application. Désactiver la réécriture des liens / click tracking chez le SMTP, si proposée.

Un lien `localhost` doit être ouvert sur l’ordinateur qui exécute Vite, éventuellement dans un second profil. Sur un téléphone, il désigne le téléphone. L’URL HTTPS définitive peut attendre la phase d’hébergement : il faudra alors mettre la véritable origine dans Site URL, ajouter **exactement** `https://HOTE_REEL/auth/callback`, servir la route via le fallback SPA et régénérer les invitations. `HOTE_REEL` est un marqueur documentaire, pas une URL à autoriser aujourd’hui. Aucun hébergement n’est créé en 2C.

### Choisir le SMTP avant modification externe

Le [SMTP intégré Supabase](https://supabase.com/docs/guides/auth/auth-smtp) est limité aux adresses de l’équipe de l’organisation, actuellement deux emails/h, sans garantie de livraison. Ne pas ajouter le second utilisateur comme administrateur de l’organisation pour contourner cette limite. Les invitations métier sont des liens partagés manuellement ; elles n’envoient pas d’email, mais chaque compte doit confirmer son inscription.

Options à choisir avec l’utilisateur, **sans inscription, achat ni modification SMTP automatique** :

| Solution                                                 | Coût/prérequis                                                                                                                                                        | Domaine vérifié                                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| SMTP d’une boîte Gmail existante, si le compte le permet | Pas de souscription supplémentaire pour un compte gratuit existant ; validation en deux étapes et mot de passe d’application dédié ; quotas et restrictions du compte | Pas de domaine personnel requis ; From doit être la boîte autorisée. À tester pour les deux destinataires                                 |
| Brevo Free                                               | 300 emails/jour selon l’offre consultée ; compte et expéditeur validés, éventuelle validation du service transactionnel                                               | Domaine personnel avec DNS/DKIM/DMARC recommandé pour un usage durable ; un expéditeur gratuit peut être temporairement réécrit par Brevo |
| Resend Free                                              | Offre gratuite avec limite de 100 emails/jour consultée ; compte et accès DNS ; coût du domaine à prévoir séparément si absent                                        | **Domaine possédé et vérifié requis** pour l’envoi normal                                                                                 |

Pour deux personnes sans domaine, examiner d’abord la disponibilité du SMTP d’une boîte existante ; sinon Brevo avec domaine existant est une option transactionnelle simple. Un nouveau domaine a un coût annuel variable : faire valider son prix d’achat **et de renouvellement** avant toute commande. Ne pas présenter une adresse personnelle réécrite comme une solution de délivrabilité garantie. SMTP2GO n’est pas retenu sans domaine professionnel : son inscription refuse les adresses de fournisseurs gratuits.

Références : [mots de passe d’application Google](https://support.google.com/accounts/answer/185833?hl=fr) (indisponibles avec certaines politiques de compte), [SMTP Gmail](https://support.google.com/a/answer/176600), [Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669), [authentification et réécriture Brevo](https://help.brevo.com/hc/en-us/articles/14925263522578), [tarifs Resend](https://resend.com/pricing), [domaine Resend](https://resend.com/docs/dashboard/domains/introduction), [conditions SMTP2GO](https://support.smtp2go.com/hc/en-gb/articles/12922807451289).

Après choix, renseigner host/port TLS, identifiant, secret SMTP et expéditeur **uniquement dans Supabase Auth / SMTP**. Pour Gmail : `smtp.gmail.com`, 587 STARTTLS ou 465 TLS selon l’option du Dashboard ; identifiant et From = adresse complète, secret = mot de passe d’application (jamais mot de passe principal). Ce secret ne va ni dans le frontend ni dans les docs. Ne pas diminuer la sécurité du compte Google pour rendre l’option disponible. Conserver des limites Supabase et fournisseur modestes ; ne pas reporter le réglage de test local 100/h. Vérifier réception réelle, spam, lien et connexion avant de déclarer les emails validés.

## 6. Recette Cloud sans fixtures destructives

Après accord d’application des migrations et configuration Auth, effectuer ces scénarios avec de vrais comptes autorisés et des profils distincts. Les changements métier de recette demandent une réserve de validation dédiée ou des produits explicitement autorisés ; aucune donnée de démonstration n’est importée. Ne pas supprimer de comptes/réserves en nettoyage automatique.

1. Vérifier dans le réseau du navigateur que les requêtes visent **la référence Cloud attendue**. Tester avant confirmation : absence de session connectée ; après réception et callback réel : connexion et persistance au rechargement.
2. Créer une réserve **vide** comme propriétaire. Vérifier dans un second profil son absence avant invitation.
3. Avec la clé publique sans session, vérifier le refus de SELECT et RPC. Avec le compte extérieur à cette réserve, SELECT doit renvoyer zéro ligne et `get_reserve_snapshot` aucun snapshot ; une RPC de mutation ciblant cette réserve doit être refusée sans effet. Utiliser le deuxième compte avant son invitation ; un troisième compte n’est nécessaire que pour un contrôle extérieur après partage.
4. Envoyer `Accept-Profile: private` vers la Data API : refus du schéma non exposé attendu. Contrôler les huit tables, contraintes, index, grants et fonctions avec `cloud-audit.sql`. Une lecture vide seule ne prouve pas que le schéma est caché.
5. Générer une invitation vers l’adresse exacte du second compte confirmé, partager le lien privé, accepter et vérifier owner/member. Après confirmation d’un nouveau compte, rouvrir le lien initial. Ne pas enregistrer les fragments dans des captures ou journaux.
6. Sur un produit autorisé, vérifier RPC de création et quantités, courses liées, scan +1, total 5 → 3 → annulation et conservation à zéro. Réserver ce parcours à un article prévu à cet effet. Même UUID rejoué = même reçu, sans double effet ; refuser une mutation directe de table. Ne jamais considérer un échec réseau comme un succès.
7. Modifier dans une session, observer l’autre visible sous environ cinq secondes ; revenir au premier plan et actualiser. Deux ajouts concurrents doivent se cumuler. Vérifier conflit d’annulation après mutation de l’autre membre, déconnexion et disparition des données privées.
8. Reporter séparément chaque résultat dans `HANDOFF_2C.md`, avec date, cible et éventuel blocage SMTP. Le succès Mailpit **ne valide pas** la livraison Cloud. Ne pas exécuter `test:db`, `test:db:api`, `test:db:concurrency` ou `test:shared` sur Cloud.

Deux audits SQL complémentaires de recette sont versionnés. Ils simulent le rôle applicatif avec les identités déjà confirmées ; ils ne créent ni JWT ni compte et ne remplacent pas la connexion réelle dans les deux UI :

- `scripts/backend/cloud-outsider-audit.sql` : seulement avant invitation, avec exactement une réserve, son unique owner, deux comptes vérifiés et un produit autorisé. Il attend cinq lectures vides, un snapshot absent et le refus de RPC/écriture directe. Une précondition différente arrête le test sans effet.
- `scripts/backend/cloud-replay-audit.sql` : rejoue une intention stock/scan déjà validée, exige le reçu identique et aucun changement de snapshot ou du nombre de reçus, puis vérifie le refus de la même clé avec d’autres paramètres. À lancer pendant que les deux personnes ne modifient pas la réserve.

Ils s’exécutent avec `npx --no-install supabase db query --linked --file CHEMIN_DU_SCRIPT` sur le projet vérifié. Chaque audit est une seule instruction DO ; tout accès ou effet inattendu provoque une exception annulant sa transaction. Le succès est une exécution sans erreur, sans ligne de données retournée. Ils ne sont pas des fixtures de peuplement, des tâches récurrentes ou des tests destructifs de la réserve.

Avant l’usage quotidien : sauvegarde externe et exercice de restauration de `BACKUP.md`. La caméra, Open Food Facts, Storage/photos et le déploiement PWA restent hors périmètre.
