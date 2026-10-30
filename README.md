# Sacré bleu · App_reserve

PWA React/TypeScript, en français, pour partager une réserve alimentaire entre deux comptes. Supabase Cloud privé et les deux comptes de phase 2C sont conservés. **Phase 3 : scanner caméra EAN-13/EAN-8/UPC-A implémenté**, avec saisie manuelle de secours, filtre des doublons et même parcours RPC stock/courses. Recette principale réelle validée sur iPhone Safari et Samsung Chrome : caméra, anti-doublon, ajustements/annulation et synchronisation des deux comptes. Cas complémentaires non réalisés documentés dans `docs/VALIDATION.md`. Serveur et certificats temporaires nettoyés. Le frontend HTTPS est désormais publié en phase 4B ; aucun tunnel nécessaire. Choix technique : [docs/SCANNER.md](docs/SCANNER.md) ; recette privée HTTPS : [docs/TESTS_TELEPHONES.md](docs/TESTS_TELEPHONES.md) ; transmission : [docs/HANDOFF_3.md](docs/HANDOFF_3.md).

**Phase 4B clôturée le 29 octobre 2026.** Hébergement permanent, recette Samsung confirmée par l’utilisateur ; iPhone non testé, limite acceptée. Rapport complet et transmission : [docs/HANDOFF_4B.md](docs/HANDOFF_4B.md). La phase 5 n’est pas commencée.

## Démarrer localement

**Stabilisation V1 livrée et clôturée le 30 octobre 2026 après autorisation globale.** [PR #1](https://github.com/Khaoseon/App_reserve/pull/1) fusionnée après CI verte sur `455c047`, frontend publié `62f7f92bcb01`, deux migrations autorisées appliquées et Edge v3 actif. Données métier/Auth et protections conservées, inscriptions toujours fermées (`disable_signup=true`). [Bilan complet](docs/HANDOFF_V1_STABILISATION.md), [procédure de livraison](docs/LIVRAISON_CORRECTIFS_V1.md), [audit historique](docs/REVUE_CORRECTIVE_4B.md).

**Conflits et scans :** la sixième migration conserve le refus périmé et son code JSON 40001, avec SQLSTATE PGRST/HTTP 409 sans relance PostgREST. SDK publié/actuel et régressions techniques validés ; protections de scans concurrents et délais OFF livrés. L'utilisateur accepte une publication sans nouvelle recette physique préalable : le bug exact de substitution Samsung/iPhone reste non reproduit, sa résolution physique n'est pas certifiée. Phase 5 et V1.1 non commencées.

La phase 4 Open Food Facts est active sur le backend existant. En **phase 4B**, le frontend **Sacré bleu** est publié après accord sur [sacre-bleu.pages.dev](https://sacre-bleu.pages.dev), avec logo, icônes téléphone et en-têtes statiques vérifiés. Production automatique conservée et previews désactivées ; URL Auth et origine OFF configurées après accord. La connexion et les derniers contrôles Samsung sont confirmés par l’utilisateur. Les essais iPhone 4B restent non réalisés et acceptés comme limite de livraison. Réglages, validations et limites : [docs/CLOUDFLARE_PAGES.md](docs/CLOUDFLARE_PAGES.md).

Prérequis : Node.js 24+, npm, Docker Desktop avec moteur Linux démarré pour le backend local.

```powershell
cd App_reserve
npm ci
npm run db:start
npm run env:local
npm run dev -- --strictPort
```

Ouvrir [l’application](http://127.0.0.1:5173/) et [Mailpit](http://127.0.0.1:55324/). Vite écoute seulement sur la boucle locale. API : `127.0.0.1:55321` ; PostgreSQL : port `55322`. Ne pas exposer la stack de développement au réseau public.

`env:local` génère le fichier ignoré `.env.local` avec seulement `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`, sans afficher les clés. Une ancienne clé publique `anon` est acceptée ; une clé secrète ou `service_role` est refusée par le frontend.

## Utiliser Supabase Cloud depuis cet ordinateur

La configuration publique Cloud est séparée dans `.env.cloud.local` (ignoré par Git). Le modèle est `docs/cloud-env.example` ; ne jamais y mettre un secret. Démarrer avec `npm run dev:cloud -- --strictPort`. Pour compiler puis consulter sur cet ordinateur : `npm run build:cloud`, puis `npm run preview:cloud -- --strictPort`. Les fichiers Cloud vont dans `dist-cloud/`, séparément du build local `dist/` ; aucun déploiement n’est effectué.

Les modes habituels restent réservés à Docker ou à la démo sans backend ; joindre le Cloud exige le mode `cloud`, une URL HTTPS de projet Supabase et une clé publishable. Les sessions Auth sont séparées par projet Cloud et gardent la clé historique en local. Procédure, Auth et choix SMTP : [docs/CLOUD.md](docs/CLOUD.md). Sauvegarde externe et reprise : [docs/BACKUP.md](docs/BACKUP.md). État précis de mise en service : [docs/HANDOFF_2C.md](docs/HANDOFF_2C.md).

`db:start` applique les migrations d’une nouvelle installation sans injecter de démonstration. **`npm run db:reset` efface la base locale** : le réserver à une remise à zéro volontaire. `npm run db:stop` conserve les volumes.

Pour la version compilée : `npm run build`, puis `npm run preview -- --strictPort`, et ouvrir [la preview](http://127.0.0.1:4173/). Les callbacks Auth autorisent 5173 et 4173, sur `127.0.0.1` et `localhost`. Conserver ces ports exacts pour les confirmations email. Le service worker met en cache les fichiers de l’application en preview/production, **pas les snapshots privés**.

## Deux comptes, une réserve

1. Sur `http://127.0.0.1:5173/`, créer un premier compte avec une adresse fictive `…@example.test` et un mot de passe de 12 caractères minimum, avec majuscule, minuscule et chiffre.
2. Ouvrir son message dans Mailpit puis « Confirmer mon adresse email ». Le callback `/auth/callback` traite la confirmation et retire son fragment de l’URL. Créer une réserve vide.
3. Roue crantée → Compte et réserve → email du destinataire → générer et copier le lien valable 24 h. Un nouveau lien remplace les précédents.
4. Utiliser un autre profil de navigateur, ou `http://localhost:5173/` pour une session distincte. Dans ce dernier cas, remplacer seulement `127.0.0.1` par `localhost` dans le lien copié ; conserver son fragment complet.
5. Ouvrir l’invitation, se connecter ou créer le second compte avec **l’adresse invitée**. Après confirmation email dans Mailpit, **rouvrir le lien d’invitation initial**, puis accepter. Un membre déjà présent peut rouvrir sa réserve sans consommer à nouveau l’invitation.
6. Modifier stock et courses depuis les deux sessions. Le snapshot est relu après chaque mutation ; l’autre session s’actualise sous environ cinq secondes lorsqu’elle est visible, ainsi qu’au retour au premier plan et à la reconnexion.

Mailpit capture les emails localement, sans envoi réel. Les paramètres affichent les deux membres et leurs rôles. Le secret d’invitation reste dans le fragment, est consommé en mémoire puis immédiatement retiré de l’URL, sans sauvegarde durable.

## Fonctionnement partagé

- **Stock** : catalogue réel, ajout/modification/suppression, recherche insensible aux accents, catégories, tri local mémorisé, seuils facultatifs et épuisés conservés. Les boutons +/− modifient uniquement le stock. Le stock d’une fiche existante se règle avec ces boutons pour éviter d’écraser une quantité plus récente pendant l’édition des métadonnées.
- **Scanner caméra** : activation explicite en contexte sécurisé, caméra arrière, flux continu ; reconnaissance stable avec clé EAN/UPC, verrou d’un code encore présenté, réarmement après retrait ou répétition explicite. Ajouter/Retirer, premier mouvement automatique, compteur ajustable et annulation. Ajouter traite ensemble stock et courses liées ; réduire le total restitue exactement la déduction correspondante. Retirer respecte le stock initial. Une modification ultérieure invalide ajustement et annulation avec un message explicite. Détection suspendue pendant un inconnu ou une demande réseau ; pistes arrêtées en quittant ou en arrière-plan, reprise explicite. Saisie manuelle repliable toujours disponible (avec son délai historique de 1,2 seconde et « Scanner à nouveau »).
- **Inconnu** : création d’une fiche à zéro puis mouvement identifié en Ajouter. Une interruption conserve la fiche et la reprise du mouvement ; Annuler conserve la fiche à zéro. En Retirer, création à la quantité saisie sans retrait automatique.
- **À acheter** : articles libres ou liés, quantités, cochage, suppression, effacement des cochés et suggestions explicites. Aucun rapprochement des articles libres par leur nom.
- **Sessions** : persistance Supabase Auth, erreurs françaises, déconnexion retirant les vues privées et demandes en attente de l’onglet. Le catalogue privé reste en mémoire.
- **Réseau** : indicateur d’indisponibilité, dernière lecture réussie, écritures bloquées, actualisation manuelle. Une demande incertaine conserve UUID et paramètres dans `sessionStorage`, par compte/réserve. « Reprendre la demande » réutilise cette clé, même après rechargement. Aucune nouvelle écriture entre-temps ; aucun succès avant reçu serveur et snapshot courant.
- **Apparence** : roue crantée, Automatique, Sauge claire/sombre, Ardoise, Rétro crème/pétrole à fonds unis, préférence mémorisée et contrôles natifs adaptés. Choix caméra manuel persistant sur chaque appareil dans les préférences du Scanner ; en-tête redondant supprimé.

Quantités entières entre 0 et 9 999. Métadonnées et quantités de courses : modifications partielles, dernière valeur explicitement envoyée gagnante. Stock : deltas transactionnels ; les ajustements de scan contrôlent aussi leurs versions.

## Démonstration isolée

Depuis l’écran de connexion, « Essayer la démonstration sur cet appareil » ouvre les huit exemples et la sauvegarde `app-reserve.local.v1`. Paramètres : export JSON brut, réinitialisation confirmée et sortie de la démo. Les exemples de codes n’apparaissent qu’en démo. Aucune donnée de démonstration n’est injectée dans Supabase ; aucune erreur réseau ne bascule sur ce stockage. Une sauvegarde illisible reste exportable, sans remplacement silencieux.

Les photos locales JPEG/PNG/WebP de 500 Ko maximum restent disponibles en démo. En partagé, ajout de photos désactivé en attendant Storage privé ; les références `photo_path` sont préservées sans présenter une photo locale comme synchronisée. Aucun bucket public n’existe.

## Architecture

- `src/Root.tsx` : source active, session, confirmation, création de réserve et partage.
- `src/App.tsx`, `components.tsx` : écrans existants et formulaires ; `AppearanceSettings.tsx` : réglage commun du thème.
- `src/CameraScanner.tsx`, `scanner/camera.ts`, `scanner/decoder.ts` : interface caméra, propriété/nettoyage des pistes, lecteur ZXing différé ; validation et filtre purs dans `model.ts`.
- `src/backend/client.ts`, `auth.ts`, `adapter.ts`, `errors.ts` : SDK officiel typé, Auth, lectures/RPC et erreurs françaises.
- `src/backend/store.ts`, `usePantry.ts` : snapshot confirmé en mémoire, journal de reprise, scan et polling avec nettoyage des écouteurs.
- `src/backend/contracts.ts`, `database.generated.ts` : port métier et types générés depuis PostgreSQL ; régénérer ces derniers plutôt que les éditer manuellement.
- `src/model.ts`, `storage.ts`, `demo.ts` : règles pures et démo ; recherche/tri/suggestions réutilisés sur la projection partagée.
- `src/theme.css`, `theme.ts`, `public/theme-init.js` : couleurs centralisées et initialisation avant rendu.
- `supabase/migrations/` : trois migrations 2A conservées, RLS et RPC transactionnelles/idempotentes ; `supabase/templates/confirmation.html` : confirmation locale.

Thème (`app-reserve.theme.v1`) et tri partagé (`app-reserve.sort.v1`) sont locaux. Session Auth séparée (`app-reserve.auth.v1` en local, suffixée par origine de projet en Cloud). Le journal `app-reserve.pending.v1:*` n’est ni un cache de catalogue ni une file d’édition hors ligne ; aucun secret d’invitation n’y figure.

## Vérifications

```powershell
npm test
npm run typecheck
npm run build
npm run format:check
npm run test:phone
# Supabase local démarré :
npm run test:shared
npm run test:db
npm run test:db:concurrency
npm run test:db:api
npm run db:lint
```

`test:shared` automatise deux comptes avec SDK, emails Mailpit, confirmation depuis un client neuf, invitation, mouvements concurrents, scans et reprise après réponse perdue. Les fixtures refusent les services distants et nettoient uniquement leurs propres comptes/réserves. Le test historique `test:db:api` confirme ses comptes par SQL ; le test partagé valide la livraison réelle. Après modification de migration uniquement : base locale volontairement vierge, tests backend puis `npm run db:types`.

Résultats dans [docs/VALIDATION.md](docs/VALIDATION.md). Transmission : [docs/HANDOFF_2B.md](docs/HANDOFF_2B.md).

## Limites et suite

Frontend HTTPS publié, installation physique PWA encore à valider. Pas de Storage privé complet. Open Food Facts est actif en phase 4 selon le complément ci-dessous ; sa recette physique sur téléphones reste à effectuer. Les limites complémentaires de caméra, autofocus, vitesse, lampe et cycle Safari/PWA restent documentées. Pas de cache privé persistant après fermeture, d’écritures hors ligne, d’interface d’export/restauration partagé ou de gestion avancée des membres. La restauration technique a été répétée et une archive chiffrée créée en 2C ; sa copie sur un second support reste à la charge de l’utilisateur. Après fermeture complète de l’onglet ou déconnexion, le journal de reprise disparaît : consulter le stock confirmé avant une nouvelle intention. Le contexte ajustable du dernier scan est perdu au rechargement ; aucun mouvement n’est rejoué automatiquement.

Polling adapté à deux membres et une petite réserve ; Realtime désactivé. Effacer plusieurs cochés applique des commandes individuelles reprises séparément, sans transaction globale du lot. Les essais OFF et l’installation PWA sur Android/Safari iOS restent à valider ; la recette principale du scanner de phase 3 est déjà acquise. Une largeur mobile émulée ne valide pas l’installation PWA.

Le projet Cloud de phase 2C a été créé et migré après accord ; les validations effectives et les blocages restants sont distingués dans `HANDOFF_2C.md`. Aucun secret serveur dans `VITE_*`. Voir [docs/BACKEND.md](docs/BACKEND.md) et [docs/PLAN.md](docs/PLAN.md). Ne pas commencer la phase suivante sans validation de son périmètre.

## Phase 4 — Identification des nouveaux produits

Open Food Facts v3.6 est implémenté via une Edge Function authentifiée, avec priorité au catalogue personnel et formulaire manuel préservé. **Déployé sur Supabase Free Paris après sauvegarde et autorisation ; trois recherches réelles validées depuis l’ordinateur sans création de fiche.** Références externes séparées des photos privées, cache/limiteur partagé, attribution et mêmes opérations de stock. Architecture, licences et configuration active : [docs/OPEN_FOOD_FACTS.md](docs/OPEN_FOOD_FACTS.md). Tests exécutés et recette téléphone restante : [docs/HANDOFF_4.md](docs/HANDOFF_4.md). Les phases 5/6 restent hors périmètre.

**Phase 4 clôturée le 29 octobre 2026.** Prochaine conversation : **phase 4B — hébergement HTTPS sur Cloudflare Pages Free**, non commencée. Paramètres de build, dépendances Auth/OFF et contrôles avant publication : [docs/HANDOFF_4B_PREPARATION.md](docs/HANDOFF_4B_PREPARATION.md). Aucun hébergement ni configuration Cloudflare créés lors de cette clôture.
