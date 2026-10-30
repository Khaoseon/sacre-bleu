> Historical French record. Dates, commands and approval states below belong to their original phase; do not use them as current setup instructions. See the [English documentation index](README.md), [current installation guide](INSTALL.md) and [translation inventory](README.md#organization-and-translation-inventory).

# Revue corrective après 4B — préparation du 29 octobre 2026

**Suite livrée le 30 octobre 2026 après autorisation globale :** correctifs frontend/CI fusionnés via PR #1 et publiés, deux migrations V1 appliquées, Edge v3 actif. Inscriptions fermées et données conservées. [Clôture V1](HANDOFF_V1_STABILISATION.md). Le présent audit conserve ses constats et autorisations historiques ; ses mentions « en attente/non publié » ne constituent plus l'état courant. Aucun gel SQL global de création de réserves ajouté.

**Code/CI préparés localement sur `codex/revue-corrective-4b`.** Après cet audit initial, l'utilisateur autorise uniquement `auth.enable_signup=false` : réglage appliqué et `disable_signup=true` confirmé. Comptes, réserve, appartenances, identités de sessions et empreintes métier/migrations préservés, autres paramètres Auth inchangés. Le contrôle public immédiat a échoué puis la lecture diagnostique a confirmé l'état attendu ; cause de propagation probable, non prouvée. L'utilisateur confirme ensuite l'accès des deux comptes sur Samsung/iPhone. La préparation ultérieure autorise les commits locaux seulement ; [procédure V1](LIVRAISON_CORRECTIFS_V1.md). Aucun push, changement Cloudflare, CI ou SQL distant. Phase 5 non commencée.

Les autres propositions ci-dessous restent en attente. Une investigation supplémentaire prépare une migration de budget OFF, sans l'appliquer : [SCANS_SIMULTANES_OFF.md](SCANS_SIMULTANES_OFF.md).

**État courant V1 :** après résolution locale du blocage SDK via la sixième migration PGRST/HTTP 409/code JSON 40001, l'utilisateur autorise commit correctif, push de la seule branche corrective et PR brouillon si tous les tests techniques sont verts. Le présent audit conserve son historique ; fusion, modifications Supabase Cloud et publication restent interdites sans nouvel accord. La nouvelle recette physique préalable est dispensée explicitement, sans preuve nouvelle de résolution du bug iPhone.

## Constat distant initial en lecture seule, avant fermeture

- `/auth/v1/settings` : `disable_signup=false`, seul fournisseur actif : email. Les inscriptions publiques sont donc ouvertes. Aucun compte de test créé, aucun email envoyé.
- Comparaison CLI : configuration globale `auth.enable_signup=true`, connexion anonyme désactivée, hook `before_user_created` désactivé. Zéro différence déclarée avec ces trois valeurs d'audit. La confirmation email est activée dans le référentiel Cloud, sans dérive déclarée ; elle prouve le contrôle de l'adresse, pas une autorisation personnelle.
- Comptages agrégés : **2 utilisateurs, 2 confirmés, 0 anonymes ; 1 réserve, 2 appartenances, 2 membres distincts ; 0 utilisateur sans appartenance**. Aucun surplus numérique par rapport à l'attendu ; ce comptage ne prouve pas à lui seul l'identité historique de chaque compte. Aucune identité, adresse, clé ou donnée de stock affichée/versionnée.
- Définition distante de `create_reserve` conforme au dépôt. Les corps de `private.require_user` et `private.begin_request` correspondent au référentiel : compte confirmé non anonyme, idempotence, mais aucune liste personnelle autorisée. Tout compte confirmé peut créer d'autres réserves. La limite de deux membres est **par réserve**, sans plafond global de comptes/réserves ni unicité de réserve par propriétaire.
- RLS et privilèges préservent la confidentialité des réserves existantes. Ils ne ferment pas l'inscription et ne constituent pas un plafond global de consommation. Les origines CORS et les URL Auth ne sont pas une liste de personnes autorisées.
- GitHub : **0 workflow**, `main.protected=false`. Dernier commit de clôture : seul contrôle Cloudflare Pages, réussi. Le build Pages configuré ne lance que TypeScript/Vite ; navigation et mises à jour PWA ont été testées localement pendant 4B, pas automatiquement avant chaque publication.

## Plan Auth simple proposé — accord requis

1. Désactiver **Allow new users to sign up** au niveau global, soit `[auth] enable_signup=false`. Ne pas désactiver le fournisseur email, changer le secret JWT, supprimer des utilisateurs ou révoquer les sessions.
2. Configuration minimale préparée dans `config/private-access/supabase/config.toml`. Comparaison distante du brouillon : **une seule différence déclarée**, `auth.enable_signup`, de true vers false ; les autres propriétés ne sont pas déclarées. `config/cloud` est aligné localement à cette proposition pour éviter une réouverture par une future application de sa configuration ; ce fichier n'est pas appliqué non plus.
3. Interface Cloud préparée : retrait de Créer un compte et de la création de nouvelles réserves ; connexion, reprise d'une ancienne création incertaine, invitations existantes et démo conservées. Le local conserve les parcours nécessaires aux tests. **Masquer un bouton ne protège pas l'API.** La fermeture Auth a depuis été autorisée/appliquée ; ces changements d'interface attendent toujours leur publication.
4. Après accord : comparer de nouveau, appliquer uniquement le réglage global au projet exact, relire `/settings` (attendu `disable_signup=true`) et comparer les comptes/réserves et URL/JWT. Faire confirmer connexion/reprise des sessions sur les deux appareils. Ne pas créer de compte ni envoyer de signup pour tester le refus sans autorisation spécifique.

Ce changement conserve les comptes existants et ne demande pas de déconnexion. Il ne promet pas des sessions sans expiration ; les règles Auth habituelles continuent de s'appliquer. Le mot de passe oublié, la confirmation et les callbacks existants ne sont pas réécrits.

**Limite volontaire de la solution minimale :** la RPC `create_reserve` reste exécutable par les deux comptes existants, même si sa création est masquée dans l'interface Cloud. Après fermeture des inscriptions, aucun tiers nouveau ne peut obtenir de compte par auto-inscription. Si l'on souhaite également figer le projet à une seule réserve au niveau SQL, envisager séparément la révocation de son droit EXECUTE pour authenticated, avec migration/tests locaux et accord Cloud distinct. Aucune modification SQL de restriction des réserves n'est préparée ni appliquée dans ce lot sécurité. La migration du budget OFF préparée ultérieurement est distincte, uniquement testée localement et décrite dans SCANS_SIMULTANES_OFF.md.

## Remplacer ultérieurement un compte

- Même personne, nouvelle adresse : privilégier le changement d'email du compte existant avec confirmations, en conservant l'UUID et les appartenances. Intervention accompagnée et autorisée à ce moment-là ; ne pas réaffecter silencieusement une identité.
- Autre personne : garder les inscriptions fermées. Créer/inviter administrativement le remplaçant dans Supabase, sans clé privilégiée dans l'app. Cette exception administrative n'ouvre pas l'auto-inscription publique. Confirmer le nouveau compte avant de préparer le remplacement d'appartenance.
- La réserve accepte deux membres : préparer une transaction ciblée remplaçant l'appartenance retirée par celle du nouveau compte, avec transfert cohérent du propriétaire si nécessaire. Avant exécution : sauvegarde, revue des contraintes, essais locaux et accord séparé. Conserver la réserve et les quantités ; ne jamais supprimer la réserve pour libérer une place. Vérifier le nouvel accès et l'absence d'accès de l'ancien membre via RLS, puis révoquer ses sessions. La révocation Auth seule ne garantit pas l'invalidation immédiate d'un JWT déjà émis ; le retrait de l'appartenance ferme l'accès à cette réserve.
- Aucune suppression de compte automatique : garder l'ancien compte tant qu'une décision explicite n'en autorise pas la suppression. Le comptage attendu changera alors volontairement et devra être documenté.

## Publications automatiques conservées

Workflow proposé : branche `develop` si utile, puis branches `codex/...` → pull request vers `main` → contrôle **Application et PWA** réussi et revue → fusion → publication Pages automatique. Ne pas pousser directement sur main. Une branche develop distante n'est pas créée ici ; une simple branche de travail par changement suffit aussi.

Le fichier `.github/workflows/verify.yml` est seulement préparé localement : un job Linux standard, Node 24.22.1, npm ci, tests, types, format, builds, Chrome et les deux recettes `test:ui:browser` / `test:pwa:browser`. Actions officielles épinglées par SHA, permissions lecture seule, concurrence annulable, timeout 15 min, aucun secret ou backend réel : paramètres Cloud de compilation fictifs. Une seule dépendance de développement ajoutée et verrouillée, Playwright 1.62.1, pour supprimer la dépendance implicite au runtime de l'ordinateur de l'agent.

Actions sur dépôt privé consomme le quota inclus du compte. Le forfait et le blocage des dépenses supplémentaires ne sont pas accessibles par la lecture effectuée ; **vérifier le budget bloquant sans dépassement avant activation**, aucun achat/runner payant autorisé. Si aucune minute incluse n'est utilisable, conserver les mêmes commandes localement plutôt que souscrire une offre.

Les protections obligatoires sur dépôt privé dépendent du forfait GitHub. Ne pas les promettre sur Free privé et ne pas rendre le dépôt public pour les obtenir. Activer une vérification obligatoire après son premier passage si le forfait existant le permet, avec accord ; sinon la fusion après contrôle reste une discipline explicite, contournable par un détenteur des droits de push.

Une commande `npm run verify:cloud` est préparée : tests unitaires → types → format → build Cloud. Changement Pages proposé, **non appliqué** : `npm ci && npm run verify:cloud`, sortie toujours `dist-cloud`. Cela bloquerait la publication sur échec de ces contrôles, même après un push direct. Les tests navigateur sont prévus avant fusion en CI ; **ils ne sont pas dans ce garde-fou Pages**. Un simple workflow sur push main ne bloquerait pas Pages, qui se lance indépendamment : ne pas confondre les deux.

## Nettoyage et périmètre

La démo ne reçoit pas de fournisseur OFF : le texte annonce maintenant que la recherche y est désactivée et disponible dans la réserve connectée. Il ne promet plus une phase future déjà livrée. Les photos personnelles partagées et le hors ligne privé restent réellement à venir ; leur texte est conservé. Pas de refonte des thèmes, formulaires, gestes, caméra ou gestionnaire PWA.

## Sources et validations

Sources primaires consultées le 29 octobre 2026 : [configuration Auth Supabase](https://supabase.com/docs/guides/auth/general-configuration), [hook avant création](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook), [Supabase Auth, création administrative](https://supabase.github.io/auth/), [protections GitHub et forfaits](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [facturation Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [build Pages](https://developers.cloudflare.com/pages/configuration/build-configuration/).

Les validations de cette préparation et les limites physiques sont consignées dans `VALIDATION.md`. L'accès des deux comptes depuis iPhone/Samsung est désormais confirmé par l'utilisateur ; cela ne certifie pas les correctifs non publiés. Aucune phase 5 commencée. Les commits locaux sont désormais autorisés ; push, PR, commande Pages, activation de CI et toute autre modification Cloud attendent un nouvel accord ; la seule fermeture Auth est déjà réalisée. Le budget Actions bloquant et Pro inclus ont depuis été vérifiés en lecture seule, détails dans LIVRAISON_CORRECTIFS_V1.md.
