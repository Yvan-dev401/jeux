// « Qui a dit ça ? » — chacun répond, un meneur devine qui a écrit quoi.
//
// Le téléphone circule pour la collecte : chacun tape sa réponse sans que les
// autres la voient. Puis les réponses sont mélangées et le meneur tente de les
// rendre à leurs auteurs. Rester méconnaissable rapporte autant que deviner.
import * as noyau from './noyau.js';
import { ErreurSoiree, auHasard, melanger, nettoyerTexte } from './noyau.js';
import { QUESTIONS, PAQUET_QUESTIONS } from './questions.js';

export { ErreurSoiree, PAQUET_QUESTIONS };
export const { genererCode, ajouterJoueur, retirerJoueur, classement, prochainJoueur, REGLES } = noyau;

export const MIN_JOUEURS = 3;
export const MAX_LONGUEUR_REPONSE = 90;
export const POINTS_BONNE_ATTRIBUTION = 1; // pour le meneur
export const POINTS_NON_DEMASQUE = 1; // pour l'auteur resté anonyme

export function creerSoiree(options = {}) {
  const soiree = noyau.creerSoiree({ ...options, minJoueurs: MIN_JOUEURS });
  soiree.manche = null;
  soiree.questionsVues = new Set();
  return soiree;
}

export const majReglages = (soiree, { duree }) =>
  duree === undefined ? soiree : noyau.majDuree(soiree, duree);

/** Le meneur tourne : celui qui a mené le moins souvent prend la main. */
export function prochainMeneur(soiree) {
  return [...soiree.joueurs].sort((a, b) => (a.menees ?? 0) - (b.menees ?? 0))[0] ?? null;
}

export function demarrerManche(soiree, meneurId) {
  if (soiree.joueurs.length < MIN_JOUEURS) {
    throw new ErreurSoiree(`Il faut au moins ${MIN_JOUEURS} joueurs pour cette manche.`);
  }
  const meneur = soiree.joueurs.find((j) => j.id === meneurId);
  if (!meneur) throw new ErreurSoiree('Joueur introuvable.');

  if (soiree.questionsVues.size >= QUESTIONS.length) soiree.questionsVues.clear();
  let question;
  do {
    question = auHasard(QUESTIONS);
  } while (soiree.questionsVues.has(question));
  soiree.questionsVues.add(question);

  soiree.manche = {
    question,
    meneurId,
    // Tout le monde répond, sauf le meneur : c'est lui qui devra deviner.
    ordre: soiree.joueurs.filter((j) => j.id !== meneurId).map((j) => j.id),
    position: 0,
    reponses: [],
    close: false
  };
  return soiree.manche;
}

export const auteurCourant = (soiree) => {
  const m = soiree.manche;
  if (!m || m.position >= m.ordre.length) return null;
  return soiree.joueurs.find((j) => j.id === m.ordre[m.position]) ?? null;
};

export function repondre(soiree, texte) {
  const manche = soiree.manche;
  const auteur = auteurCourant(soiree);
  if (!manche || !auteur) throw new ErreurSoiree('Plus personne n’a à répondre.');
  const propre = nettoyerTexte(texte, MAX_LONGUEUR_REPONSE, 'La réponse');
  manche.reponses.push({ id: noyau.identifiant(), auteurId: auteur.id, texte: propre });
  manche.position += 1;
  return auteurCourant(soiree);
}

export const collecteTerminee = (soiree) =>
  Boolean(soiree.manche) && soiree.manche.position >= soiree.manche.ordre.length;

/** Les réponses présentées au meneur, dans un ordre qui ne trahit personne. */
export const reponsesMelangees = (soiree) => melanger(soiree.manche?.reponses ?? []);

/**
 * Le meneur a rendu son verdict : `attributions` associe l'identifiant d'une
 * réponse à l'identifiant du joueur qu'il soupçonne.
 */
export function attribuer(soiree, attributions) {
  const manche = soiree.manche;
  if (!manche) throw new ErreurSoiree('Aucune manche en cours.');
  if (manche.close) throw new ErreurSoiree('Cette manche est déjà terminée.');

  const resultats = manche.reponses.map((reponse) => {
    const suppose = attributions?.[reponse.id] ?? null;
    return {
      reponse,
      auteur: soiree.joueurs.find((j) => j.id === reponse.auteurId) ?? null,
      suppose: soiree.joueurs.find((j) => j.id === suppose) ?? null,
      juste: suppose === reponse.auteurId
    };
  });

  const justes = resultats.filter((r) => r.juste).length;
  if (justes > 0) {
    noyau.marquer(soiree, {
      joueurId: manche.meneurId,
      points: justes * POINTS_BONNE_ATTRIBUTION,
      trouvee: true
    });
  }
  for (const resultat of resultats) {
    if (resultat.juste || !resultat.auteur) continue;
    noyau.marquer(soiree, { joueurId: resultat.auteur.id, points: POINTS_NON_DEMASQUE });
  }

  const meneur = soiree.joueurs.find((j) => j.id === manche.meneurId);
  if (meneur) meneur.menees = (meneur.menees ?? 0) + 1;
  noyau.cloreManche(soiree, soiree.joueurs);
  manche.close = true;

  return { resultats, justes, total: resultats.length, meneur };
}

export function reinitialiserScores(soiree) {
  noyau.reinitialiserScores(soiree);
  for (const joueur of soiree.joueurs) joueur.menees = 0;
  soiree.manche = null;
  soiree.questionsVues.clear();
  return soiree;
}

// Ni la question, ni les réponses ne voyagent : le lien ne porte que la soirée.
export const instantane = (soiree) => ({
  ...noyau.instantaneNoyau(soiree),
  l: soiree.joueurs.map((j) => j.menees ?? 0)
});

export function depuisInstantane(donnees) {
  const soiree = creerSoiree();
  noyau.appliquerInstantaneNoyau(soiree, donnees);
  const menees = Array.isArray(donnees.l) ? donnees.l : [];
  soiree.joueurs.forEach((joueur, i) => {
    joueur.menees = Number.isInteger(menees[i]) && menees[i] >= 0 ? menees[i] : 0;
  });
  return soiree;
}
