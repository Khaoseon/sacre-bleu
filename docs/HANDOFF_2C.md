# Transmission — phase 2C en cours de validation

État au **27 octobre 2026**. Lire `AGENTS.md`, `SPEC.md`, `PLAN.md`, `BACKEND.md`, puis `CLOUD.md` et `BACKUP.md`. **Ne pas annoncer la phase close : recette Cloud à deux comptes et restauration complète restent à valider.** Première livraison email et premier compte confirmé validés ci-dessous. Pas de phase 3, caméra réelle, OFF, Storage privé ou hébergement public PWA.

## Git et confidentialité

- Dépôt `Khaoseon/App_reserve` confirmé **privé** via l’API GitHub. État initial propre sur `main`, un commit d’avance.
- Deux commits historiques audités pour chemins sensibles, clés privées, tokens usuels, JWT et URL avec identifiants : aucune détection. `.env.local` ignoré et non suivi. Ce contrôle par motifs ne constitue pas une preuve exhaustive d’absence de tout secret arbitraire.
- `git fetch origin` : aucune divergence ; `4e94639` poussé sans forcer, de `4a5a713` vers `4e94639`. Aucune visibilité modifiée.
- `.env.cloud.local`, les métadonnées de liaison CLI et les builds sont ignorés. Les sauvegardes techniques ne doivent jamais être commitées. Aucune clé Cloud affichée dans les journaux, documents ou sources.

## Projet et opérations réellement effectuées

Projet créé manuellement par l’utilisateur : **app-reserve**, référence publique **`uznbnihmdzxdnlxanjcl`**, région **Paris `eu-west-3`**, Free. La CLI connectée confirme `ACTIVE_HEALTHY`, version plateforme PostgreSQL **17.11.0.003** ; SQL retourne **17.11**, pgcrypto **1.3 dans `extensions`**.

Connexion CLI réalisée par l’utilisateur, liaison effectuée au projet exact. Aucun mot de passe DB ou token demandé dans la conversation. La CLI officielle est conservée à **2.122.0**.

Précontrôle : aucune relation métier ; seul objet public initial identifié, `rls_auto_enable()` et son event trigger `ensure_rls`, fournis par la plateforme et examinés. Pas de conflit identifié ; aucun changement de cette fonction. `private` absent des schémas exposés. Dry-run officiel `db push --linked --dry-run --skip-vault` : exactement les trois migrations existantes, aucun seed ni rôle additionnel.

Après **accord explicite** pour migrations et configuration ciblée, application réussie des versions :

- `20261026000100` : schéma, contraintes, RLS et helpers.
- `20261026000200` : réserve et invitations.
- `20261026000300` : mutations transactionnelles/idempotentes et snapshot.

Historique distant relu : trois versions identiques aux locales. Aucune migration SQL modifiée. Aucun reset distant, fixture, import de démo, compte ou donnée métier créé par le déploiement.

Configuration ciblée appliquée via **`config/cloud/supabase/config.toml`**, sans recopier la configuration Docker/Mailpit :

- API exposée sur `public` uniquement, exposition automatique désactivée.
- Email/password, confirmation obligatoire maintenue, comptes anonymes désactivés et rotation refresh tokens conservée.
- Mot de passe minimum 12 caractères, majuscule/minuscule/chiffre ; changement de mot de passe sécurisé.
- Site URL `http://127.0.0.1:5173` ; quatre callbacks exacts `/auth/callback` sur `127.0.0.1` et `localhost`, ports 5173 et 4173, sans joker.
- Relecture `config diff` sur ce dossier : **aucune différence de propriété déclarée**, aucune propriété non gérée signalée. Les paramètres non déclarés restent inchangés.

Le push initial incluant le modèle email a été **refusé par Supabase Free**, qui interdit sa modification avec le fournisseur email intégré. La restriction API avait déjà été appliquée ; Auth a ensuite été appliquée séparément avec succès. Ce refus vient de Supabase, pas d’une revue automatique d’autorisation. Le modèle est séparé dans **`config/cloud-email`**. Après confirmation par l’utilisateur de la configuration SMTP Gmail, **son contenu et son sujet ont été appliqués avec succès**, sans modification des autres réglages. La CLI exige que son fichier HTML reste à l’intérieur du dossier de configuration ; un test contrôle l’égalité de sa copie avec le modèle local.

## Frontend et démarrage

`.env.local` et `npm run env:local` gardent Docker comme cible, sans modification de la configuration locale 2B. `.env.cloud.local` a été créé avec uniquement l’URL publique et la clé **publishable** récupérée en mémoire par la CLI ; aucune valeur de clé affichée.

```powershell
# Docker local habituel :
npm run db:start
npm run env:local
npm run dev -- --strictPort
# Cloud depuis cet ordinateur, après configuration Auth/SMTP complète :
npm run dev:cloud -- --strictPort
# Version compilée Cloud, consultée uniquement localement :
npm run build:cloud
npm run preview:cloud -- --strictPort
```

Origine frontend actuelle `http://127.0.0.1:5173`, preview `http://127.0.0.1:4173`. Une seconde session peut utiliser un autre profil ou `localhost` sur le même ordinateur. Sur téléphone, les liens loopback ne rejoignent pas cet ordinateur ; l’URL HTTPS définitive et le fallback `/auth/callback` attendent l’étape d’hébergement PWA. Aucune publication n’est réalisée.

Modes et builds séparés (`dist/` / `dist-cloud/`) ; les modes habituels refusent un backend distant, le mode `cloud` refuse une configuration locale, incomplète ou une clé autre que publishable. Validation partagée entre Vite et le client ; absence de fallback silencieux sur Docker. Sessions Auth persistantes par origine de projet Cloud, clé locale 2B conservée. Démo, règles métier, composants, polling/RPC et styles conservés.

## Validations exécutées

Frontend : **81 tests applicatifs réussis** (77 existants et 4 contrôles de configuration/copie du modèle), typecheck et builds local/Cloud réussis. Avertissement Vite existant sur la taille du bundle : environ 514 Ko minifiés, 149 Ko gzip, sans erreur de compilation. Aucun changement visuel. Le formatage et l’audit Git final doivent inclure les nouveaux fichiers ; les métadonnées CLI générées sous tous les dossiers `supabase/.temp` sont exclues du formatage et de Git.

### Backend local

Suite 2B d’abord relancée sur la stack existante : 80 assertions SQL, 6 tests de concurrence, 1 parcours Auth/API, 1 parcours partagé avec vrais emails Mailpit, linter sans erreur.

Après déploiement des migrations inchangées, une **stack jetable distincte** `app_reserve_2c_validation` a été créée sous `.tmp/validation-2c`, ports **56320–56324**, sans liaison Cloud. Reset explicitement **local**, sans seed, puis :

- **80 assertions pgTAP**, **6 tests de concurrence**, **1 parcours Auth/API** : réussis.
- **1 parcours partagé Mailpit** (deux comptes et confirmation depuis client neuf) : réussi.
- **Linter** : aucune erreur.
- **Types régénérés** par le script `db:types` depuis les migrations réellement appliquées : identiques au fichier versionné. Le fichier n’a pas été modifié manuellement.

La base locale 2B n’a pas été remise à zéro. La stack de validation est retirée après vérification ; les ports 5542x initialement envisagés étaient réservés par Windows, sans modification système. La CLI a affiché les identifiants locaux de développement au démarrage de cette seule stack jetable ; aucun identifiant Cloud concerné.

### Cloud : contrôles sans données

- Projet/région/version réels confirmés via CLI ; précontrôle et dry-run avant accord.
- Historique de migration concordant.
- Audit SQL : **8 tables avec RLS**, **14 fonctions applicatives**, **47 contraintes**, **5 politiques** de lecture ; `violations = []`. Fonction snapshot en SECURITY INVOKER, fonctions privilégiées applicatives à `search_path` vide, droits directs refusés aux rôles non autorisés.
- Data API avec clé publishable et aucune session : les **cinq SELECT refusés HTTP 401 / `42501`**, RPC `create_reserve` refusée de même, PATCH direct sans ligne cible refusé. Aucun effet métier.
- Profil API `private` refusé **HTTP 406 / `PGRST106`**.
- Auth settings public : Email activé et `mailer_autoconfirm = false`.
- Compteurs après ces contrôles : **0 compte Auth et 0 ligne dans les huit tables applicatives**. Aucun faux succès métier annoncé.
- Build Cloud réussi avec sa véritable configuration publique ; cela ne valide pas une session ni un email.

### À valider avant clôture

Les tests locaux ne constituent pas une validation Cloud de : invitation entre deux comptes, RLS d’un tiers connecté, mutations métier/replays, concurrence et polling entre sessions. La première livraison, confirmation, connexion persistante et création réelle de réserve vide sont validées ci-dessous ; ne pas en déduire la recette complète à deux comptes.

## SMTP, sauvegarde et prochaine action

L’utilisateur a choisi **une boîte Gmail existante si compatible**. Les prérequis et alternatives ont été présentés : validation en deux étapes/mot de passe d’application, aucune souscription supplémentaire pour une boîte gratuite existante ; Brevo Free et Resend avec prérequis de domaine distingués. Aucune inscription fournisseur, achat de domaine ou dépense lancé.

L’utilisateur a confirmé **« SMTP configuré »** après la saisie personnelle des paramètres Gmail dans le Dashboard : serveur `smtp.gmail.com`, port 465 TLS, adresse expéditeur/identifiant et secret d’application non transmis dans la conversation. Le modèle autorisé a ensuite été appliqué par :

```powershell
npx --no-install supabase config push --workdir config/cloud-email --project-ref uznbnihmdzxdnlxanjcl
```

**Première livraison réelle validée** : l’utilisateur a confirmé « email reçu et compte confirmé » après inscription depuis la preview Cloud et ouverture du lien sur cet ordinateur. Les compteurs SQL à ce moment confirmaient **1 compte Auth, 1 adresse vérifiée, 0 réserve et 0 membre**. Aucun compte n’a été confirmé administrativement ou par fixture.

L’utilisateur s’est ensuite connecté personnellement dans l’onglet intégré, sans transmettre de mot de passe. L’UI connectée a été observée, puis **« Ma réserve » créée par le parcours normal et sa RPC** : écran Stock « Synchronisé », zéro produit, zéro emballage et zéro course. Les compteurs SQL confirment **une réserve, un membre owner conforme à `owner_id`, zéro produit/stock/course**. Rechargement de l’onglet : session conservée et même stock vide synchronisé retrouvé. Aucune démo importée.

La preview a été relancée sur `127.0.0.1:4173` hors du bac à sable après un diagnostic d’inaccessibilité ; HTTP 200 et bundle Cloud vérifiés. Le port 5173 occupé n’a pas été arrêté. Un ancien onglet `127.0.0.1:4173` affichait le prototype en cache : aucune donnée locale n’a été effacée. L’onglet sur **`http://localhost:4173/`** affiche l’écran Auth actuel. Utiliser cette origine pour la session propriétaire.

La session propriétaire est sur **`http://localhost:4173/`**. L’ancienne page en cache de **`http://127.0.0.1:4173/`** a été quittée puis rouverte, laissant s’activer la mise à jour normale du service worker : l’écran Auth actuel s’y affiche, avec stockage d’origine distinct, sans effacement des données locales.

Action manuelle demandée : inscrire/confirmer/connecter le second utilisateur sur `127.0.0.1:4173`, sans créer de réserve ni accepter d’invitation ; conserver le propriétaire connecté sur `localhost:4173`. Il est aussi demandé un **produit réel autorisé (nom/code-barres/quantité)** pour exercer les mutations en rétablissant sa quantité initiale, sans donnée de démonstration. Poursuivre ensuite extérieur avant invitation, deux membres/RPC/polling, exclusivement avec ces comptes et données autorisés. Ne pas récupérer de mot de passe ou session personnelle dans une conversation.

`BACKUP.md` documente export technique ciblé `public,private,auth` sans sessions, copie chiffrée externe, restauration transactionnelle sur cible neuve, intégrité/UUID Auth, reprise de pause et limites. **Aucune sauvegarde Cloud ni restauration complète exécutée à ce stade** ; exercice obligatoire avant usage quotidien. Aucun maintien artificiel d’activité ajouté. L’export/import utilisateur de phase 5 n’est pas livré sous couvert de cette procédure technique.

Ne pas poursuivre caméra/OFF/photos/déploiement avant validation du périmètre suivant. Le dépôt doit rester strictement privé.
