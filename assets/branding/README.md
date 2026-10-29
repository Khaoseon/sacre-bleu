# Logo Sacré bleu

`sacre-bleu-source.png` est l'image fournie par l'utilisateur pour remplacer le logo de l'application. Elle est conservée à l'identique, hors du dossier publié.

Les fichiers PNG de `public/` sont des dérivés déterministes de ce dessin : aucun texte ou élément illustré redessiné. La zone centrale `(x=300, y=350, largeur=480, hauteur=650)` de la source 1080 × 1350 est redimensionnée et centrée sur le fond bleu d'origine `#0d3161` ; les grandes marges extérieures sont retirées. Traitement réalisé avec Sharp 0.35.5 fourni par l'environnement d'outillage, sans dépendance ajoutée au projet.

`icon-master.png` est le master carré 1024 × 1024, avec dessin centré sur 880 px de haut. Il reste dans ce dossier, hors du site publié et du cache PWA ; seuls ses dérivés utiles sont publiés.

| Fichier public         | Dimensions | Usage                                                      |
| ---------------------- | ---------- | ---------------------------------------------------------- |
| `icon-192.png`         | 192 × 192  | Manifeste PWA Android                                      |
| `icon-512.png`         | 512 × 512  | Manifeste PWA haute définition                             |
| `icon-maskable.png`    | 512 × 512  | Icône adaptative Android, dessin centré sur 352 px de haut |
| `apple-touch-icon.png` | 180 × 180  | Installation sur l'écran d'accueil iPhone                  |
| `logo.png`             | 96 × 96    | En-têtes de l'application, affichage à 40 px               |
| `favicon.png`          | 32 × 32    | Onglet et favori du navigateur                             |

Le fond est opaque. Le système du téléphone applique ses coins arrondis ou son masque ; ne pas réintroduire de larges marges blanches dans l'icône. La variante maskable laisse le dessin dans sa zone centrale sûre. Les icônes sont déclarées dans `vite.config.ts` et `index.html`, et incluses dans les ressources statiques de la PWA.

La présence du bon logo dans le build ne certifie pas son affichage après installation sur un téléphone réel. Cette recette doit être effectuée après la publication HTTPS autorisée. Un raccourci installé précédemment peut garder son ancienne icône.
