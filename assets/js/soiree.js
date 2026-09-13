// Une soirée, entièrement côté navigateur.
//
// Il n'y a pas de serveur : une soirée vit dans la mémoire de la page, et son
// instantané est encodé dans le fragment de l'URL (la partie après le « # »).
// Un fragment n'est jamais envoyé sur le réseau : les prénoms, les scores et
// les cartes de la soirée ne quittent donc jamais l'appareil, et rien n'est
// écrit dans le stockage du navigateur.
import { CATEGORIES, PAQUET_DE_BASE } from './cartes.js';

export const REGLES = {
  minJoueurs: 2,
  maxJoueurs: 12,
  maxCartesPerso: 300,
  maxLongueurNom: 24,
  maxLongueurCarte: 80,
  dureesChrono: [30, 60, 90, 120, 180],
  dureeChronoDefaut: 60,
  maxTirage: 60,
  pointsMax: 180 // le chrono le plus long : une manche ne peut pas rapporter plus
};

export { PAQUET_DE_BASE };

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1
const parCategorie = new Map(CATEGORIES.map((c) => [c.id, c]));

export class ErreurSoiree extends Error {
  constructor(message) {
    super(message);
    this.nom = 'ErreurSoiree';
  }
}

function identifiant() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function genererCode() {
  let code = '';
  for (let i = 0; i < 5; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

function nettoyerTexte(valeur, maxLongueur, champ) {
  if (typeof valeur !== 'string') throw new ErreurSoiree(`${champ} est requis.`);
  const propre = valeur.replace(/\s+/g, ' ').trim();
  if (!propre) throw new ErreurSoiree(`${champ} ne peut pas être vide.`);
  if (propre.length > maxLongueur) {
    throw new ErreurSoiree(`${champ} est limité à ${maxLongueur} caractères.`);
  }
  return propre;
}

export function creerSoiree({ nom } = {}) {
  return {
    code: genererCode(),
    nom: nom ? nettoyerTexte(nom, REGLES.maxLongueurNom, 'Le nom de la soirée') : 'Soirée',
    reglages: { duree: REGLES.dureeChronoDefaut, categories: ['personnages', 'actions'] },
    joueurs: [],
    cartesPerso: { personnages: [], actions: [] },
    manches: 0,
    // Suivi des combinaisons déjà sorties : utile pendant la soirée, jamais
    // transporté dans le lien.
    combinaisonsVues: new Set()
  };
}

export function ajouterJoueur(soiree, nom) {
  if (soiree.joueurs.length >= REGLES.maxJoueurs) {
    throw new ErreurSoiree(`La soirée est complète (${REGLES.maxJoueurs} joueurs maximum).`);
  }
  const propre = nettoyerTexte(nom, REGLES.maxLongueurNom, 'Le prénom');
  if (soiree.joueurs.some((j) => j.nom.toLowerCase() === propre.toLowerCase())) {
    throw new ErreurSoiree('Ce prénom est déjà pris dans la soirée.');
  }
  const joueur = { id: identifiant(), nom: propre, score: 0, manchesJouees: 0, trouvees: 0 };
  soiree.joueurs.push(joueur);
  return joueur;
}

export function retirerJoueur(soiree, joueurId) {
  const index = soiree.joueurs.findIndex((j) => j.id === joueurId);
  if (index === -1) throw new ErreurSoiree('Joueur introuvable.');
  soiree.joueurs.splice(index, 1);
  return soiree;
}

export function majReglages(soiree, { duree, categories }) {
  if (duree !== undefined) {
    const valeur = Number(duree);
    if (!REGLES.dureesChrono.includes(valeur)) {
      throw new ErreurSoiree(`Durée invalide. Choix possibles : ${REGLES.dureesChrono.join(', ')} s.`);
    }
    soiree.reglages.duree = valeur;
  }
  if (categories !== undefined) {
    if (!Array.isArray(categories) || categories.length === 0) {
      throw new ErreurSoiree('Choisis au moins une catégorie.');
    }
    if (categories.some((c) => !parCategorie.has(c))) throw new ErreurSoiree('Catégorie inconnue.');
    soiree.reglages.categories = [...new Set(categories)];
  }
  return soiree;
}

export function ajouterCarte(soiree, categorie, texte) {
  if (!parCategorie.has(categorie)) throw new ErreurSoiree('Catégorie inconnue.');
  const liste = soiree.cartesPerso[categorie];
  if (liste.length >= REGLES.maxCartesPerso) {
    throw new ErreurSoiree(`Maximum ${REGLES.maxCartesPerso} cartes ajoutées par catégorie.`);
  }
  const propre = nettoyerTexte(texte, REGLES.maxLongueurCarte, 'La carte');
  if (liste.some((c) => c.texte.toLowerCase() === propre.toLowerCase())) {
    throw new ErreurSoiree('Cette carte existe déjà dans la soirée.');
  }
  const carte = { id: identifiant(), texte: propre };
  liste.push(carte);
  return carte;
}

export function retirerCarte(soiree, categorie, carteId) {
  const liste = soiree.cartesPerso[categorie];
  if (!liste) throw new ErreurSoiree('Catégorie inconnue.');
  const index = liste.findIndex((c) => c.id === carteId);
  if (index === -1) throw new ErreurSoiree('Carte introuvable.');
  liste.splice(index, 1);
  return soiree;
}

/**
 * Clôt la manche d'un joueur : une combinaison, devinée ou non.
 * Les points sont les secondes qu'il restait au chrono — deviner vite rapporte
 * davantage, ce qui rend la course au « premier trouvé » lisible même quand on
 * joue chacun son tour sur un seul téléphone.
 */
export function enregistrerManche(soiree, { joueurId, points, trouvee }) {
  const joueur = soiree.joueurs.find((j) => j.id === joueurId);
  if (!joueur) throw new ErreurSoiree('Joueur introuvable.');
  const valeur = Number(points);
  if (!Number.isInteger(valeur) || valeur < 0 || valeur > REGLES.pointsMax) {
    throw new ErreurSoiree('Score de manche invalide.');
  }
  joueur.score += valeur;
  joueur.manchesJouees += 1;
  if (trouvee) joueur.trouvees += 1;
  soiree.manches += 1;
  return joueur;
}

export function reinitialiserScores(soiree) {
  for (const joueur of soiree.joueurs) {
    joueur.score = 0;
    joueur.manchesJouees = 0;
    joueur.trouvees = 0;
  }
  soiree.manches = 0;
  soiree.combinaisonsVues.clear();
  return soiree;
}

export function classement(soiree) {
  return [...soiree.joueurs].sort((a, b) => b.score - a.score || a.nom.localeCompare(b.nom, 'fr'));
}

export function prochainJoueur(soiree) {
  return [...soiree.joueurs].sort((a, b) => a.manchesJouees - b.manchesJouees)[0] ?? null;
}

function cartesDisponibles(soiree, categorieId) {
  const base = parCategorie.get(categorieId)?.cartes ?? [];
  const perso = soiree.cartesPerso[categorieId]?.map((c) => c.texte) ?? [];
  return base.concat(perso);
}

/**
 * Tire les combinaisons d'une manche en évitant celles déjà sorties pendant
 * la soirée, tant que le paquet le permet.
 */
export function tirerCombinaisons(soiree, nombre) {
  const total = Math.min(Math.max(1, Number(nombre) || 20), REGLES.maxTirage);
  const listes = soiree.reglages.categories.map((id) => ({ id, cartes: cartesDisponibles(soiree, id) }));

  if (listes.length === 0 || listes.some((l) => l.cartes.length === 0)) {
    throw new ErreurSoiree('Une catégorie sélectionnée est vide.');
  }

  const possibles = listes.reduce((t, l) => t * l.cartes.length, 1);
  if (soiree.combinaisonsVues.size >= possibles * 0.8) soiree.combinaisonsVues.clear();

  const tirage = [];
  const vuesCeTour = new Set();
  let gardeFou = total * 40;

  while (tirage.length < total && gardeFou > 0) {
    gardeFou -= 1;
    const parties = listes.map((l) => {
      const index = Math.floor(Math.random() * l.cartes.length);
      return { categorie: l.id, index, texte: l.cartes[index] };
    });
    const cle = parties.map((p) => `${p.categorie}:${p.index}`).join('|');
    if (vuesCeTour.has(cle) || soiree.combinaisonsVues.has(cle)) continue;
    vuesCeTour.add(cle);
    soiree.combinaisonsVues.add(cle);
    tirage.push({ cle, parties: parties.map((p) => ({ categorie: p.categorie, texte: p.texte })) });
  }

  // Paquet trop petit pour remplir la manche sans répétition : on complète.
  while (tirage.length < total) {
    const parties = listes.map((l) => ({
      categorie: l.id,
      texte: l.cartes[Math.floor(Math.random() * l.cartes.length)]
    }));
    tirage.push({ cle: `rep:${tirage.length}`, parties });
  }

  return tirage;
}

/* --- Instantané : la soirée telle qu'elle voyage dans le lien --- */

export function instantane(soiree) {
  return {
    v: 1,
    c: soiree.code,
    n: soiree.nom,
    d: soiree.reglages.duree,
    g: soiree.reglages.categories,
    m: soiree.manches,
    j: soiree.joueurs.map((j) => [j.nom, j.score, j.manchesJouees, j.trouvees]),
    p: soiree.cartesPerso.personnages.map((c) => c.texte),
    a: soiree.cartesPerso.actions.map((c) => c.texte)
  };
}

export function depuisInstantane(donnees) {
  if (!donnees || typeof donnees !== 'object' || donnees.v !== 1) {
    throw new ErreurSoiree('Ce lien de soirée est illisible.');
  }
  const soiree = creerSoiree();
  soiree.code = /^[A-Z0-9]{3,8}$/.test(donnees.c ?? '') ? donnees.c : genererCode();
  soiree.nom = typeof donnees.n === 'string' && donnees.n.trim() ? donnees.n.slice(0, REGLES.maxLongueurNom) : 'Soirée';
  soiree.manches = Number.isInteger(donnees.m) && donnees.m >= 0 ? donnees.m : 0;

  if (REGLES.dureesChrono.includes(Number(donnees.d))) soiree.reglages.duree = Number(donnees.d);
  if (Array.isArray(donnees.g) && donnees.g.length && donnees.g.every((c) => parCategorie.has(c))) {
    soiree.reglages.categories = [...new Set(donnees.g)];
  }

  for (const entree of Array.isArray(donnees.j) ? donnees.j.slice(0, REGLES.maxJoueurs) : []) {
    const [nom, score, manchesJouees, trouvees] = Array.isArray(entree) ? entree : [];
    try {
      const joueur = ajouterJoueur(soiree, String(nom ?? ''));
      joueur.score = Number.isInteger(score) && score >= 0 ? score : 0;
      joueur.manchesJouees = Number.isInteger(manchesJouees) && manchesJouees >= 0 ? manchesJouees : 0;
      joueur.trouvees = Number.isInteger(trouvees) && trouvees >= 0 ? trouvees : 0;
    } catch {
      // Une entrée abîmée est ignorée plutôt que de faire échouer la reprise.
    }
  }

  for (const [categorie, cle] of [['personnages', 'p'], ['actions', 'a']]) {
    for (const texte of Array.isArray(donnees[cle]) ? donnees[cle].slice(0, REGLES.maxCartesPerso) : []) {
      try {
        ajouterCarte(soiree, categorie, String(texte ?? ''));
      } catch {
        // Idem : on garde ce qui est exploitable.
      }
    }
  }

  return soiree;
}
