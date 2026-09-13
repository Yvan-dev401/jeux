// « Ta mère en slip » — ce que ce jeu ajoute au noyau commun : un paquet de
// cartes complétable pendant la soirée, et le tirage d'une combinaison.
import { CATEGORIES, PAQUET_DE_BASE } from './cartes.js';
import * as noyau from './noyau.js';
import { ErreurSoiree, nettoyerTexte, identifiant } from './noyau.js';

export { ErreurSoiree, PAQUET_DE_BASE };
export const {
  genererCode,
  ajouterJoueur,
  retirerJoueur,
  classement,
  prochainJoueur
} = noyau;

export const REGLES = {
  ...noyau.REGLES,
  maxCartesPerso: 300,
  maxLongueurCarte: noyau.REGLES.maxLongueurTexte,
  maxTirage: 60
};

const parCategorie = new Map(CATEGORIES.map((c) => [c.id, c]));

export function creerSoiree(options = {}) {
  const soiree = noyau.creerSoiree(options);
  soiree.reglages.categories = ['personnages', 'actions'];
  soiree.cartesPerso = { personnages: [], actions: [] };
  // Suivi des combinaisons déjà sorties : utile pendant la soirée, jamais
  // transporté dans le lien.
  soiree.combinaisonsVues = new Set();
  return soiree;
}

export function majReglages(soiree, { duree, categories }) {
  if (duree !== undefined) noyau.majDuree(soiree, duree);
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
  const joueur = noyau.marquer(soiree, { joueurId, points, trouvee });
  noyau.cloreManche(soiree, [joueur]);
  return joueur;
}

export function reinitialiserScores(soiree) {
  noyau.reinitialiserScores(soiree);
  soiree.combinaisonsVues.clear();
  return soiree;
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

export const instantane = (soiree) => ({
  ...noyau.instantaneNoyau(soiree),
  g: soiree.reglages.categories,
  p: soiree.cartesPerso.personnages.map((c) => c.texte),
  a: soiree.cartesPerso.actions.map((c) => c.texte)
});

export function depuisInstantane(donnees) {
  const soiree = creerSoiree();
  noyau.appliquerInstantaneNoyau(soiree, donnees);

  if (Array.isArray(donnees.g) && donnees.g.length && donnees.g.every((c) => parCategorie.has(c))) {
    soiree.reglages.categories = [...new Set(donnees.g)];
  }
  for (const [categorie, cle] of [['personnages', 'p'], ['actions', 'a']]) {
    for (const texte of Array.isArray(donnees[cle]) ? donnees[cle].slice(0, REGLES.maxCartesPerso) : []) {
      try {
        ajouterCarte(soiree, categorie, String(texte ?? ''));
      } catch {
        // On garde ce qui est exploitable.
      }
    }
  }
  return soiree;
}
