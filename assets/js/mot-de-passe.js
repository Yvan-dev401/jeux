// « Mot de passe » — à deux, un mot à faire deviner sans jamais le prononcer.
//
// Les joueurs sont rangés par binômes : ce sont simplement les paires
// consécutives de la liste des joueurs. Les garder dans cet ordre évite un
// champ supplémentaire, et le lien de la soirée transporte donc les binômes
// sans rien de plus que l'ordre des joueurs.
import * as noyau from './noyau.js';
import { ErreurSoiree, melanger } from './noyau.js';
import { MOTS, PAQUET_MOTS_DE_PASSE } from './mots-de-passe.js';

export { ErreurSoiree, PAQUET_MOTS_DE_PASSE };
export const { genererCode, ajouterJoueur, retirerJoueur, classement, REGLES } = noyau;

export const MIN_JOUEURS = 2;

export function creerSoiree(options = {}) {
  const soiree = noyau.creerSoiree({ ...options, minJoueurs: MIN_JOUEURS });
  soiree.pioche = [];
  return soiree;
}

export const majReglages = (soiree, { duree }) =>
  duree === undefined ? soiree : noyau.majDuree(soiree, duree);

/**
 * Les binômes, et le joueur qui reste seul quand ils sont en nombre impair.
 * Celui-là ne joue pas la manche : il attend qu'on mélange.
 */
export function binomes(soiree) {
  const paires = [];
  for (let i = 0; i + 1 < soiree.joueurs.length; i += 2) {
    paires.push([soiree.joueurs[i], soiree.joueurs[i + 1]]);
  }
  const seul = soiree.joueurs.length % 2 === 1 ? soiree.joueurs.at(-1) : null;
  return { paires, seul };
}

export function melangerBinomes(soiree) {
  soiree.joueurs = melanger(soiree.joueurs);
  return binomes(soiree);
}

/** Score d'un binôme : les deux coéquipiers marquent ensemble, pas chacun. */
export const scoreBinome = (paire) => paire[0]?.score ?? 0;

/** Le binôme qui a le moins joué prend la main. */
export function prochainBinome(soiree) {
  const { paires } = binomes(soiree);
  if (!paires.length) return null;
  return [...paires].sort(
    (a, b) => a[0].manchesJouees + a[1].manchesJouees - (b[0].manchesJouees + b[1].manchesJouees)
  )[0];
}

/** Dans le binôme, celui qui a le moins souvent donné les indices s'y colle. */
export function donneurDe(paire) {
  const [a, b] = paire;
  return (a.donnees ?? 0) <= (b.donnees ?? 0) ? a : b;
}

/** Une pile de mots mélangés, sans répétition tant que la pioche tient. */
export function tirerMots(soiree, nombre = 30) {
  if (soiree.pioche.length < nombre) soiree.pioche = melanger(MOTS);
  return soiree.pioche.splice(0, Math.max(1, nombre));
}

/**
 * Clôt la manche d'un binôme. Les deux coéquipiers reçoivent le même total :
 * le classement individuel montre donc le score du binôme, pas une part de
 * celui-ci.
 */
export function enregistrerManche(soiree, { donneurId, devineurId, points, trouves }) {
  const donneur = soiree.joueurs.find((j) => j.id === donneurId);
  const devineur = soiree.joueurs.find((j) => j.id === devineurId);
  if (!donneur || !devineur) throw new ErreurSoiree('Binôme introuvable.');
  if (donneur === devineur) throw new ErreurSoiree('Un binôme, c’est deux joueurs différents.');

  const nombre = Number(trouves);
  if (!Number.isInteger(nombre) || nombre < 0) throw new ErreurSoiree('Décompte de mots invalide.');

  for (const joueur of [donneur, devineur]) {
    noyau.marquer(soiree, { joueurId: joueur.id, points });
    joueur.trouvees += nombre;
  }
  donneur.donnees = (donneur.donnees ?? 0) + 1;
  noyau.cloreManche(soiree, [donneur, devineur]);
  return { donneur, devineur };
}

export function reinitialiserScores(soiree) {
  noyau.reinitialiserScores(soiree);
  for (const joueur of soiree.joueurs) joueur.donnees = 0;
  soiree.pioche = [];
  return soiree;
}

export const instantane = (soiree) => ({
  ...noyau.instantaneNoyau(soiree),
  d: soiree.joueurs.map((j) => j.donnees ?? 0)
});

export function depuisInstantane(donnees) {
  const soiree = creerSoiree();
  noyau.appliquerInstantaneNoyau(soiree, donnees);
  const donnes = Array.isArray(donnees.d) ? donnees.d : [];
  soiree.joueurs.forEach((joueur, i) => {
    joueur.donnees = Number.isInteger(donnes[i]) && donnes[i] >= 0 ? donnes[i] : 0;
  });
  return soiree;
}
