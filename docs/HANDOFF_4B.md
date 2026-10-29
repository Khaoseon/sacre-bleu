# Clôture et transmission — phase 4B

**Phase 4B clôturée le 29 octobre 2026 à la demande de l'utilisateur**, après sa confirmation globale que les derniers contrôles fonctionnent. Dernière version applicative validée : `43c8897428e4`. Le commit de clôture ne modifie que la documentation ; sa référence sera celle du commit Git, sans auto-référence dans ce document.

## Résultat livré

**Sacré bleu est accessible sur https://sacre-bleu.pages.dev sans ordinateur allumé.** Hébergement Cloudflare Pages Free, backend Supabase Free Paris existant. Internet reste nécessaire pour relire la réserve privée. Aucun service payant ajouté. Phase 5 non commencée, hors extension de gestion des mises à jour explicitement demandée et approuvée pendant 4B.

## Configuration finale

| Élément                       | Valeur                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Dépôt                         | GitHub privé `Khaoseon/App_reserve`, accès Cloudflare limité à ce dépôt                |
| Projet Pages                  | `sacre-bleu`, forfait Free confirmé par l'utilisateur                                  |
| Production                    | `main`, publication automatique après build réussi, choisie par l'utilisateur          |
| Prévisualisations de branches | Désactivées ; variables Supabase retirées de Preview, confirmé par l'utilisateur       |
| Build                         | `npm ci && npm run build:cloud`, racine du dépôt, preset None, image v3                |
| Sortie                        | `dist-cloud` uniquement                                                                |
| Runtime configuré             | `NODE_VERSION=24.22.1`, `SKIP_DEPENDENCY_INSTALL=1`                                    |
| Variables publiques           | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` ; aucune clé privilégiée          |
| Auth                          | Site URL canonique et `/auth/callback`, quatre callbacks locaux conservés              |
| OFF                           | Origine canonique exacte et quatre origines locales, aucun joker ni origine de preview |

Le contrôle GitHub Cloudflare confirme les publications réussies ; il ne contient pas le journal détaillé des versions Node/npm. **Node 24.22.1 est le réglage confirmé à l'écran ; l'exécution de cette version précise n'a pas été vérifiée dans le journal distant.** Les builds locaux ont utilisé Node 24.20.0. Cette limite d'observation est conservée, sans présenter le journal comme lu. Les URL uniques de chaque déploiement de production peuvent exister même avec les previews de branches désactivées ; l'origine backend autorisée reste la seule adresse canonique.

## Modifications et autorisations réalisées

- Audit de la configuration et du build Cloud ; vérification documentaire de Pages Free et des conditions de publication. Connexion GitHub limitée au dépôt privé, première publication et élargissement ciblé des origines effectués après leurs accords respectifs.
- Nom public **Sacré bleu**, logo fourni, icônes Android 192/512/maskable, Apple et navigateur ; nom/logo dans l'interface. Identifiants techniques de stockage, de session et du backend conservés.
- En-têtes HTTPS : CSP ciblée, caméra limitée à la même origine, microphone/géolocalisation désactivés, anti-iframe, anti-indexation, absence de Referer et `nosniff`. Retour SPA `/auth/callback` et nettoyage des fragments conservés.
- Auth Site URL et Redirect URLs modifiées par l'utilisateur et comparées à la configuration minimale locale. L'agent ajoute seulement l'origine Pages à `OFF_ALLOWED_ORIGINS`, après accord, en conservant les quatre origines locales. Fonction OFF active, JWT conservé ; aucun changement de RLS, RPC, migrations, SMTP ou comptes.
- Plein écran Android et marges de sécurité. Actualisation WebAPK guidée sur Samsung, sans effacer de données ; plein écran confirmé par l'utilisateur.
- Version exacte dans les réglages : version du paquet, référence du commit, compilation et diagnostic du mode d'affichage. Ancien numéro fixe du pied de page retiré.
- Balayages depuis les bords entre Stock, Scanner et À acheter, sans boucle, avec préservation des contrôles, défilements, modales et opérations ; arrêt de la caméra lors de la sortie. Champs du formulaire produit alignés malgré les aides facultatives.
- Gestion approuvée des mises à jour : recherche au lancement, au retour et périodiquement lorsque visible, avis Actualiser/Plus tard et vérification dans les réglages. Activation volontaire, blocage des saisies/opérations incertaines et des autres fenêtres ; quitter Scanner avant activation. Aucun effacement du stockage Auth/démo ni cache privé hors ligne ajouté.

## Validations et limites

- **Automatiques :** 246 tests / 16 fichiers, TypeScript strict, builds local/Cloud, formatage. Recette Chrome tactile et formulaire ; deux vrais builds locaux A → B pour tester report, refus, erreurs réseau, seconde fenêtre, activation et conservation des stockages. CSP, worker, décodeur, icônes et routes vérifiés. Avertissement Vite historique de bundle principal supérieur à 500 Ko conservé.
- **Sur le vrai hébergement :** HTTPS, ressources, en-têtes, callback SPA, référence réellement servie et contrôle manuel des mises à jour. Contrôles sans session : catalogue/RPC de lecture refusés, schéma privé non exposé, CORS étrangers/previews et JWT invalides refusés. Tests anonymes de l'agent, aucune connexion au compte de l'utilisateur.
- **Samsung :** connexion/consultation, icône/relance, plein écran et nouvelle version confirmés successivement. Après la liste finale (réseau mobile avec PC éteint, scanner/OFF sans enregistrement, balayages, formulaire, vérification des mises à jour), l'utilisateur confirme que tout fonctionne. Validation déclarative, sans mesures ni détail de chaque geste ; modèle et versions Android/Chrome non relevés. Aucun mouvement de stock exécuté par l'agent.
- **iPhone :** essai 4B non réalisé, absence d'appareil signalée ; compatibilité supposée et limite de livraison acceptée explicitement par l'utilisateur. Les anciens essais caméra de phase 3 restent acquis à leur date, sans valider l'installation, OFF ou les mises à jour iOS de 4B.
- **Mise à jour accompagnée :** version du gestionnaire reçue et contrôle manuel confirmés sur Samsung ; bascule entre deux versions validée dans Chrome local. Une nouvelle bascule après le commit documentaire de clôture pourra être observée en usage normal ; elle n'est pas revendiquée comme déjà testée sur téléphone.

Le dépôt ne contient ni secrets, ni fichiers `.env`, ni captures de réserve personnelle. Les recettes d'écriture restent locales ; aucune migration ou fixture exécutée sur l'hébergement pendant 4B. Confirmation globale de l'utilisateur distincte d'une mesure technique indépendante.

## Exploitation et suite

Chaque push sur `main` publie : lancer les contrôles requis avant poussée. Conserver le dépôt privé, Pages Free, les previews désactivées et les origines backend exactes. Ne pas ajouter de clé secrète à une variable `VITE_*`. Consulter `CLOUDFLARE_PAGES.md` pour l'historique, `TESTS_PAGES_TELEPHONES.md` pour les procédures et `VALIDATION.md` pour les preuves détaillées.

Une app déjà ouverte propose la nouvelle version lorsqu'elle la détecte ; Plus tard diffère l'activation. Les anciennes installations sans gestionnaire doivent d'abord charger sa première version. Les changements de nom/icône/plein écran Android gardent le cycle WebAPK propre à Chrome. Supabase Free peut être mis en pause pour faible activité : conserver les procédures de reprise/sauvegarde existantes, sans maintien artificiel d'activité.

**Prochaine étape possible, uniquement sur nouvelle demande : phase 5**, consultation privée hors ligne, export/import et restauration. Ne pas la démarrer à partir de cette transmission. Aucun outil temporaire ou serveur local n'est nécessaire au site publié.
