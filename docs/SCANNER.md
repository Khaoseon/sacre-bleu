# Scanner caméra — phase 3

État au 27 octobre 2026. Implémentation et tests automatisés livrés ; **recette Samsung commencée, iPhone encore à effectuer**. Premier flux réel obtenu ; correction du cadrage portrait à confirmer sur l’appareil, détails dans `VALIDATION.md`. Serveur HTTPS temporaire sur Wi-Fi privé lancé après accord, sans hébergement externe, tunnel, appel Open Food Facts ou traitement distant des images.

## Choix technique

Comparaison documentaire des projets actuels, puis décodage synthétique avec le lecteur retenu ; aucun benchmark sur téléphone n’est revendiqué.

| Solution                                                                                               | Intérêt                                                                                                           | Limites pour cette phase                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [ZXing Browser](https://github.com/zxing-js/browser) + [ZXing JS](https://github.com/zxing-js/library) | EAN-13, EAN-8, UPC-A ; API canvas/vidéo ; TypeScript ; intégration compacte ; publications actuelles 0.2.1/0.23.0 | Travail CPU en JavaScript ; qualité autofocus, éclairage et vitesse à mesurer sur appareils                    |
| [Quagga2](https://github.com/ericblade/quagga2)                                                        | Localisation des codes 1D et rotation, lecteurs EAN/UPC, configuration des workers/fréquence                      | Davantage de réglages et de cycle vidéo à intégrer ; aucune supériorité de performance déduite sans essai réel |
| [ZXing WASM](https://github.com/Sec-ant/zxing-wasm)                                                    | Moteur ZXing-C++, formats demandés et option intéressante pour les performances                                   | Binaire WASM et chargement à gérer localement ; complexité supplémentaire à justifier par des mesures          |
| [BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector)                    | Accélération native lorsque disponible                                                                            | Disponibilité limitée : ne couvre pas seul la cible Safari iOS/Android                                         |

Choix : **ZXing Browser 0.2.1 et bibliothèque 0.23.0**, versions exactes dans le lockfile. Le lecteur 1D reçoit exclusivement EAN-13, EAN-8 et UPC-A. Il utilise canvas et `getUserMedia`, sans dépendance à BarcodeDetector. Safari iOS et les navigateurs Android disposant de ces API en HTTPS sont les cibles ; leur compatibilité complète n’est pas certifiée par la comparaison documentaire. Node **24 minimum** pour les outils du projet, conformément à la dépendance ZXing actuelle.

Le module est importé après activation explicite de la caméra. Son fichier séparé (~478 Ko, ~125 Ko gzip) est exclu du précache PWA et mis en cache à la première utilisation seulement, sur la même origine. Le bundle principal reste autour de 523 Ko (~152 Ko gzip) ; Vite signale encore son seuil de 500 Ko. Aucun CDN. Les images restent dans un canvas en mémoire, libéré à la fermeture ; aucun fichier, télémétrie ou image transmis par ce module.

## Session et parcours

- Scanner → **Activer la caméra** : permission à ce moment seulement. Caméra arrière préférée (`facingMode: environment`), sans audio, vidéo muette, `playsInline`, `autoPlay` et appel explicite à `play()`.
- Prévisualisation conservée entre produits, remplie par recadrage centré (`object-fit: cover`), sans déformation ni bandes noires ajoutées par la mise en page. Le cadre partage ses proportions avec le décodeur ; ses coordonnées sont projetées dans le flux source selon la taille réelle de la vidéo affichée, y compris après rotation. Décodage de cette seule zone, largeur plafonnée à 960 px, nouvelle tentative 150 ms après chaque traitement : pas de rendu React par image et pas de boucle concurrente.
- Ajouter vert par défaut, Retirer rouge ; une reconnaissance déclenche le parcours `scan` existant, puis RPC et relecture cohérente en partagé. Aucun stock n’est modifié par le module caméra.
- Le compteur traite le dernier mouvement : +/−, répétition explicite et Annuler inchangés. Le changement de mode prépare la prochaine intention et ne réinterprète pas le mouvement précédent.
- Inconnu : détection suspendue, flux conservé, formulaire existant avec code prérempli. Validation ou annulation ferme le formulaire et reprend la détection. Le code encore présent reste verrouillé : retirer/représenter ou saisir explicitement pour le traiter. En partagé, création à zéro puis scan en Ajouter, mêmes clés/reprises ; Annuler conserve la fiche à zéro.
- Écriture lente/incertaine, fiche ou paramètres ouverts : décodage suspendu. Une demande incertaine bloque toujours les écritures jusqu’à « Reprendre la demande ». Même UUID et mêmes paramètres, même après rechargement ; le code du produit en attente est reverrouillé. Aucune vibration ni réussite avant confirmation et snapshot courant.
- Sortie du scanner/déconnexion : démontage et arrêt des pistes. `visibilitychange` caché, `pagehide`, interruption de piste (`ended`/`mute`) ou pause système de la vidéo : fermeture et état en pause. Au retour, **Reprendre la caméra** ; pas de relance automatique ni multiplication des lecteurs. Le verrou du dernier code est conservé pendant cette pause dans la même page.
- Les générations de session neutralisent les réponses tardives des permissions et du chargement. Tout flux arrivé après annulation est arrêté immédiatement ; un ancien lecteur ne peut arrêter la nouvelle session.
- Lampe proposée seulement si la piste annonce `torch` ; échec non bloquant. Saisie manuelle repliable disponible même sans caméra ou après refus ; contrat historique des codes personnels 4 à 32 chiffres conservé.

## Reconnaissance et doubles lectures

`src/model.ts` contient la validation et le filtre purs ; `src/scanner/camera.ts` possède le flux, `decoder.ts` le lecteur et `CameraScanner.tsx` les commandes. Les RPC, migrations et types générés sont inchangés.

1. Format caméra : exactement 8, 12 ou 13 chiffres, clé modulo 10 valide ; chaînes tout à zéro refusées. Jamais de conversion du code complet en nombre.
2. Reconnaissance stable : au moins trois résultats concordants sur 240 ms minimum ; plus de 500 ms entre résultats recommence la stabilisation. Avec la cadence nominale, environ 300 ms plus le temps de décodage, sans garantie de vitesse sur appareil.
3. Code accepté verrouillé **sans expiration tant qu’il est relu**. Un autre code stable peut être traité immédiatement.
4. Réarmement du même code : au moins cinq tentatives sans résultat couvrant une seconde, puis nouvelle stabilisation. Une pause sans images, un formulaire, un réseau lent et un changement de mode ne comptent jamais comme un retrait.
5. « Scanner à nouveau » traite explicitement un exemplaire, avec une nouvelle intention métier ; il reverrouille la caméra pour éviter une seconde opération automatique.

Une absence de résultat est une observation optique, pas une preuve physique absolue de retrait : un flou prolongé peut aussi la produire. Vérifier ce compromis avec les emballages réels ; +/− et la répétition explicite restent préférables pour traiter un lot identique rapidement. Les seuils ne prétendent pas éliminer tous les faux positifs.

UPC-A à 12 chiffres et sa représentation EAN-13 préfixée d’un zéro partagent un verrou. Le moteur est configuré EAN-13/EAN-8 : les barres UPC-A sont lues sous leur représentation EAN-13 à zéro initial, pour empêcher ZXing de supprimer le premier zéro d’un EAN-13 ambigu. Recherche exacte du catalogue prioritaire, puis cette seule équivalence ; une fiche existante UPC-A à 12 chiffres est donc retrouvée. Un nouvel UPC-A issu de la caméra est enregistré sous sa représentation EAN-13. Les chaînes déjà stockées, y compris leurs zéros initiaux, ne sont jamais réécrites. Les exemples historiques de démo non conformes aux clés restent saisissables manuellement ; ils ne servent pas de preuve de lecture caméra.

Tests et limites effectives : [VALIDATION.md](VALIDATION.md). Préparation HTTPS et recette physique : [TESTS_TELEPHONES.md](TESTS_TELEPHONES.md).
