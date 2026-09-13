# Jeux

Catalogue de jeux d'ambiance à jouer ensemble, en famille ou entre amis.
Une page d'accueil présente les jeux disponibles ; le premier jeu en ligne est
**Ta mère en slip**.

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

## Le paquet de cartes

Les 201 cartes de `assets/js/cartes.js` ont été **écrites pour cette version en
ligne**, dans l'esprit du jeu et en registre tout public. Ce ne sont ni les
cartes du jeu de société, ni celles de l'application mobile. Les modifier ou en
ajouter se fait directement dans ce fichier, sous forme de deux listes de
chaînes ; les joueurs peuvent par ailleurs en ajouter en cours de soirée, sans
toucher au code.

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
jeux/ta-mere-en-slip/           écrans du jeu
assets/
  css/base.css                  l'ADN : jetons, typographie, composants
  css/accueil.css               page d'accueil
  css/jeu.css                   écrans du jeu
  js/cartes.js                  paquet de base (module, pas de fichier à charger)
  js/soiree.js                  logique d'une soirée : joueurs, scores, tirage
  js/lien.js                    la soirée ↔ le fragment d'URL
  js/apparitions.js             entrées en scène au défilement
  js/ta-mere-en-slip.js         interface et déroulé d'une manche
  img/favicon.svg
tests/                          tests de la logique de soirée et des liens
```

`soiree.js` et `lien.js` ne touchent pas au DOM : ils se testent directement
avec Node, et se réutilisent pour un autre jeu du catalogue.

## Ajouter un jeu au catalogue

1. Créer `jeux/<mon-jeu>/index.html` et ses styles/scripts dans `assets/`.
2. Ajouter une carte dans la liste `.catalogue` de `index.html`.
3. Garder des chemins **relatifs** (`../../assets/…`) pour que le jeu marche
   aussi dans un sous-dossier GitHub Pages.
4. Charger `base.css` et n'écrire aucune couleur en dur : le jeu hérite alors
   de l'identité visuelle, et suivra ses évolutions.
5. Marquer les blocs à révéler avec `data-apparition` et charger
   `apparitions.js`.
