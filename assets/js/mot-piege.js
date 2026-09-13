// « Le mot piégé » — tout le monde reçoit le même mot, sauf un.
//
// Le téléphone circule : chacun découvre son mot en privé. Puis on discute à
// voix haute, chacun lâchant un indice sur son mot, et le groupe vote pour
// démasquer l'intrus — qui, lui, ignore jusqu'au bout qu'il l'est.
import * as noyau from './noyau.js';
import { ErreurSoiree, auHasard, melanger } from './noyau.js';
import { PAIRES, PAQUET_MOTS } from './mots-pieges.js';

export { ErreurSoiree, PAQUET_MOTS };
export const { genererCode, ajouterJoueur, retirerJoueur, classement, prochainJoueur, REGLES } = noyau;

export const MIN_JOUEURS = 4;
export const POINTS_GROUPE = 2; // par joueur, quand l'intrus est démasqué
export const POINTS_INTRUS = 4; // pour l'intrus, quand il passe inaperçu

export function creerSoiree(options = {}) {
  const soiree = noyau.creerSoiree({ ...options, minJoueurs: MIN_JOUEURS });
  soiree.manche = null;
  return soiree;
}

export const majReglages = (soiree, { duree }) =>
  duree === undefined ? soiree : noyau.majDuree(soiree, duree);

/**
 * Distribue une manche : une paire de mots, un intrus tiré au sort, et l'ordre
 * dans lequel le téléphone passera. La manche vit dans la page, jamais dans le
 * lien : personne ne peut retrouver l'intrus en lisant l'URL.
 */
export function distribuer(soiree) {
  if (soiree.joueurs.length < MIN_JOUEURS) {
    throw new ErreurSoiree(`Il faut au moins ${MIN_JOUEURS} joueurs pour cette manche.`);
  }
  const [motGroupe, motIntrus] = melanger(auHasard(PAIRES));
  const ordre = melanger(soiree.joueurs).map((j) => j.id);
  const intrusId = auHasard(ordre);

  soiree.manche = {
    motGroupe,
    motIntrus,
    intrusId,
    ordre,
    position: 0,
    close: false
  };
  return soiree.manche;
}

/** Le mot que doit voir le joueur dont c'est le tour de regarder. */
export function motPour(soiree, joueurId) {
  const manche = soiree.manche;
  if (!manche) throw new ErreurSoiree('Aucune manche en cours.');
  return joueurId === manche.intrusId ? manche.motIntrus : manche.motGroupe;
}

export function joueurCourant(soiree) {
  const manche = soiree.manche;
  if (!manche || manche.position >= manche.ordre.length) return null;
  return soiree.joueurs.find((j) => j.id === manche.ordre[manche.position]) ?? null;
}

export function passerAuSuivant(soiree) {
  if (!soiree.manche) throw new ErreurSoiree('Aucune manche en cours.');
  soiree.manche.position += 1;
  return joueurCourant(soiree);
}

export const distributionTerminee = (soiree) =>
  Boolean(soiree.manche) && soiree.manche.position >= soiree.manche.ordre.length;

/**
 * Le groupe a voté : on compte les points et on révèle tout.
 * `suspectId` vaut null quand le groupe renonce à désigner quelqu'un.
 */
export function voter(soiree, suspectId) {
  const manche = soiree.manche;
  if (!manche) throw new ErreurSoiree('Aucune manche en cours.');
  if (manche.close) throw new ErreurSoiree('Cette manche est déjà terminée.');
  if (suspectId !== null && !soiree.joueurs.some((j) => j.id === suspectId)) {
    throw new ErreurSoiree('Joueur introuvable.');
  }

  const demasque = suspectId === manche.intrusId;
  const intrus = soiree.joueurs.find((j) => j.id === manche.intrusId);

  if (demasque) {
    for (const joueur of soiree.joueurs) {
      if (joueur.id === manche.intrusId) continue;
      noyau.marquer(soiree, { joueurId: joueur.id, points: POINTS_GROUPE, trouvee: true });
    }
  } else if (intrus) {
    noyau.marquer(soiree, { joueurId: intrus.id, points: POINTS_INTRUS, trouvee: true });
  }

  noyau.cloreManche(soiree, soiree.joueurs);
  manche.close = true;

  return {
    demasque,
    intrus,
    suspect: soiree.joueurs.find((j) => j.id === suspectId) ?? null,
    motGroupe: manche.motGroupe,
    motIntrus: manche.motIntrus
  };
}

export function reinitialiserScores(soiree) {
  noyau.reinitialiserScores(soiree);
  soiree.manche = null;
  return soiree;
}

// La manche en cours ne voyage jamais : le lien ne doit pas trahir l'intrus.
export const instantane = (soiree) => noyau.instantaneNoyau(soiree);

export function depuisInstantane(donnees) {
  const soiree = creerSoiree();
  noyau.appliquerInstantaneNoyau(soiree, donnees);
  return soiree;
}
