# Jeux

Catalogue de jeux d'ambiance à jouer ensemble, en famille ou entre amis.
Une page d'accueil présente les jeux disponibles ; le premier jeu en ligne est
**Ta mère en slip**.

## Principe

Chaque groupe ouvre sa propre **soirée** : un code à 5 caractères qui isole sa
partie de toutes les autres. Des milliers de groupes peuvent donc jouer en même
temps, partout dans le monde, sans jamais se croiser.

**Aucune donnée de partie n'est sauvegardée.** Joueurs, scores, cartes ajoutées
et tirages vivent uniquement dans la mémoire vive du serveur, le temps de la
soirée :

- pas de base de données, pas d'écriture sur disque, pas de compte ;
- tout est effacé quand l'hôte clôture la soirée ;
- tout est effacé automatiquement après 3 h sans activité ;
- tout disparaît au redémarrage du serveur ;
- le navigateur ne stocke rien non plus : le code de la soirée vit dans l'URL.

## Le jeu : Ta mère en slip

À 2 ou jusqu'à 12, on retourne le smartphone face aux autres et on devine sa
combinaison de cartes en premier. *Suis-je un homme ? Un chanteur ? J'allume le
feu ? Je suis chez l'esthéticienne ?*

Ce que la version en ligne apporte :

- jusqu'à 12 joueurs ;
- 3 fois plus de cartes — 201 cartes de base (101 personnages, 100 actions),
  soit plus de 10 000 combinaisons ;
- possibilité d'ajouter des cartes à l'infini, le temps de la soirée ;
- choix de la durée du chrono (30, 60, 90, 120 ou 180 s) ;
- ça tient dans la poche : interface pensée pour le téléphone.

Pendant une manche : décompte de 3 s, puis les combinaisons s'enchaînent.
**Trouvé** / **Passe** au doigt, au clavier (→ / ←) ou en inclinant le
téléphone quand le navigateur le permet. Le récapitulatif de la manche s'affiche
à la fin, puis le classement de la soirée.

## Démarrer

```bash
npm start          # http://localhost:3000
npm run dev        # rechargement automatique
npm test           # tests unitaires (node:test)
```

Aucune dépendance à installer : le serveur n'utilise que la bibliothèque
standard de Node (≥ 18). Le port se règle avec `PORT`.

## Organisation

```
public/                         site statique
  index.html                    page d'accueil : le catalogue
  404.html
  jeux/ta-mere-en-slip/         écrans du jeu
  assets/css|js|data|img        styles, scripts, paquet de cartes de base
server/
  index.js                      serveur HTTP (statique + API)
  api.js                        routes JSON
  sessions.js                   soirées en mémoire vive
  paquet.js                     paquet de base et tirage des combinaisons
  config.js                     réglages et garde-fous
tests/                          tests du cycle de vie d'une soirée
```

## API des soirées

Toutes les réponses sont en JSON et en `Cache-Control: no-store`.

| Méthode  | Route                                        | Rôle                                   |
| -------- | -------------------------------------------- | -------------------------------------- |
| `GET`    | `/api/sante`                                 | état du serveur, soirées en cours      |
| `GET`    | `/api/paquet`                                | taille du paquet de base et limites    |
| `POST`   | `/api/soirees`                               | créer une soirée, renvoie son code     |
| `GET`    | `/api/soirees/:code`                         | état complet de la soirée              |
| `DELETE` | `/api/soirees/:code`                         | clôturer et effacer la soirée          |
| `PATCH`  | `/api/soirees/:code/reglages`                | durée du chrono, catégories            |
| `POST`   | `/api/soirees/:code/joueurs`                 | ajouter un joueur (12 maximum)         |
| `DELETE` | `/api/soirees/:code/joueurs/:id`             | retirer un joueur                      |
| `POST`   | `/api/soirees/:code/cartes`                  | ajouter une carte à la soirée          |
| `DELETE` | `/api/soirees/:code/cartes/:categorie/:id`   | retirer une carte ajoutée              |
| `POST`   | `/api/soirees/:code/tirage`                  | tirer des combinaisons pour une manche |
| `POST`   | `/api/soirees/:code/manches`                 | enregistrer le score d'une manche      |
| `POST`   | `/api/soirees/:code/reinitialiser`           | remettre les scores à zéro             |

## Ajouter un jeu au catalogue

1. Créer `public/jeux/<mon-jeu>/index.html` (et ses styles/scripts dans
   `public/assets/`).
2. Ajouter une carte dans la liste `.catalogue` de `public/index.html`.
3. Réutiliser l'API des soirées si le jeu a besoin d'un groupe : elle n'est pas
   spécifique à *Ta mère en slip*.
