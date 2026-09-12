# Jeux

Catalogue de jeux d'ambiance à jouer ensemble, en famille ou entre amis.
Une page d'accueil présente les jeux disponibles ; le premier jeu en ligne est
**Ta mère en slip**.

Site **100 % statique** : HTML, CSS et JavaScript, aucune dépendance, aucun
serveur, aucune étape de build. Il se publie tel quel sur GitHub Pages.

## Publier sur GitHub Pages

Deux chemins, au choix — le site est à la racine du dépôt, donc les deux
fonctionnent sans rien modifier.

**Le plus simple (aucun réglage de workflow)**
1. *Settings* → *Pages*
2. *Source* : **Deploy from a branch**
3. Branche `main`, dossier **`/ (root)`**, puis *Save*

**Avec GitHub Actions** (publie après avoir lancé les tests)
1. *Settings* → *Pages*
2. *Source* : **GitHub Actions**

Le workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) fait le
reste à chaque envoi sur `main`.

Le site est ensuite servi sur `https://<compte>.github.io/<dépôt>/`. Tous les
chemins du site sont relatifs : il fonctionne aussi bien à la racine d'un
domaine que dans un sous-dossier.

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

Ce que la version en ligne apporte :

- jusqu'à 12 joueurs ;
- 3 fois plus de cartes — 201 cartes de base (101 personnages, 100 actions),
  soit 10 100 combinaisons ;
- possibilité d'ajouter des cartes à l'infini, le temps de la soirée ;
- choix de la durée du chrono (30, 60, 90, 120 ou 180 s) ;
- ça tient dans la poche : interface pensée pour le téléphone.

Pendant une manche : décompte de 3 s, puis les combinaisons s'enchaînent.
**Trouvé** / **Passe** au doigt, au clavier (→ / ←) ou en inclinant le
téléphone quand le navigateur le permet. Le récapitulatif de la manche s'affiche
à la fin, puis le classement de la soirée.

## Développer en local

```bash
npm run serve   # http://localhost:8000  (python3 -m http.server)
npm test        # tests unitaires (node:test, aucune dépendance)
```

N'importe quel serveur statique convient (`npx serve`, l'extension Live Server…).
En revanche, ouvrir les fichiers par double-clic (`file://`) ne marche pas : les
navigateurs refusent de charger des modules JavaScript depuis un fichier local.
La page l'explique si ça arrive.

## Organisation

```
index.html                      page d'accueil : le catalogue
404.html                        page d'erreur autonome (aucun fichier externe)
.nojekyll                       GitHub Pages sert le dossier tel quel
jeux/ta-mere-en-slip/           écrans du jeu
assets/
  css/base.css                  socle commun : jetons de design, composants
  css/accueil.css               page d'accueil
  css/jeu.css                   écrans du jeu
  js/cartes.js                  paquet de base (module, pas de fichier à charger)
  js/soiree.js                  logique d'une soirée : joueurs, scores, tirage
  js/lien.js                    la soirée ↔ le fragment d'URL
  js/ta-mere-en-slip.js         interface et déroulé d'une manche
  img/favicon.svg
tests/                          tests de la logique de soirée et des liens
.github/workflows/pages.yml     publication sur GitHub Pages
```

`soiree.js` et `lien.js` ne touchent pas au DOM : ils se testent directement
avec Node, et se réutilisent pour un autre jeu du catalogue.

## Ajouter un jeu au catalogue

1. Créer `jeux/<mon-jeu>/index.html` et ses styles/scripts dans `assets/`.
2. Ajouter une carte dans la liste `.catalogue` de `index.html`.
3. Garder des chemins **relatifs** (`../../assets/…`) pour que le jeu marche
   aussi dans un sous-dossier GitHub Pages.
