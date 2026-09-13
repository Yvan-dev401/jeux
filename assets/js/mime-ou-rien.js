// « Mime ou rien » — deux équipes, un mimeur, un chrono.
//
// Le mimeur enchaîne les mimes devant son équipe : chaque mime deviné rapporte
// des points à son équipe, d'autant plus qu'il était corsé.
import * as noyau from './noyau.js';
import { ErreurSoiree, melanger } from './noyau.js';
import { MIMES, NIVEAUX, PAQUET_MIMES } from './mimes.js';

export { ErreurSoiree, PAQUET_MIMES, NIVEAUX };
export const { genererCode, retirerJoueur, classement, prochainJoueur, REGLES } = noyau;

export const EQUIPES = [
  { id: 'a', libelle: 'Équipe A' },
  { id: 'b', libelle: 'Équipe B' }
];

const tousLesMimes = () =>
  NIVEAUX.flatMap((n) => MIMES[n.id].map((texte) => ({ texte, niveau: n.id, points: n.points })));

export function creerSoiree(options = {}) {
  const soiree = noyau.creerSoiree({ ...options, minJoueurs: 4 });
  soiree.pioche = [];
  return soiree;
}

/** Les joueurs rejoignent les équipes en alternance : les forces s'équilibrent. */
export function ajouterJoueur(soiree, nom) {
  const joueur = noyau.ajouterJoueur(soiree, nom);
  const compteA = soiree.joueurs.filter((j) => j.equipe === 'a').length;
  const compteB = soiree.joueurs.filter((j) => j.equipe === 'b').length;
  joueur.equipe = compteA <= compteB ? 'a' : 'b';
  return joueur;
}

export function changerEquipe(soiree, joueurId) {
  const joueur = soiree.joueurs.find((j) => j.id === joueurId);
  if (!joueur) throw new ErreurSoiree('Joueur introuvable.');
  joueur.equipe = joueur.equipe === 'a' ? 'b' : 'a';
  return joueur;
}

export const majReglages = (soiree, { duree }) =>
  duree === undefined ? soiree : noyau.majDuree(soiree, duree);

export const equipeDe = (soiree, id) => soiree.joueurs.filter((j) => j.equipe === id);

export const scoreEquipe = (soiree, id) =>
  equipeDe(soiree, id).reduce((total, j) => total + j.score, 0);

/** Équipes assez fournies pour que quelqu'un devine ce que le mimeur montre. */
export function equipesPretes(soiree) {
  return EQUIPES.every((e) => equipeDe(soiree, e.id).length >= 2);
}

/** Le prochain mimeur : l'équipe qui a le moins joué, puis le joueur le moins sollicité. */
export function prochainMimeur(soiree) {
  const manchesDe = (id) => equipeDe(soiree, id).reduce((t, j) => t + j.manchesJouees, 0);
  const equipe = manchesDe('a') <= manchesDe('b') ? 'a' : 'b';
  return [...equipeDe(soiree, equipe)].sort((a, b) => a.manchesJouees - b.manchesJouees)[0] ?? null;
}

/** Une pile de mimes mélangés, sans répétition tant que la pioche tient. */
export function tirerMimes(soiree, nombre = 30) {
  if (soiree.pioche.length < nombre) {
    soiree.pioche = melanger(tousLesMimes());
  }
  return soiree.pioche.splice(0, Math.max(1, nombre));
}

export function enregistrerManche(soiree, { joueurId, points, trouvees }) {
  const joueur = noyau.marquer(soiree, { joueurId, points });
  const nombre = Number(trouvees);
  if (!Number.isInteger(nombre) || nombre < 0) throw new ErreurSoiree('Décompte de mimes invalide.');
  joueur.trouvees += nombre;
  noyau.cloreManche(soiree, [joueur]);
  return joueur;
}

export function reinitialiserScores(soiree) {
  noyau.reinitialiserScores(soiree);
  soiree.pioche = [];
  return soiree;
}

export const instantane = (soiree) => ({
  ...noyau.instantaneNoyau(soiree),
  e: soiree.joueurs.map((j) => j.equipe)
});

export function depuisInstantane(donnees) {
  const soiree = creerSoiree();
  noyau.appliquerInstantaneNoyau(soiree, donnees);
  const equipes = Array.isArray(donnees.e) ? donnees.e : [];
  soiree.joueurs.forEach((joueur, i) => {
    joueur.equipe = equipes[i] === 'a' || equipes[i] === 'b' ? equipes[i] : joueur.equipe ?? 'a';
  });
  return soiree;
}
