// Stockage des soirées : 100 % en mémoire vive.
//
// Aucune donnée d'une partie (joueurs, scores, cartes ajoutées, tirages) n'est
// écrite sur disque ni envoyée à une base de données. Une soirée vit dans cette
// Map, puis disparaît : soit parce que l'hôte clôture la soirée, soit parce
// qu'elle est restée inactive plus de CONFIG.sessionTtlMs, soit parce que le
// serveur redémarre.
import { randomUUID } from 'node:crypto';
import { CONFIG } from './config.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1
const soirees = new Map();

export class ErreurSoiree extends Error {
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}

const maintenant = () => Date.now();

function genererCode() {
  for (let essai = 0; essai < 50; essai += 1) {
    let code = '';
    for (let i = 0; i < 5; i += 1) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    if (!soirees.has(code)) return code;
  }
  throw new ErreurSoiree(503, 'Impossible de générer un code de soirée, réessaie.');
}

function nettoyerTexte(valeur, maxLongueur, champ) {
  if (typeof valeur !== 'string') throw new ErreurSoiree(400, `${champ} est requis.`);
  const propre = valeur.replace(/\s+/g, ' ').trim();
  if (!propre) throw new ErreurSoiree(400, `${champ} ne peut pas être vide.`);
  if (propre.length > maxLongueur) {
    throw new ErreurSoiree(400, `${champ} est limité à ${maxLongueur} caractères.`);
  }
  return propre;
}

export function purger(limite = maintenant()) {
  let supprimees = 0;
  for (const [code, soiree] of soirees) {
    if (limite - soiree.vueLe > CONFIG.sessionTtlMs) {
      soirees.delete(code);
      supprimees += 1;
    }
  }
  return supprimees;
}

export function creerSoiree({ nom } = {}) {
  purger();
  if (soirees.size >= CONFIG.maxSessions) {
    throw new ErreurSoiree(503, 'Trop de soirées en cours, réessaie dans quelques minutes.');
  }
  const code = genererCode();
  const soiree = {
    code,
    nom: nom ? nettoyerTexte(nom, CONFIG.maxLongueurNom, 'Le nom de la soirée') : 'Soirée',
    creeLe: maintenant(),
    vueLe: maintenant(),
    revision: 1,
    reglages: {
      duree: CONFIG.dureeChronoDefaut,
      categories: ['personnages', 'actions']
    },
    joueurs: [],
    cartesPerso: { personnages: [], actions: [] },
    combinaisonsVues: new Set(),
    manches: 0
  };
  soirees.set(code, soiree);
  return soiree;
}

export function lireSoiree(code) {
  if (typeof code !== 'string') throw new ErreurSoiree(400, 'Code de soirée invalide.');
  const soiree = soirees.get(code.trim().toUpperCase());
  if (!soiree) throw new ErreurSoiree(404, "Cette soirée n'existe plus. Crée-en une nouvelle.");
  if (maintenant() - soiree.vueLe > CONFIG.sessionTtlMs) {
    soirees.delete(soiree.code);
    throw new ErreurSoiree(404, "Cette soirée a expiré. Crée-en une nouvelle.");
  }
  soiree.vueLe = maintenant();
  return soiree;
}

export function supprimerSoiree(code) {
  const soiree = lireSoiree(code);
  soiree.combinaisonsVues.clear();
  soiree.joueurs.length = 0;
  soiree.cartesPerso.personnages.length = 0;
  soiree.cartesPerso.actions.length = 0;
  return soirees.delete(soiree.code);
}

export function ajouterJoueur(code, nom) {
  const soiree = lireSoiree(code);
  if (soiree.joueurs.length >= CONFIG.maxJoueurs) {
    throw new ErreurSoiree(400, `La soirée est complète (${CONFIG.maxJoueurs} joueurs maximum).`);
  }
  const propre = nettoyerTexte(nom, CONFIG.maxLongueurNom, 'Le prénom');
  if (soiree.joueurs.some((j) => j.nom.toLowerCase() === propre.toLowerCase())) {
    throw new ErreurSoiree(409, 'Ce prénom est déjà pris dans la soirée.');
  }
  const joueur = { id: randomUUID(), nom: propre, score: 0, manchesJouees: 0 };
  soiree.joueurs.push(joueur);
  soiree.revision += 1;
  return { soiree, joueur };
}

export function retirerJoueur(code, joueurId) {
  const soiree = lireSoiree(code);
  const index = soiree.joueurs.findIndex((j) => j.id === joueurId);
  if (index === -1) throw new ErreurSoiree(404, 'Joueur introuvable.');
  soiree.joueurs.splice(index, 1);
  soiree.revision += 1;
  return soiree;
}

export function majReglages(code, { duree, categories }) {
  const soiree = lireSoiree(code);
  if (duree !== undefined) {
    const valeur = Number(duree);
    if (!CONFIG.dureesChrono.includes(valeur)) {
      throw new ErreurSoiree(400, `Durée invalide. Choix possibles : ${CONFIG.dureesChrono.join(', ')} s.`);
    }
    soiree.reglages.duree = valeur;
  }
  if (categories !== undefined) {
    if (!Array.isArray(categories) || categories.length === 0) {
      throw new ErreurSoiree(400, 'Choisis au moins une catégorie.');
    }
    const valides = categories.filter((c) => c === 'personnages' || c === 'actions');
    if (valides.length !== categories.length) throw new ErreurSoiree(400, 'Catégorie inconnue.');
    soiree.reglages.categories = [...new Set(valides)];
  }
  soiree.revision += 1;
  return soiree;
}

export function ajouterCarte(code, categorie, texte) {
  const soiree = lireSoiree(code);
  if (categorie !== 'personnages' && categorie !== 'actions') {
    throw new ErreurSoiree(400, 'Catégorie inconnue.');
  }
  const liste = soiree.cartesPerso[categorie];
  if (liste.length >= CONFIG.maxCartesPerso) {
    throw new ErreurSoiree(400, `Maximum ${CONFIG.maxCartesPerso} cartes ajoutées par catégorie.`);
  }
  const propre = nettoyerTexte(texte, CONFIG.maxLongueurCarte, 'La carte');
  if (liste.some((c) => c.texte.toLowerCase() === propre.toLowerCase())) {
    throw new ErreurSoiree(409, 'Cette carte existe déjà dans la soirée.');
  }
  const carte = { id: randomUUID(), texte: propre };
  liste.push(carte);
  soiree.revision += 1;
  return { soiree, carte };
}

export function retirerCarte(code, categorie, carteId) {
  const soiree = lireSoiree(code);
  const liste = soiree.cartesPerso[categorie];
  if (!liste) throw new ErreurSoiree(400, 'Catégorie inconnue.');
  const index = liste.findIndex((c) => c.id === carteId);
  if (index === -1) throw new ErreurSoiree(404, 'Carte introuvable.');
  liste.splice(index, 1);
  soiree.revision += 1;
  return soiree;
}

export function enregistrerManche(code, { joueurId, trouvees, passees }) {
  const soiree = lireSoiree(code);
  const joueur = soiree.joueurs.find((j) => j.id === joueurId);
  if (!joueur) throw new ErreurSoiree(404, 'Joueur introuvable.');
  const points = Number(trouvees);
  const sautees = Number(passees ?? 0);
  if (!Number.isInteger(points) || points < 0 || points > CONFIG.maxTirage) {
    throw new ErreurSoiree(400, 'Score de manche invalide.');
  }
  if (!Number.isInteger(sautees) || sautees < 0 || sautees > CONFIG.maxTirage) {
    throw new ErreurSoiree(400, 'Nombre de cartes passées invalide.');
  }
  joueur.score += points;
  joueur.manchesJouees += 1;
  soiree.manches += 1;
  soiree.revision += 1;
  return { soiree, joueur };
}

export function reinitialiserScores(code) {
  const soiree = lireSoiree(code);
  for (const joueur of soiree.joueurs) {
    joueur.score = 0;
    joueur.manchesJouees = 0;
  }
  soiree.manches = 0;
  soiree.combinaisonsVues.clear();
  soiree.revision += 1;
  return soiree;
}

// Vue publique : uniquement ce dont les écrans ont besoin.
export function vueSoiree(soiree) {
  return {
    code: soiree.code,
    nom: soiree.nom,
    revision: soiree.revision,
    expireDans: Math.max(0, CONFIG.sessionTtlMs - (maintenant() - soiree.vueLe)),
    reglages: soiree.reglages,
    manches: soiree.manches,
    joueurs: soiree.joueurs.map((j) => ({
      id: j.id,
      nom: j.nom,
      score: j.score,
      manchesJouees: j.manchesJouees
    })),
    cartesPerso: {
      personnages: soiree.cartesPerso.personnages.map((c) => ({ id: c.id, texte: c.texte })),
      actions: soiree.cartesPerso.actions.map((c) => ({ id: c.id, texte: c.texte }))
    }
  };
}

export const statistiques = () => ({
  soireesEnCours: soirees.size,
  persistance: 'aucune'
});

// Exposé pour les tests : vide complètement la mémoire.
export function toutEffacer() {
  soirees.clear();
}
