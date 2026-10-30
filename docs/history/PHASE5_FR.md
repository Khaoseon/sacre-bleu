> French source snapshot retained during Phase 6B2. Historical record, not current setup instructions. See [documentation index](../README.md).

# Phase 5 — consultation privée et sauvegarde utilisateur

État au 30 octobre 2026 : **phase 5 publiée et clôturée après autorisation globale**, PR #3 fusionnée, seule migration `20261030000100_user_restore.sql` appliquée, frontend applicatif `6fc72c965482` contrôlé sur HTTPS. Aucun import sur la réserve réelle. La phase 6 et la V1.1 ne sont pas commencées. Voir [le bilan de livraison](../HANDOFF_5.md).

## Consultation hors ligne

Après une connexion et une lecture réussies, le dernier snapshot cohérent du stock et des courses est conservé dans `localStorage`, sous `app-reserve.private.v1:<clé Auth du projet>:<compte>`. Un marqueur de compte actif interdit à une ancienne instance de réécrire la copie après déconnexion/changement de compte. Une révision inférieure ne remplace pas une copie plus récente provenant d’un autre onglet. Le journal de reprise reste séparé en `sessionStorage` ; il ne devient pas une file d’édition hors ligne.

La PWA doit avoir été chargée et son worker installé au moins une fois. Une relance sans réseau utilise la session locale connue et sa seule copie privée, même si le jeton d’accès a expiré ; cela n’autorise aucune requête ou écriture serveur. Aucun catalogue n’est proposé avant la première synchronisation, après déconnexion ou depuis un autre compte/projet. Le cache est une aide à la consultation, pas un coffre chiffré ni une sauvegarde durable : suppression/éviction du stockage navigateur = perte de la copie. La limite du format (2 Mo, 2 000 lignes de chaque type) s’applique aussi à la validation de la copie ; une copie non conservable est signalée, sans faux succès de stockage.

Le bandeau indique « Hors ligne · consultation uniquement » ou « Copie à actualiser », avec la date locale du dernier succès. Toutes les mutations passent par `store.writable` et sont bloquées sans connexion ou avant une nouvelle lecture réussie. Retour réseau/visibilité/focus, actualisation manuelle et polling visible existants relisent le serveur. Un navigateur qui se croit en ligne pendant une panne affiche une copie à actualiser, sans autoriser de nouvelles mutations après échec. Un refus d’appartenance efface la copie. Une révocation distante ne peut être découverte sans réseau ; la déconnexion locale reste disponible hors ligne.

La déconnexion retire la vue, les intentions de l’onglet et la copie privée, et le SDK propage le changement aux autres onglets. Les réponses tardives d’un store détruit ou d’une initialisation Auth ne doivent pas rétablir les données. Un échec d’effacement est annoncé avec la procédure d’effacement du site. Aucun cache API privé n’est ajouté au service worker ; les caches PWA ne contiennent que les ressources publiques. Thème, tri et démo gardent leurs clés historiques.

Après expiration du jeton pendant une coupure prolongée, la copie connue reste consultable même lorsque les tentatives Auth se terminent. À la reconnexion, le SDK peut conserver son délai de reprise jusqu’à environ une minute ; l’application reste en lecture seule jusqu’à une authentification et une lecture réussies. Aucune RPC anonyme n’est envoyée pendant cette attente, et aucun message d’indisponibilité Auth ne vaut révocation d’appartenance.

## Export JSON utilisateur

Réglages → Compte et réserve → Exporter la réserve JSON. Chaque membre peut exporter le snapshot chargé ; hors ligne, l’interface précise qu’il peut être ancien. Le fichier est téléchargé localement, sans service tiers ni upload automatique.

Le JSON est **confidentiel et non chiffré**. Le conserver dans un dossier/support personnel protégé hors Supabase, jamais dans Git, un répertoire publié ou un partage public. L’application rappelle cette propriété avant export et import. Pour le périmètre administratif chiffré incluant Auth et journaux, conserver [BACKUP.md](../BACKUP.md).

Schéma strict, version 1 :

```json
{
  "format": "sacre-bleu",
  "version": 1,
  "exportedAt": "2026-10-30T10:00:00.000Z",
  "products": [
    {
      "id": "00000000-0000-0000-0000-000000000101",
      "name": "Riz fictif",
      "barcode": "00123456",
      "brand": null,
      "size": 500,
      "unit": "g",
      "category": "Féculents",
      "quantity": 0,
      "minimum": 2,
      "off_barcode": null,
      "off_image_url": null,
      "updatedAt": "2026-10-30T09:00:00.000Z"
    }
  ],
  "shopping": [
    {
      "id": "00000000-0000-0000-0000-000000000102",
      "product_id": "00000000-0000-0000-0000-000000000101",
      "name": "Riz fictif",
      "quantity": 3,
      "checked": false
    }
  ]
}
```

Les champs sont tous requis ; `null` désigne un champ facultatif absent. UUID en minuscules, noms 1–120 caractères, marques 1–80 ou null, codes 4–32 chiffres conservés comme chaînes, quantités/seuils entiers 0–9999. Taille >0 et ≤99999 avec une unité autorisée ; taille et unité nulles ensemble. Dates UTC ISO avec millisecondes. Catégories/unités identiques au modèle. Une quantité nulle de courses exige un cochage. Aucun identifiant dupliqué, code dupliqué, lien orphelin ou second article lié non coché pour un même produit. Les champs inconnus et versions futures sont refusés ; aucune coercition de chaîne en quantité/cochage. Maximum 2 000 produits, 2 000 articles, 2 000 000 octets côté fichier et représentation serveur.

Les références OFF et leur provenance sont conservées, avec les licences/attributions existantes. Les images OFF restent consultables via leur URL en ligne ; elles ne sont ni téléchargées ni embarquées, et leur disponibilité future n’est pas garantie. Aucun Storage/photo privée n’est actuellement disponible dans le produit partagé. Une référence `photo_path` non nulle interrompt l’export et la restauration plutôt que d’annoncer une sauvegarde d’image incomplète. Les photos locales de démonstration et son ancien export brut ne font pas partie de ce format partagé.

Exclusions explicites : comptes, emails, mots de passe/empreintes, tokens, membres/droits, invitations, nom/UUID de réserve, secrets, versions serveur, reçus et historiques de scans. Les UUID produits/articles ne sont que des clés de liaison dans le fichier.

## Restauration guidée

En ligne, propriétaire uniquement, sur une réserve existante accessible et sans demande en attente :

1. Choisir le JSON. Validation locale stricte avant tout appel d’écriture.
2. Examiner l’aperçu : nombre de produits/articles et total d’emballages avant/après ; listes détaillées actuelles et à restaurer, quantités, cochages, liens et métadonnées principales. Toute la réserve produit/courses sera remplacée ; aucune fusion implicite par nom ou code.
3. Télécharger la sauvegarde avant remplacement et vérifier qu’elle est conservée. Cocher la confirmation explicite. Sans ces deux actions, le bouton de restauration reste désactivé.
4. La RPC `restore_reserve` valide de nouveau le fichier et les droits, prend le même verrou de réserve que les anciennes commandes, puis compare la révision de l’aperçu. Si elle a changé, HTTP 409/code 40001 et nouvel aperçu obligatoire.
5. Une seule transaction remplace produits, stocks et courses ; les identifiants sont tous régénérés et les liens sont remappés. Quantités exactes, produits à zéro conservés, aucune commande de scan ni déduction de courses. Comptes, membres, réserve, droits et journaux existants sont conservés. La révision avance une fois, invalidant les anciennes compensations.
6. Le reçu idempotent et les données sont validés ensemble ; l’interface attend aussi un snapshot courant avant d’annoncer le succès. En cas d’échec SQL, tout l’état antérieur revient, sans reçu de réussite. En cas de résultat réseau incertain, utiliser « Reprendre la demande » avec la clé initiale, même après rechargement ; ne pas relancer un nouvel import. Le payload est temporairement privé dans le journal de reprise de l’onglet et dans le journal serveur protégé, jamais dans le worker.

Une nouvelle intention avec le même fichier remplace les données : elle ne cumule ni stocks ni courses, et recrée ses identifiants. Le rejeu de la même clé retourne le reçu initial sans recréer les identifiants. Une ancienne clé avec un autre fichier est refusée. Une restauration est volontairement une opération de remplacement et n’a pas d’annulation de scan ; pour récupérer, préparer un nouvel aperçu depuis le fichier « avant remplacement » conservé. Une demande incertaine doit d’abord être résolue.

## Pause et perte d’un projet Free

Les notifications Supabase et l’export externe restent nécessaires. La [documentation officielle de pause](https://supabase.com/docs/guides/platform/free-project-pausing), consultée le 30 octobre 2026, décrit une pause après faible activité sur sept jours et une fenêtre de reprise d’un an ; suivre l’échéance du Dashboard. Aucune tâche de maintien artificiel et aucun forfait payant ne sont ajoutés.

Pendant l’indisponibilité : consulter la copie privée, exporter si nécessaire en tenant compte de sa date, ne pas recréer une réserve par réflexe. Si le Dashboard propose **Resume project**, réactiver puis attendre le retour d’Auth/API, se reconnecter si nécessaire et actualiser. Ne pas importer un fichier ancien sur un projet revenu intact.

Si le projet est perdu : préparer une cible neuve après accord, appliquer les migrations versionnées, reconfigurer séparément les secrets/Auth/SMTP/origines exactes, établir de nouveaux comptes confirmés et une réserve vide avec invitation du second membre. Se connecter normalement, contrôler les droits, puis importer le JSON via le propriétaire avec aperçu et confirmation. Aucune ancienne session/UUID Auth ne doit être recopiée. La récupération complète de l’ancien Auth suit la procédure administrative distincte, jamais l’import utilisateur.

La récupération du domaine métier sur réserve vierge et les erreurs/interruptions sont testées localement avec des comptes fictifs. Aucune pause/reprise réelle, restauration Cloud ou création de projet de remplacement n’est exécutée pendant cette phase. L’installation et la relance sur les deux téléphones réels restent la recette de phase 6.
