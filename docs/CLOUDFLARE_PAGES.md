# Phase 4B — audit et configuration proposée

Audit du **29 octobre 2026**, depuis `0346516`. **Préparation locale uniquement : aucune publication, liaison Cloudflare/GitHub ou modification Supabase réalisée.** Les réglages et la connexion GitHub limitée ont été approuvés ; la connexion effective reste à constater et la première publication attend un accord distinct. Phase 5 hors périmètre.

Évolution après l'audit initial : connexion effectuée par l'utilisateur jusqu'à la sélection du bon dépôt et au formulaire de création ; projet Pages non publié. Les sections suivantes distinguent ce qui a été constaté ensuite des contrôles initiaux.

## Autorisation reçue après l'audit

L'utilisateur valide Pages Free, Node 24.22.1, le build et les variables publiques proposés, les previews et publications automatiques désactivées. Il autorise la connexion de Cloudflare à GitHub avec **Only select repositories**, exclusivement pour `Khaoseon/App_reserve`, et la préparation du projet. L'interface de connexion sera publique ; la démo n'utilisera que des données fictives, les données de réserve restant protégées par Auth/RLS.

**La première publication n'est pas autorisée.** Arrêter avant toute action de création qui la déclencherait, notamment **Save and Deploy**, puis présenter les paramètres effectifs et l'origine HTTPS proposée avant de demander cet accord. Supabase Auth et les origines OFF restent inchangés ; aucun service payant ni mouvement de stock autorisé. La connexion GitHub n'est pas encore confirmée comme réalisée.

L'utilisateur choisit ensuite **le parcours le plus simple**, avec maintien des protections, après présentation de l'étape intermédiaire du Dashboard. Le parcours retenu est donc l'interface Cloudflare, sans jeton API supplémentaire : variables communes initialement, puis désactivation immédiate des automatismes et retrait des variables Supabase de Preview après la première publication approuvée. Aucun push pendant cette étape.

Il choisit aussi le nom public **Sacré bleu**. L'interface, le titre HTML, le nom Apple et les deux noms du manifeste PWA sont adaptés localement. Le nom technique proposé pour Pages devient **`sacre-bleu`**, pour l'adresse souhaitée **`https://sacre-bleu.pages.dev`**, à confirmer dans le formulaire puis lors de la création ; aucun nom ni domaine réservé. Dépôt GitHub, projet Supabase, clés de stockage/session et identité technique du client OFF restent existants. Aucun changement distant ni de stock. Ces changements locaux doivent être poussés avant le build publié.

Après renommage : les 246 tests, TypeScript, builds local/Cloud, formatage et `git diff --check` passent. Contrôle des sorties `dist` et `dist-cloud` : `name` et `short_name` valent `Sacré bleu`, titre navigateur et nom Apple conformes, `start_url` et `scope` conservés. Aucun nouveau test métier requis pour ce changement de présentation ; aucune installation physique revendiquée. Avertissement de taille du bundle déjà connu conservé.

L'utilisateur confirme ensuite que le formulaire accepte `sacre-bleu` et que la clé publique est renseignée. L'adresse proposée devient donc `https://sacre-bleu.pages.dev`, sans prétendre qu'elle soit déjà réservée ou publiée. Il fournit le logo du sac bleu pour l'installation téléphone et les en-têtes de l'app : source conservée hors `public/`, icônes PWA/Apple/favicon et logo en place, ancienne icône SVG retirée. Dérivation documentée dans `assets/branding/README.md`. Aucune publication autorisée par ces confirmations.

### Recette locale du logo et des en-têtes avant publication

- Contrôle Chrome du **build Cloud compilé**, servi sur boucle locale avec les en-têtes de `public/_headers` reproduits : connexion à 320/390/1280 px, démo à 320/390/1024/1280 px, aucun débordement ni chevauchement des éléments de marque/actions détecté. Logo et nom visibles aussi dans la barre mobile après entrée en démo ; nom de la réserve conservé sur la seconde ligne. Thème sombre inspecté. Captures `screenshots/sacre-bleu-connexion-mobile.png`, `screenshots/sacre-bleu-demo-mobile.png`, `screenshots/sacre-bleu-demo-sombre.png`, uniquement données fictives.
- Nom et trois icônes du manifeste conformes ; icône maskable : pixels illustrés dans un rayon maximal de 192,3 px, inférieur à la zone sûre de 204,8 px pour une image de 512 px. Master/source hors des fichiers publiés ; icônes dérivées précachées.
- Service worker prêt, décodeur différé importé sans violation CSP. Caméra non bloquée par la politique (`prompt`), sans activation physique. Route `/auth/callback` servie en SPA, fragment d'invitation volontairement invalide retiré et erreur française attendue ; aucune confirmation email réelle revendiquée.
- Aucune erreur JavaScript ni violation CSP constatée sur ces parcours ; **zéro requête externe**, aucune session Cloud, aucun accès ou mouvement de stock. Les en-têtes effectivement servis par Cloudflare, les images OFF réelles, Auth et l'installation sur téléphones restent à vérifier après les accords distants nécessaires.
- Une première tentative du navigateur dans le sandbox a été refusée par l'isolation réseau locale ; même contrôle réussi ensuite avec autorisation d'exécution hors sandbox et blocage de toutes les requêtes externes. Serveur temporaire et navigateur fermés après chaque essai.

Validation finale de la préparation : **246 tests**, TypeScript, builds local et Cloud, formatage et `git diff --check` réussis. Build Cloud final : 16 fichiers dont les règles `_headers`, 1 353 285 octets ; pas de source map, source du logo/master, archive ou `.env` dans la sortie. Aucun motif de secret ni valeur réelle de clé publishable détecté dans les fichiers préparés pour Git. Le message de commit utilise le préfixe `[CF-Pages-Skip]` afin que sa poussée ne déclenche pas de build automatique. Aucune publication Pages ou modification Supabase dans cette livraison de préparation.

### Formulaire constaté sur les captures utilisateur

Le formulaire Pages affiche le dépôt `Khaoseon/App_reserve`, la branche `main`, le nom `app-reserve` et le domaine proposé `app-reserve.pages.dev`. Cela confirme la sélection du dépôt dans Cloudflare, mais la capture ne prouve pas le périmètre complet de l'installation GitHub ni la réservation du nom. Le seul bouton de validation affiché est **Save and Deploy** : ne pas l'utiliser sans accord de première publication.

La section des variables précise explicitement qu'elles s'appliquent initialement à **Production et Preview**, avec séparation possible ultérieurement. Elle ne permet donc pas de satisfaire le réglage approuvé « variables Supabase en Production seulement » dès ce formulaire. L'instruction précédente de retirer les deux lignes et de passer par l'API était trop stricte : cette séparation est une précaution contre l'usage accidentel du backend réel par une version de test, pas une exigence de confidentialité de la clé publishable. Aucun besoin de supprimer/recréer des lignes pendant l'explication du choix. Un build Cloud sans ces variables échouerait ; ne pas provoquer volontairement cet échec pour débloquer l'interface.

Les deux valeurs Supabase sont destinées au frontend public. Leur présence dans la configuration Preview ne crée pas, à elle seule, un déploiement de preview et ne copie ni stock ni session utilisateur. Une preview effectivement publiée avec ces valeurs utiliserait cependant le **même backend réel** : un membre qui s'y connecte pourrait y lire et modifier la vraie réserve via les RPC autorisées. Les callbacks Auth non autorisés ne bloquent pas à eux seuls une connexion par mot de passe ; CORS OFF limite la recherche OFF du navigateur, pas l'ensemble de la Data API. Auth/RLS et privilèges restent la protection des données. Références : [clés Supabase](https://supabase.com/docs/guides/getting-started/api-keys), [previews Pages](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

**Parcours simple retenu après explication** : continuer avec le Dashboard, garder temporairement les deux variables publiques dans les deux configurations initiales, puis, immédiatement après la première publication explicitement approuvée, désactiver les publications automatiques de production, mettre Preview sur None et retirer ses deux variables Supabase. Aucun push/PR/rebuild supplémentaire entre création et contrôle de ces réglages. L'utilisateur choisit ce parcours ; la publication reste soumise à un accord distinct. La configuration finale reste celle validée. Aucun nouveau jeton administratif nécessaire pour cette voie.

La [création de projet par API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/create/) expose séparément `deployment_configs.production.env_vars` et `deployment_configs.preview.env_vars`, ainsi que `source.config.production_deployments_enabled=false` et `source.config.preview_deployment_setting="none"`. C'est une alternative si la séparation dès la création est impérative ; son comportement de création devra être vérifié avant toute mutation. Elle ajoute un script et un jeton administratif à gérer, sans renforcer les RLS ou modifier le résultat final attendu. Un droit Pages en écriture au niveau du compte n'est pas une restriction au seul dépôt GitHub. Aucun appel API Cloudflare ni jeton créé. Tout accès API administratif supplémentaire devra être présenté à l'utilisateur avant sa création ; ne jamais demander de coller un jeton dans la conversation.

## État constaté

- Consignes et transmissions lues : `AGENTS.md`, `HANDOFF_4B_PREPARATION.md`, `HANDOFF_4.md`, `SPEC.md`, `PLAN.md`, ainsi que la documentation backend, Cloud et OFF.
- Dépôt initialement propre sur `main` ; HEAD et référence locale `origin/main` identiques (`0346516`). Le connecteur GitHub confirme `Khaoseon/App_reserve` **privé**, non archivé, branche par défaut `main`. La vérification directe du SHA distant par Git a échoué à cause de la résolution DNS du sandbox ; ne pas présenter la référence locale comme une nouvelle vérification réseau.
- Avant le commit de préparation : `git fetch origin` réussi avec accès réseau autorisé ; `main` et `origin/main` restent tous deux à `0346516`. La synchronisation distante est alors effectivement revérifiée.
- Node local `24.20.0`, npm `11.19.0`. Dépendances directes à versions exactes et lockfile présent. Aucun ajout de dépendance nécessaire. L'installation propre `npm ci` sera exécutée par Cloudflare ; elle n'a pas été rejouée pendant cet audit.
- `build:cloud` impose URL Supabase HTTPS et clé publishable ; paramètres absents, URL locale, ancienne clé JWT et clé secrète sont refusés. La configuration locale ignorée vise le projet attendu `uznbnihmdzxdnlxanjcl` ; seules les deux variables Vite nécessaires sont présentes. Aucune valeur de clé consignée ici.
- Contrôle ciblé des 128 fichiers versionnés : aucun chemin `.env`, archive de sauvegarde, build ou certificat interdit ; aucun motif de clé privée/token administratif détecté. Ce contrôle de motifs ne constitue pas un audit exhaustif de l'historique Git.
- Auth confirmé, RLS, RPC et contrôles OFF relus dans les sources ; état distant hérité de la recette de phase 4, **pas de nouvel audit SQL distant effectué**. Aucune migration ni modification de règles métier nécessaire pour l'hébergement.
- Le frontend propose une inscription ; créer un compte n'accorde pas l'accès à la réserve existante. L'appartenance reste vérifiée côté serveur. Ne pas modifier les inscriptions, comptes ou SMTP dans cette préparation.

## Réglages recommandés à approuver

| Champ                                   | Valeur proposée                                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Produit / forfait                       | **Cloudflare Pages, Free**, site statique                                                                 |
| Mode                                    | Intégration GitHub au dépôt privé existant                                                                |
| Application GitHub                      | Cloudflare Workers & Pages ; **Only select repositories → Khaoseon/App_reserve uniquement**               |
| Branche de production                   | `main`                                                                                                    |
| Nom de projet souhaité                  | `sacre-bleu`, sous réserve de disponibilité                                                               |
| Adresse canonique souhaitée             | `https://sacre-bleu.pages.dev`, **ni réservée ni vérifiée disponible**                                    |
| Preset                                  | `None` ; configuration Vite explicite                                                                     |
| Répertoire racine                       | Racine du dépôt ; champ vide si l'interface utilise cette convention                                      |
| Image de build                          | v3                                                                                                        |
| `NODE_VERSION`                          | `24.22.1`, version 24 documentée dans la mise à jour Cloudflare du 23 octobre 2026                        |
| `SKIP_DEPENDENCY_INSTALL`               | `1`, pour imposer l'installation par le lockfile                                                          |
| Commande de build                       | `npm ci && npm run build:cloud`                                                                           |
| Répertoire de sortie                    | **`dist-cloud`**                                                                                          |
| Variables Vite, Production seulement    | `VITE_SUPABASE_URL=https://uznbnihmdzxdnlxanjcl.supabase.co` et `VITE_SUPABASE_PUBLISHABLE_KEY` existante |
| Previews de branches                    | **None** ; aucune variable Supabase réelle dans Preview                                                   |
| Publications automatiques de production | Désactivées pendant la recette ; maintien manuel recommandé tant qu'aucune automatisation n'est approuvée |
| Options supplémentaires                 | Aucun domaine acheté, Worker/Pages Function, D1, KV, R2, analytics ou autre service ajouté                |

Le champ `engines` du `package.json` n'est pas utilisé par l'image v3 pour sélectionner Node : le réglage `NODE_VERSION` est nécessaire. Le build actuel est validé avec Node local 24.20.0 ; le premier build distant devra confirmer Node 24.22.1 et l'installation `npm ci`.

Les variables `VITE_*` sont publiques dans le JavaScript. Ne fournir aucun mot de passe, secret/service-role, token Supabase administratif ou token GitHub au build. Seul `dist-cloud` est publié ; les sources TypeScript, migrations, docs et fichiers ignorés ne sont pas des fichiers du site. Le JavaScript compilé reste consultable publiquement.

### Accès au site : décision nécessaire

Proposition pour limiter les changements : interface publique (connexion et démo), données de réserve privées par Supabase Auth/RLS et appartenance. La démo conserve son stockage local séparé. Cela ne rend pas le site entier privé et ne masque pas le code JavaScript compilé ou la clé publique.

Si l'utilisateur souhaite également masquer l'écran de connexion et le frontend, préparer d'abord une protection Cloudflare Access et son périmètre exact. La simple option Pages « Enable access policy » protège les previews, **pas** l'adresse canonique de production. Aucune protection Access de production n'est supposée active.

Ni la confidentialité du dépôt, ni `noindex`, ni CORS ne remplacent l'autorisation serveur. Les callbacks Auth autorisés ne constituent pas une liste d'origines autorisées pour toute la Data API. Désactiver les previews et omettre leurs variables évite leur branchement automatique au backend réel ; cela n'est pas une frontière de sécurité. Les URLs de versions déjà publiées doivent également être prises en compte lors de la recette et d'un éventuel choix Access.

## Conditions Free vérifiées dans la documentation officielle

Consultation le 29 octobre 2026 : offre Pages gratuite, HTTPS inclus et requêtes/bande passante statiques annoncées illimitées ; **500 builds/mois**, un build simultané par compte, délai maximal de 20 minutes, **20 000 fichiers** et **25 MiB par fichier**. Les Functions relèvent des quotas Workers et ne sont pas nécessaires ici. Le compte et son forfait réel restent à vérifier dans le Dashboard avant création.

L'ordinateur pourra être éteint après publication. En revanche, **Supabase Free peut mettre en pause un projet à faible activité sur sept jours** : une adresse permanente n'est pas une garantie de disponibilité continue de la réserve. Conserver la procédure de reprise et les sauvegardes existantes ; aucun abonnement ni maintien artificiel d'activité proposé.

Sources : [offre Pages](https://www.cloudflare.com/products/pages/), [limites](https://developers.cloudflare.com/pages/platform/limits/), [image et variables de build](https://developers.cloudflare.com/pages/configuration/build-image/), [mise à jour Node du 23 octobre](https://developers.cloudflare.com/changelog/product/pages/), [pause Supabase Free](https://supabase.com/docs/guides/platform/free-project-pausing).

## Séquence des accords et manipulations

1. Faire valider les réglages ci-dessus et le caractère public ou restreint du frontend. Demander **l'accord de connexion GitHub limitée au seul dépôt** : elle donne à Cloudflare accès au code privé et constitue un élargissement d'accès.
2. Après cet accord, guider l'utilisateur dans le compte Cloudflare Free : Workers & Pages → Create application → Pages → Connect to Git. Dans GitHub, choisir le compte propriétaire et **Only select repositories**, sélectionner seulement `App_reserve`, examiner les permissions effectives avant Install & Authorize. Aucun token à copier dans la conversation.
3. Sélectionner le dépôt et préparer les champs de build. Relever le nom disponible et l'origine exacte, contrôler Free et les environnements. **Ne pas cliquer Save and Deploy** : cette action lance la première publication. Si les contrôles de branches ne sont disponibles qu'après création, ne rien pousser entre la création approuvée et leur désactivation.
4. Les en-têtes statiques sont préparés dans `public/_headers` : anti-indexation, refus d'intégration en iframe, absence de Referer, `nosniff`, caméra limitée à la même origine, microphone/géolocalisation désactivés. La CSP permet les scripts/worker de même origine, les styles inline nécessaires au cadre caméra, les images OFF validées et les connexions au seul projet Supabase attendu. Elle ne cache aucune API privée. Leur application réelle par Pages reste à vérifier après publication.
5. Présenter les réglages finaux et le commit exact, puis demander **l'accord de première publication**. Le nom ci-dessus est provisoire : aucun accord ne doit supposer son attribution acquise.
6. Après accord, publier, vérifier le journal de build et HTTPS. Désactiver production automatique/previews, contrôler l'absence de variables de production en Preview. Une future poussée GitHub ne devra pas devenir une publication non approuvée par effet de bord.
7. Présenter puis faire approuver séparément les changements Supabase exacts décrits ci-dessous. Les appliquer uniquement après cet accord, sans pousser en bloc une configuration historique qui pourrait écraser d'autres réglages.
8. Effectuer la recette sans mutation de stock, documenter les résultats réels et limites, puis tests requis, commit et push privés. Ne déclarer la livraison achevée qu'après vérification du site servi et des validations effectivement obtenues.

Sources : [intégration Git](https://developers.cloudflare.com/pages/get-started/git-integration/), [périmètre GitHub](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/), [contrôles de branches](https://developers.cloudflare.com/pages/configuration/branch-build-controls/), [en-têtes](https://developers.cloudflare.com/pages/configuration/headers/), [limites Access des previews](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

## Changement Supabase à préparer après confirmation de l'origine

Pour une origine canonique confirmée `ORIGINE` (marqueur documentaire, pas une valeur à enregistrer) :

- Auth **Site URL** : `ORIGINE`.
- Auth **Redirect URLs** : ajouter seulement `ORIGINE/auth/callback` ; conserver, par défaut, les quatre callbacks locaux déjà autorisés.
- Secret Edge **OFF_ALLOWED_ORIGINS** : conserver exactement les quatre origines locales existantes et ajouter seulement `ORIGINE`.
- Aucune origine de preview, aucun joker, aucun changement de JWT, SMTP, comptes, schéma ou données.

Si le nom souhaité est disponible, le changement proposé sera donc Site URL `https://sacre-bleu.pages.dev`, callback `https://sacre-bleu.pages.dev/auth/callback`, et liste OFF `http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,https://sacre-bleu.pages.dev`. **Rien de cela n'a été appliqué ni autorisé comme modification distante.** Lire les valeurs distantes juste avant modification et signaler toute divergence avec l'état historique.

Conserver le modèle email `{{ .RedirectTo }}#confirm={{ .TokenHash }}`, les fragments d'invitation `#invite=…` et leur retrait immédiat. Pages sert la SPA pour `/auth/callback` en l'absence de `404.html` à la racine ; ne pas ajouter une redirection HTTP vers `/` qui perdrait le contexte. Une connexion sera nécessaire sur la nouvelle origine ; les comptes existants restent les mêmes. Pas de transfert manuel de tokens entre navigateurs.

Sources : [callbacks Supabase](https://supabase.com/docs/guides/auth/redirect-urls), [fallback SPA Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/).

## Vérifications réalisées et recette restante

Réalisé localement le 29 octobre, sur le code existant : **246 tests / 16 fichiers**, `npm run typecheck`, `npm run build`, `npm run build:cloud` et `npm run format:check` réussis. Aucun test SQL rejoué : aucune migration modifiée. Aucun stock distant consulté ou modifié durant cet audit.

Sortie Cloud inspectée : **14 fichiers, 1 095 919 octets**, plus gros fichier 535 073 octets, aucune source map, archive, `.env` ou donnée de réserve embarquée identifiée ; bonne référence Supabase présente, aucun motif de clé secrète détecté. Le manifeste et les icônes 192/512/maskable, l'icône Apple et le service worker sont générés. Le cache du worker couvre les ressources statiques et le décodeur différé de même origine ; aucune route de cache Auth/Data API/OFF. Avertissement Vite > 500 Ko déjà connu conservé (principal ~535 Ko, décodeur ~478 Ko) ; pas de refonte pour cet hébergement.

Après publication et modifications d'origines approuvées :

- Vérifier HTTPS, HTML et `/auth/callback`, scripts/CSS, types MIME, manifeste/icônes, worker, décodeur différé et en-têtes réellement servis. Les tests Vite ne prouvent pas l'application des règles `_headers` par Pages.
- En session anonyme : écran de connexion, aucune réserve personnelle, refus de lectures/RPC et accès au schéma privé. Un refus RPC doit être construit de façon à ne pouvoir appliquer aucun mouvement. Ne pas créer un troisième compte ou envoyer un email de test sans périmètre autorisé.
- Connexion par l'utilisateur sur ses comptes existants, lecture et rechargement, nouvelle ouverture, déconnexion puis absence de données privées. Ne pas enregistrer emails, sessions ou captures de stock dans Git. Les callbacks réels de confirmation restent à distinguer du seul chargement HTTP de la route.
- OFF : preflight de l'origine canonique autorisé, origine étrangère refusée, appel non authentifié refusé. Recherches authentifiées uniquement avec des codes publics **confirmés absents du catalogue** ; fermer les formulaires sans enregistrer. Les appels OFF actualisent le budget technique mais pas les stocks/courses. Aucun scan connu ni bouton de mouvement dans la réserve réelle.
- iPhone/Safari et Samsung/Chrome, puis ouverture depuis l'écran d'accueil : caméra après geste explicite, code inconnu, préremplissage/attribution/photo ou secours, fermeture/reprise, arrière-plan/reprise, clavier et absence de débordement. Réutiliser `TESTS_OFF_TELEPHONES.md` et les cas complémentaires de `TESTS_TELEPHONES.md`. Relever modèle, versions et résultat, sans données personnelles.
- Vérifier installation et relance PWA sur les deux téléphones avec ordinateur éteint et réseau mobile. L'installation finale reste **non certifiée** jusqu'aux essais physiques. Le cache privé hors ligne et la gestion des mises à jour relèvent de la phase 5 et ne sont pas ajoutés ici. Si une ancienne version reste active, fermer toutes les fenêtres de l'app et rouvrir avant d'envisager un effacement des données de site.

État actuel : dépôt sélectionné et formulaire de création rempli par l'utilisateur, préparation locale du nom/logo/en-têtes validée. Aucun site publié ni recette physique déclarés validés. La publication et les changements Supabase restent soumis à des accords distincts.
