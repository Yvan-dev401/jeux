# Jeux

Catalogue de jeux d'ambiance à jouer ensemble, en famille ou entre amis.
Une page d'accueil présente les quatre jeux disponibles, tous jouables sur un
seul téléphone qu'on se passe.

Site **100 % statique** : HTML, CSS et JavaScript, aucune dépendance, aucun
serveur, aucune étape de build. Il se publie tel quel sur GitHub Pages.

## Publier sur GitHub Pages

Le site est à la racine du dépôt et contient un fichier `.nojekyll` : GitHub
Pages le sert tel quel, sans build, sans workflow et sans runner.

1. *Settings* → *Pages*
2. *Source* : **Deploy from a branch**
3. Branche `main`, dossier **`/ (root)`**, puis *Save*

Chaque envoi sur `main` republie le site. Il est servi sur
`https://<compte>.github.io/<dépôt>/`. Tous les chemins du site sont relatifs :
il fonctionne aussi bien à la racine d'un domaine que dans un sous-dossier.

Il n'y a volontairement aucun workflow GitHub Actions : la publication n'en a
pas besoin, et les tests se lancent en local avec `npm test` (voir plus bas).

## Principe : une soirée, un lien

Chaque groupe ouvre sa **soirée** sur le téléphone qui sert de plateau — celui
qu'on se passe entre les manches. La soirée retient les joueurs, les scores, le
chrono et les cartes maison.

Elle est encodée dans le **fragment de l'URL** (la partie après le `#`). Deux
conséquences utiles :

- **recharger la page ne perd rien** — pratique quand quelqu'un touche au
  mauvais bouton en pleine partie ;
- **le bouton « Transférer » copie un lien** qui rouvre la soirée à l'identique
  sur un autre téléphone, scores compris.

Un fragment d'URL n'est jamais envoyé au serveur qui héberge la page : le
contenu d'une soirée ne quitte donc pas les appareils qui l'ouvrent.

### Aucune donnée de partie n'est sauvegardée

- pas de serveur de jeu, pas de base de données, pas de compte ;
- aucun stockage navigateur (ni `localStorage`, ni cookie) ;
- aucune requête réseau pendant une partie ;
- tout est effacé à la clôture de la soirée, ou en fermant l'onglet.

Des milliers de groupes peuvent donc jouer en même temps partout dans le monde :
chaque soirée est isolée par construction, puisqu'elle ne vit que sur son
appareil.

## Les jeux

| Jeu | Joueurs | En deux mots |
| --- | --- | --- |
| **Ta mère en slip** | 2 à 12 | Devine ta combinaison de cartes en posant des questions fermées. |
| **Qui a dit ça ?** | 3 à 12 | Chacun répond anonymement ; le meneur rend chaque réponse à son auteur. |
| **Le mot piégé** | 4 à 12 | Tout le monde a le même mot, sauf un — qui l'ignore. Discutez, votez. |
| **Mime ou rien** | 4 à 12 | Deux équipes, un chrono, des mimes cotés de 1 à 3 points. |

Chaque jeu porte ses propres règles, en résumé sur son écran d'accueil et en
détail derrière le bouton **Règles**.

Tous partagent le même socle : `assets/js/noyau.js` tient la soirée (code,
joueurs, scores, manches, instantané) et `assets/js/salle.js` l'interface
commune (ouvrir ou reprendre une soirée, gérer les joueurs et le chrono,
classement, transfert par lien, clôture). Un jeu n'écrit donc que sa mécanique
et ses écrans de manche.

## Le jeu : Ta mère en slip

À 2 ou jusqu'à 12, on retourne le smartphone face aux autres et on devine sa
combinaison de cartes en premier. *Suis-je un homme ? Un chanteur ? J'allume le
feu ? Je suis chez l'esthéticienne ?*

**La règle.** À son tour, un joueur tient le téléphone face à la tablée : tout
le monde voit sa combinaison — un personnage et une action — sauf lui. Il pose
des questions fermées aux autres pour la deviner avant la fin du chrono. Une
manche, c'est **une** combinaison : on ne les enchaîne pas.

Les règles complètes sont dans le jeu : un résumé en trois étapes sur l'écran
d'accueil, et le détail derrière le bouton **Règles**, accessible aussi depuis
le salon une fois la soirée ouverte.

Ce que la version en ligne apporte :

- jusqu'à 12 joueurs ;
- 3 fois plus de cartes — 201 cartes de base (101 personnages, 100 actions),
  soit 10 100 combinaisons ;
- possibilité d'ajouter des cartes à l'infini, le temps de la soirée ;
- choix de la durée du chrono (30, 60, 90, 120 ou 180 s) ;
- ça tient dans la poche : interface pensée pour le téléphone.

Le déroulé : décompte de 3 s, la combinaison s'affiche, le chrono tourne. Le
joueur conclut avec **J'ai trouvé !** ou **Langue au chat** — au doigt, au
clavier (→ / ←) ou en inclinant le téléphone quand le navigateur le permet.

Le score récompense la rapidité : **une combinaison devinée rapporte autant de
points qu'il restait de secondes au chrono**. Trouver en 20 s sur un chrono de
60 s vaut donc 40 points. Une combinaison manquée — langue au chat ou temps
écoulé — n'en rapporte aucun, et la réponse est révélée. Le classement de la
soirée cumule ces points.

## Les paquets de contenu

Tout le contenu a été **écrit pour cette version en ligne**, en registre tout
public. Il ne provient d'aucun jeu existant : ni du jeu de société « Ta mère en
slip », ni de son application mobile.

| Fichier | Contenu |
| --- | --- |
| `assets/js/cartes.js` | 201 cartes — 101 personnages, 100 actions |
| `assets/js/questions.js` | 60 questions pour « Qui a dit ça ? » |
| `assets/js/mots-pieges.js` | 60 paires de mots proches |
| `assets/js/mimes.js` | 104 mimes sur trois niveaux |

Chaque fichier n'est qu'une liste de chaînes : ajouter, retirer ou réécrire se
fait directement dedans. Dans « Ta mère en slip », les joueurs peuvent en outre
ajouter leurs propres cartes en cours de soirée, sans toucher au code.

## Développer en local

```bash
npm run serve   # http://localhost:8000  (python3 -m http.server)
npm test        # tests unitaires (node:test, aucune dépendance)
```

N'importe quel serveur statique convient (`npx serve`, l'extension Live Server…).
En revanche, ouvrir les fichiers par double-clic (`file://`) ne marche pas : les
navigateurs refusent de charger des modules JavaScript depuis un fichier local.
La page l'explique si ça arrive.

## Identité visuelle

L'ADN tient dans le bloc `:root` de `assets/css/base.css`, et rien d'autre ne
contient de couleur en dur : catalogue et jeux dérivés en héritent
automatiquement.

| | |
| --- | --- |
| Jaune signal | `#fbd509` — barre de navigation, boutons, étiquettes, scores |
| Jaune aplat | `#f5d749` — grandes bandes pleine largeur |
| Noir profond | `#070b08` — fond de page et texte posé sur le jaune |
| Noir cellule | `#0e130e` — surfaces et champs |
| Filet | `#2c322d` — bordures de 1 px, qui dessinent la grille |
| Texte | `#ecebe5` — titres ; `#969d97` — texte courant |
| Spectre | dégradé jaune → vert → bleu → violet → rose → rouge, avec marques obliques |

Les principes qui vont avec :

- **angles droits partout** — tous les rayons valent 0, aucune ombre ;
- **grille filetée** — les blocs sont des cellules jointives séparées par un
  filet de 1 px, pas des cartes flottantes ;
- **deux voix typographiques** — grotesque lourde à interlettrage serré
  (`-0.035em`) pour les titres, qui se terminent par un point ; monospace
  capitale très espacée (`0.14em`) pour toute l'interface : navigation,
  boutons, étiquettes, compteurs, libellés de champs ;
- **sections numérotées** — un filet, puis `01` en jaune et le nom de la
  section en monospace ;
- **le mouvement fait partie de l'identité** — les blocs entrent en ressort au
  défilement (`--ressort`, une courbe `linear()` échantillonnée sur un ressort),
  légèrement décalés les uns des autres.

Aucune police n'est téléchargée : les deux piles s'appuient sur les polices
système, ce qui préserve la promesse « aucune requête réseau ». Pour coller
encore plus près, il suffirait d'héberger un fichier `woff2` et de changer
`--police`.

## Organisation

```
index.html                      page d'accueil : le catalogue
404.html                        page d'erreur autonome (aucun fichier externe)
.nojekyll                       GitHub Pages sert le dossier tel quel
jeux/<nom-du-jeu>/              une page par jeu
assets/
  css/base.css                  l'ADN : jetons, typographie, composants
  css/accueil.css               page d'accueil
  css/jeu.css                   écrans du jeu
  js/noyau.js                   socle d'une soirée : joueurs, scores, lien
  js/salle.js                   interface commune : salon, classement, transfert
  js/apparitions.js             entrées en scène au défilement
  js/cartes.js · questions.js · mots-pieges.js · mimes.js   les paquets
  js/soiree.js · lien.js        « Ta mère en slip » : mécanique et lien
  js/mot-piege.js · qui-a-dit-ca.js · mime-ou-rien.js       les autres mécaniques
  js/ta-mere-en-slip.js · ui-*.js                           les écrans de chaque jeu
  img/favicon.svg
tests/                          tests de la logique de soirée et des liens
```

Les moteurs (`noyau.js` et les modules de mécanique) ne touchent pas au DOM :
ils se testent directement avec Node, sans navigateur ni greffon.

## Ajouter un jeu au catalogue

1. Créer `jeux/<mon-jeu>/index.html` sur le modèle d'un jeu existant, et son
   module d'écrans `assets/js/ui-<mon-jeu>.js`.
2. Écrire sa mécanique dans `assets/js/<mon-jeu>.js`, en s'appuyant sur
   `noyau.js` ; brancher l'interface commune avec `installerSalle()`.
3. Ajouter une carte dans la liste `.catalogue` de `index.html`.
4. Garder des chemins **relatifs** (`../../assets/…`) pour que le jeu marche
   aussi dans un sous-dossier GitHub Pages.
5. Charger `base.css` et n'écrire aucune couleur en dur : le jeu hérite alors
   de l'identité visuelle, et suivra ses évolutions.
6. Marquer les blocs à révéler avec `data-apparition` et charger
   `apparitions.js`.
