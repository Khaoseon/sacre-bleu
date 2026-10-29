# Sacré bleu — essais HTTPS et installation téléphone

**Préparés, non réalisés à ce stade.** Adresse canonique : **https://sacre-bleu.pages.dev**. Cloudflare Pages Free, interface publique et réserve privée par Supabase Auth/RLS. Deux comptes existants ; aucune nouvelle inscription, invitation ou donnée de test nécessaire. Ne pas commencer la phase 5.

Relever pour chaque téléphone : modèle, système, navigateur/version, mode navigateur ou app installée, résultat et date. Ne pas enregistrer email, session, mot de passe ou capture de stock personnel dans Git.

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

## 4. Vérifier scanner et OFF sans modifier les stocks

Suivre `TESTS_OFF_TELEPHONES.md` : uniquement des codes publics confirmés absents du catalogue, proposition OFF puis **Fermer sans enregistrer**. Commencer par une saisie manuelle, puis activer la caméra explicitement avec un emballage correspondant à un code autorisé. Vérifier la reprise après fermeture du formulaire et après retour d'arrière-plan. Aucun scan connu, création, ajustement ou annulation dans la réserve réelle.

Une recherche OFF actualise son budget technique, sans modifier le catalogue ou les quantités. L'appel peut échouer ou proposer une fiche imparfaite ; le formulaire manuel doit rester disponible et corrigeable.

## 5. Vérifier l'indépendance de l'ordinateur et les mises à jour

Sur un téléphone en réseau mobile, Wi-Fi coupé, ouvrir l'app avec l'ordinateur éteint. Vérifier la consultation de la réserve et la relance depuis l'icône. Le réseau Internet reste nécessaire pour relire les données privées ; aucune consultation privée persistante hors ligne n'est livrée ici. Supabase Free peut se mettre en pause après une période de faible activité : suivre `BACKUP.md`/`CLOUD.md` pour la reprise, sans maintien artificiel d'activité.

Chaque push validé sur `main` publie une nouvelle version après réussite du build. Une fenêtre déjà ouverte peut garder son ancien worker ; fermer complètement les fenêtres de l'app puis rouvrir avant d'envisager un effacement des données. Vérifier effectivement une mise à jour sur chaque téléphone, sans revendiquer de bascule instantanée ni ajouter une gestion de mise à jour de phase 5.

## Résultats à compléter

| Appareil         | Consultation / session | Icône / installation / relance | Caméra / OFF sans écriture | Réseau mobile / ordinateur éteint | Mise à jour |
| ---------------- | ---------------------- | ------------------------------ | -------------------------- | --------------------------------- | ----------- |
| iPhone / Safari  | Non réalisé            | Non réalisé                    | Non réalisé                | Non réalisé                       | Non réalisé |
| Samsung / Chrome | Non réalisé            | Non réalisé                    | Non réalisé                | Non réalisé                       | Non réalisé |

Un test de largeur sur ordinateur ou une icône présente dans le manifeste ne remplace pas ces essais physiques. La synchronisation de deux appareils peut être observée en lecture seule ; une nouvelle recette de mouvements exigerait un accord distinct sur des données jetables.
