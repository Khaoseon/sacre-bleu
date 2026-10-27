# Recette privée sur iPhone et Samsung

**Recette Samsung commencée le 27 octobre 2026, iPhone encore à effectuer.** Après accords distincts : certificat local installé sur le compte Windows et sur Samsung, serveur HTTPS LAN lancé ; aucun pare-feu modifié, tunnel public ou déploiement créé. Premier flux réel obtenu et cadrage corrigé confirmé par l’utilisateur sur Samsung ; lectures de produits encore à tester. Résultats dans `VALIDATION.md`. Les instructions générales ci-dessous restent la procédure reproductible ; ne pas réinstaller une autorité déjà préparée. L’accès Cloud existant est conservé ; utiliser les deux comptes déjà confirmés. Ne pas lancer les fixtures locales contre le Cloud.

La session de recette utilise une autorité isolée dans `.tmp/phone-tls/ca` et la confiance **Windows CurrentUser/Root uniquement**. Le dossier de transfert `.tmp/phone-public` contient seulement `App_reserve-recette.crt`, copie publique de `rootCA.pem` ; aucune clé privée à copier. Cette variante n’utilise pas l’autorité par défaut de mkcert. Pour la retirer à la fin, identifier son empreinte depuis ce certificat public et retirer seulement le certificat correspondant dans le magasin Windows de l’utilisateur (`certmgr.msc` → Trusted Root Certification Authorities → Certificates), ainsi que la CA installée sur le téléphone. Un `mkcert -uninstall` lancé avec le CAROOT par défaut ne vise pas cette autorité isolée. Arrêter le serveur séparément ; demander une autorisation avant de modifier le pare-feu. Les clés locales ne sont pas supprimées pendant la recette.

## Méthode commune : build Cloud sur HTTPS privé du réseau Wi-Fi

Le plus direct pour Safari iPhone et Samsung Internet est un certificat local de confiance, puis un petit serveur HTTPS servant **uniquement `dist-cloud/`**. Aucun serveur Vite de développement ni port Supabase local à exposer. Le PC et les téléphones doivent être sur un Wi-Fi privé de confiance, sans isolation des clients. Ne pas configurer de redirection de port sur le routeur.

1. Installer personnellement [mkcert depuis ses publications officielles](https://github.com/FiloSottile/mkcert/releases) ; placer le binaire Windows dans `.tools/mkcert.exe`, dossier ignoré. Les étapes d’installation de confiance ci-dessous sont manuelles, car elles modifient la confiance TLS des appareils. Node 24+ requis.
2. Trouver l’IPv4 du PC (`Get-NetIPAddress -AddressFamily IPv4`) et celles des téléphones dans les détails Wi-Fi. Garder ces adresses stables pendant la recette. Exemple uniquement, à remplacer :

   ```powershell
   $phonePcIp = '192.168.1.10'
   $phoneIphoneIp = '192.168.1.11'
   $phoneSamsungIp = '192.168.1.12'
   New-Item -ItemType Directory -Path .tmp/phone-tls -Force
   ./.tools/mkcert.exe -install
   ./.tools/mkcert.exe -cert-file .tmp/phone-tls/server.pem -key-file .tmp/phone-tls/server-key.pem $phonePcIp localhost 127.0.0.1
   ./.tools/mkcert.exe -CAROOT
   ```

3. Copier **uniquement `rootCA.pem`** du dossier indiqué sur chaque téléphone par un transfert privé (USB/fichiers). Ne jamais copier `rootCA-key.pem` : cette clé permet de signer d’autres certificats. Les fichiers TLS restent ignorés par Git.
4. iPhone : ouvrir le certificat, installer le profil dans Réglages → Général → VPN et gestion de l’appareil (ou Profil téléchargé), puis Réglages → Général → Informations → Réglages de confiance des certificats → activer la confiance complète pour cette autorité. [Instructions Apple](https://support.apple.com/en-us/102390). Ouvrir ensuite dans Safari ; accepter l’accès au réseau local si iOS le demande pour ce site privé.
5. Samsung : installer le certificat CA depuis Paramètres → Sécurité et confidentialité → Autres paramètres de sécurité → Installer depuis le stockage → Certificat CA (les libellés varient selon One UI). Si le sélecteur refuse `.pem`, copier le certificat public sous le nom `rootCA.crt`. Ne transférer aucune clé. Tester dans Chrome puis Samsung Internet : vérifier que le certificat est accepté par chacun. Ne pas contourner un avertissement TLS ; corriger la confiance ou le certificat de l’IP. Un appareil géré peut interdire les CA utilisateur.
6. Compiler le Cloud existant puis lancer le serveur préparé :

   ```powershell
   npm run build:cloud
   npm run phone:serve -- --host $phonePcIp --cert .tmp/phone-tls/server.pem --key .tmp/phone-tls/server-key.pem --allow $phoneIphoneIp --allow $phoneSamsungIp
   ```

   Le serveur refuse `0.0.0.0`, toute IP publique, les IP qui n’appartiennent pas au PC et les clients non autorisés. Il écoute seulement cette interface privée au port 4443. L’URL exacte est `https://IP_DU_PC:4443/`. Aucun listing, source, `.env`, upload ou écriture serveur ; seulement GET/HEAD du build, avec contrôle du Host, des chemins et des liens symboliques. Les requêtes Auth/RPC vont directement au Supabase Cloud existant depuis le téléphone ; aucune photo ne lui est envoyée.

7. Si Windows bloque l’accès, autoriser manuellement ce seul port sur le profil **Privé**, limité aux deux téléphones. PowerShell administrateur, dans un autre terminal avec les trois mêmes variables :

   ```powershell
   New-NetFirewallRule -DisplayName 'App_reserve recette HTTPS' -Direction Inbound -Protocol TCP -LocalPort 4443 -LocalAddress $phonePcIp -RemoteAddress $phoneIphoneIp,$phoneSamsungIp -Action Allow -Profile Private
   ```

   Ne pas autoriser tous les réseaux ou tout Node.js dans une fenêtre de pare-feu. Une IP changée par DHCP nécessite de relancer la commande serveur et, pour le PC, de régénérer le certificat.

8. Ouvrir l’URL dans Safari sur iPhone, Chrome puis Samsung Internet sur Samsung. Connexion normale avec les comptes existants, sans modifier les callbacks Supabase. L’inscription, les liens de confirmation, les nouvelles invitations et la réinitialisation du mot de passe ne sont pas nécessaires à cette recette : l’origine LAN n’est pas ajoutée automatiquement aux callbacks Cloud. La session est distincte de celle du PC. Un stock « Synchronisé » doit apparaître avant les scans.

Après la recette : Ctrl+C dans le terminal serveur ; supprimer la règle via `Remove-NetFirewallRule -DisplayName 'App_reserve recette HTTPS'`. Retirer le profil CA de l’iPhone et le certificat utilisateur du Samsung si cette autorité était réservée à cet essai ; `./.tools/mkcert.exe -uninstall` pour la confiance PC. Conserver les clés privées hors des échanges et du dépôt. Fermer les onglets ; le cache de l’application ne contient pas de catalogue privé, mais les sessions Auth persistées suivent les réglages habituels du navigateur. Se déconnecter sur un appareil prêté.

## Variante Samsung Chrome par USB

Pour Chrome Android, le [transfert de port DevTools par USB](https://developer.chrome.com/docs/devtools/remote-debugging/local-server) permet de consulter le PC à `http://localhost:4173/` sur le téléphone. L’origine localhost est un contexte sécurisé pour `getUserMedia`, même en HTTP. Lancer `npm run preview:cloud -- --strictPort` sur le PC, activer temporairement les options développeur/débogage USB du Samsung, brancher et autoriser ce PC, puis Chrome ordinateur → `chrome://inspect/#devices` → Port forwarding : port téléphone 4173 vers `localhost:4173`, Enable port forwarding. Ouvrir `http://localhost:4173/` dans Chrome Android. Désactiver le transfert et le débogage USB après l’essai. Cela ne valide ni Safari iOS ni Samsung Internet ; la méthode Wi-Fi HTTPS ci-dessus reste la recette commune. Aucun tunnel public requis.

## Parcours à exécuter sur chaque appareil

Après le constat de flou sur Samsung, le lecteur demande la mise au point continue si le navigateur l’annonce et une définition idéale 1920×1080. Si l’image reste floue, utiliser le sélecteur **Caméra** sous l’aperçu pour essayer un autre objectif arrière ; les noms dépendent du navigateur. Ne pas chercher à agrandir le code au maximum en collant le téléphone : commencer à une distance confortable, bonne lumière, puis ajuster. Le sélecteur n’apparaît que si plusieurs caméras sont exposées. Une image nette dans l’appareil photo natif ne prouve pas que Chrome utilise le même objectif ni les mêmes réglages. La netteté après changement et les lectures physiques restent des résultats à rapporter, pas des garanties du correctif.

Noter modèle, version OS, navigateur/version, date, lumière, durée approximative de lecture, résultats et anomalies. Ne pas committer de capture d’inventaire personnel, d’email ou de session. Préparer des **emballages physiques** EAN-13 et EAN-8, et UPC-A si disponible, dont les chiffres imprimés sont lisibles. Créer les fiches nécessaires par les formulaires normaux. Relever les quantités initiales et une course liée non cochée ; le second compte contrôle les résultats. Ne jamais utiliser une fixture backend pour cette recette Cloud.

| Étape               | Action                                                                                                         | Résultat attendu                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permission          | Ouvrir Scanner sans activer ; activer, refuser puis réautoriser dans les réglages du site                      | Pas de permission avant le bouton ; message utile après refus ; reprise sans recharger toute l’app                                                                  |
| Caméra              | Activer, présenter l’EAN-13 à plat dans le cadre central, bonne lumière                                        | Caméra arrière en direct, vidéo intégrée ; un ajout après reconnaissance stable ; retour visuel puis vibration si disponible                                        |
| Doublon             | Garder le même code devant la caméra 10 secondes                                                               | Un seul mouvement ; pas de nouveaux ajouts au bout de 1,2 seconde                                                                                                   |
| Produits successifs | Présenter un EAN-8 différent, puis l’EAN-13                                                                    | Un mouvement par code stable ; même flux sans nouvelle permission ; codes stockés identiques aux chiffres attendus                                                  |
| Identiques          | Retirer complètement le code pendant plus d’une seconde puis représenter ; ensuite « Scanner à nouveau »       | Un seul nouvel exemplaire à chaque action ; pas de répétition automatique consécutive au bouton                                                                     |
| Compteur            | Faire 1 → 5 → 3, vérifier stock et courses, puis Annuler                                                       | Déduction puis restitution exactes, sans course négative ; Annuler compense seulement cette opération                                                               |
| Retirer             | Choisir rouge ; représenter un code ; ajuster, annuler ; essayer à stock nul                                   | Mode visible ; dernier mouvement Ajouter non réinterprété ; aucun stock négatif ; fiche à zéro conservée                                                            |
| Inconnu             | Code inconnu, nom/conditionnement/unité/quantité ; annuler d’abord puis représenter et enregistrer             | Code prérempli, lecture en pause, pas d’appel OFF ; flux conservé ; reprise après fermeture ; fiche ensuite reconnue                                                |
| Manuel              | Arrêter/refuser caméra, ouvrir « Saisir un code-barres » et saisir                                             | Même parcours de stock ; zéros initiaux conservés                                                                                                                   |
| Interruption        | Changer d’app, verrouiller puis déverrouiller le téléphone                                                     | Indicateur système caméra éteint en arrière-plan ; reprise explicite ; pas de deuxième flux ni scan du même code encore tenu                                        |
| Navigation/Auth     | Passer Stock, revenir Scanner ; se déconnecter pendant la session                                              | Caméra arrêtée ; aucune vue privée ni piste active après déconnexion                                                                                                |
| Réseau              | Après scan, interrompre le réseau pendant l’attente si reproductible ; reconnecter et « Reprendre la demande » | Aucun faux succès, nouvelles lectures bloquées ; reprise sans double mouvement. Si la réponse avait déjà abouti, ne pas présenter ce cas comme une perte de réponse |
| Deux comptes        | Vérifier Stock et À acheter sur l’autre téléphone visible après chaque séquence                                | Mêmes quantités confirmées après actualisation (~5 s) ; pas d’écrasement d’une correction concurrente                                                               |
| Thèmes              | Automatique/Clair/Sombre dans Paramètres ; revenir scanner                                                     | Contraste, boutons tactiles, compteur et saisie accessibles ; aucun réglage du thème ajouté au scanner                                                              |
| Lampe               | Si proposée, activer puis désactiver                                                                           | Fonctionnement sans bloquer la lecture ; absence normale si non supportée                                                                                           |

Tester aussi à une main : commandes +/−, Annuler et changement de mode ; clavier virtuel sans zoom gênant ; rotation portrait/paysage. Refaire les interruptions dans une fenêtre Safari puis, si installation locale choisie, depuis l’écran d’accueil. L’installation PWA complète reste à certifier en phase 6. Ni un viewport mobile ni des rasters synthétiques ne valident ces étapes physiques.
