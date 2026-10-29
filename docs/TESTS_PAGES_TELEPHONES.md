# Sacré bleu — essais HTTPS et installation téléphone

**Préparés, retours partiels obtenus.** Adresse canonique : **https://sacre-bleu.pages.dev**. Cloudflare Pages Free, interface publique et réserve privée par Supabase Auth/RLS. Deux comptes existants ; aucune nouvelle inscription, invitation ou donnée de test nécessaire. Ne pas commencer la phase 5.

Relever pour chaque téléphone : modèle, système, navigateur/version, mode navigateur ou app installée, résultat et date. Ne pas enregistrer email, session, mot de passe ou capture de stock personnel dans Git.

Retour déjà obtenu : l'utilisateur confirme la connexion et l'accès à la réserve ; sa capture Samsung montre le nom/logo et la consultation connectée. L'appareil du premier retour n'était pas précisé. La capture privée n'est pas ajoutée au dépôt. Icône d'accueil, relance, ordinateur éteint, OFF et iPhone restent à confirmer séparément.

## 1. Vérifier la consultation

1. Sur iPhone, ouvrir l'adresse dans **Safari** ; sur Samsung, dans **Chrome**.
2. Vérifier le nom **Sacré bleu**, le logo du sac et l'absence d'avertissement HTTPS.
3. Se connecter soi-même avec le compte habituel et consulter la réserve. Le mot de passe reste sur l'appareil, sans le transmettre à l'agent. Ne pas cliquer sur les boutons de stock/courses ni scanner un produit connu.
4. Recharger, puis fermer et rouvrir : accès à la même réserve après reprise de session ou nouvelle connexion si nécessaire. Ouvrir Stock et À acheter en lecture seule.
5. Depuis une fenêtre privée non connectée, vérifier l'écran de connexion et l'absence de données personnelles. Une déconnexion dans l'app retire aussi les vues privées ; ne pas faire cet essai avec une opération incertaine en attente.

## 2. Installer l'icône sur iPhone

Dans Safari, menu de page ou bouton **Partager** selon la disposition → **Sur l'écran d'accueil** → activer **Ouvrir comme app web** si proposé → **Ajouter**. Vérifier le nom **Sacré bleu** et l'icône du sac bleu, puis ouvrir depuis cette icône. Une connexion peut être demandée dans ce contexte ; ne pas supposer le transfert de session depuis Safari.

Si l'action manque, Safari permet de l'ajouter depuis **Modifier les actions** dans le menu de partage. Référence : [guide Apple](https://support.apple.com/fr-fr/guide/iphone/iph42ab2f3a7/ios), consulté le 29 octobre 2026. Les libellés dépendent de la version iOS.

## 3. Installer l'icône sur Samsung

Dans Chrome, menu **⋮** → **Installer et créer un raccourci** → **Installer**, ou l'entrée **Ajouter à l'écran d'accueil** selon la version. Vérifier **Sacré bleu** et l'icône du sac bleu, puis ouvrir depuis l'icône. Référence : [guide Chrome Android](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=fr), consulté le 29 octobre 2026.

## 4. Vérifier le plein écran Android demandé pendant la recette

Le manifeste demande maintenant `display: fullscreen`, au lieu de `standalone`, pour masquer les boutons système Android dans les navigateurs compatibles lors de l'ouverture depuis l'icône installée. Chrome synthétise un mode immersif pour ce réglage ; la barre supérieure peut également disparaître. Les commandes peuvent revenir avec un geste depuis le bord ou lorsque le système en a besoin. Les barres propres à Sacré bleu (Stock, Scanner, À acheter) restent visibles.

Vérifier sur Samsung : fermeture/réouverture depuis l'icône, disparition habituelle des boutons système, réaffichage par geste, nom/logo/réglages non masqués par la caméra frontale, clavier et retour à l'app. Le navigateur décide du comportement et du délai de mise à jour du manifeste installé ; ne pas promettre l'effet immédiat d'un simple rechargement. Commencer par fermer toutes les fenêtres de Sacré bleu et rouvrir depuis l'icône. Si l'ancien mode reste actif, suivre la procédure de mise à jour WebAPK avant d'envisager une réinstallation ; ne pas effacer les données de site pour ce seul motif.

Sources consultées le 29 octobre 2026 : [architecture Android Chromium, mode immersif](https://chromium.googlesource.com/chromium/src/+/HEAD/components/webapps/docs/android_architecture.md), [mises à jour du manifeste Chrome](https://web.dev/articles/manifest-updates), [évolution du mécanisme Chrome 144](https://developer.chrome.com/blog/improvements-to-web-app-updates). Plein écran physique Samsung **non encore validé**.

L'utilisateur signale ensuite que les deux barres système restent visibles après fermeture/réouverture. Pour distinguer l'ancien JavaScript d'une configuration Android non actualisée, ouvrir les réglages et relever **Version**, puis **Diagnostic d'affichage → Affichage détecté**. Le mode demandé par le build doit être Plein écran. Une version récente avec un mode détecté standard oriente le diagnostic vers l'installation/manifeste ou la prise en charge du navigateur ; cela ne prouve pas à lui seul une cause unique.

Si aucune ligne Version n'apparaît, cette interface est antérieure au diagnostic. On peut comparer en ouvrant l'adresse canonique dans une fenêtre privée de Chrome, puis les paramètres de l'écran de connexion : aucune connexion ni manipulation de stock nécessaire pour lire ces informations. Ne pas effacer les données de site pour obtenir une version. Ce diagnostic ne force ni le worker ni la mise à jour du WebAPK Android.

## 5. Vérifier scanner et OFF sans modifier les stocks

Suivre `TESTS_OFF_TELEPHONES.md` : uniquement des codes publics confirmés absents du catalogue, proposition OFF puis **Fermer sans enregistrer**. Commencer par une saisie manuelle, puis activer la caméra explicitement avec un emballage correspondant à un code autorisé. Vérifier la reprise après fermeture du formulaire et après retour d'arrière-plan. Aucun scan connu, création, ajustement ou annulation dans la réserve réelle.

Une recherche OFF actualise son budget technique, sans modifier le catalogue ou les quantités. L'appel peut échouer ou proposer une fiche imparfaite ; le formulaire manuel doit rester disponible et corrigeable.

## 6. Vérifier l'indépendance de l'ordinateur et les mises à jour

Sur un téléphone en réseau mobile, Wi-Fi coupé, ouvrir l'app avec l'ordinateur éteint. Vérifier la consultation de la réserve et la relance depuis l'icône. Le réseau Internet reste nécessaire pour relire les données privées ; aucune consultation privée persistante hors ligne n'est livrée ici. Supabase Free peut se mettre en pause après une période de faible activité : suivre `BACKUP.md`/`CLOUD.md` pour la reprise, sans maintien artificiel d'activité.

Chaque push validé sur `main` publie une nouvelle version après réussite du build. Une fenêtre déjà ouverte peut garder son ancien worker ; fermer complètement les fenêtres de l'app puis rouvrir avant d'envisager un effacement des données. Vérifier effectivement une mise à jour sur chaque téléphone, sans revendiquer de bascule instantanée ni ajouter une gestion de mise à jour de phase 5.

## Résultats à compléter

| Appareil         | Consultation / session | Icône / installation / relance                             | Caméra / OFF sans écriture | Réseau mobile / ordinateur éteint | Mise à jour                                                   |
| ---------------- | ---------------------- | ---------------------------------------------------------- | -------------------------- | --------------------------------- | ------------------------------------------------------------- |
| iPhone / Safari  | Non confirmé           | Non confirmé                                               | Non confirmé               | Non confirmé                      | Non confirmé                                                  |
| Samsung / Chrome | Consultation confirmée | Logo dans l'app visible ; installation/relance à confirmer | Non confirmé               | Non confirmé                      | Barres encore visibles après relance ; version/mode à relever |

Un test de largeur sur ordinateur ou une icône présente dans le manifeste ne remplace pas ces essais physiques. La synchronisation de deux appareils peut être observée en lecture seule ; une nouvelle recette de mouvements exigerait un accord distinct sur des données jetables.
