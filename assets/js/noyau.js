// Noyau commun à tous les jeux du catalogue.
//
// Une soirée, c'est toujours la même chose : un code, des joueurs, des scores,
// des manches, des réglages, et un instantané encodé dans le fragment de l'URL.
// Ce qui change d'un jeu à l'autre — le paquet, la mécanique d'une manche — vit
// dans le module du jeu, qui s'appuie sur celui-ci.
//
// Rien n'est stocké : ni serveur, ni base de données, ni stockage navigateur.

export const REGLES = {
  minJoueurs: 2,
  maxJoueurs: 12,
  maxLongueurNom: 24,
  maxLongueurTexte: 80,
  dureesChrono: [30, 60, 90, 120, 180],
  dureeChronoDefaut: 60,
  pointsMax: 180
};

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1

export class ErreurSoiree extends Error {
  constructor(message) {
    super(message);
    this.nom = 'ErreurSoiree';
  }
}

export function identifiant() {
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

export function nettoyerTexte(valeur, maxLongueur, champ) {
  if (typeof valeur !== 'string') throw new ErreurSoiree(`${champ} est requis.`);
  const propre = valeur.replace(/\s+/g, ' ').trim();
  if (!propre) throw new ErreurSoiree(`${champ} ne peut pas être vide.`);
  if (propre.length > maxLongueur) {
    throw new ErreurSoiree(`${champ} est limité à ${maxLongueur} caractères.`);
  }
  return propre;
}

/** Tire un élément au hasard dans une liste. */
export const auHasard = (liste) => liste[Math.floor(Math.random() * liste.length)];

/** Mélange une copie de la liste (Fisher-Yates). */
export function melanger(liste) {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/* ------------------------------------------------------------------ */
/* La soirée                                                           */
/* ------------------------------------------------------------------ */

export function creerSoiree({ nom, minJoueurs = REGLES.minJoueurs } = {}) {
  return {
    code: genererCode(),
    nom: nom ? nettoyerTexte(nom, REGLES.maxLongueurNom, 'Le nom de la soirée') : 'Soirée',
    minJoueurs,
    reglages: { duree: REGLES.dureeChronoDefaut },
    joueurs: [],
    manches: 0
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

export function majDuree(soiree, duree) {
  const valeur = Number(duree);
  if (!REGLES.dureesChrono.includes(valeur)) {
    throw new ErreurSoiree(`Durée invalide. Choix possibles : ${REGLES.dureesChrono.join(', ')} s.`);
  }
  soiree.reglages.duree = valeur;
  return soiree;
}

/** Ajoute des points à un joueur et clôt une manche. */
export function marquer(soiree, { joueurId, points = 0, trouvee = false }) {
  const joueur = soiree.joueurs.find((j) => j.id === joueurId);
  if (!joueur) throw new ErreurSoiree('Joueur introuvable.');
  const valeur = Number(points);
  if (!Number.isInteger(valeur) || valeur < 0 || valeur > REGLES.pointsMax) {
    throw new ErreurSoiree('Score de manche invalide.');
  }
  joueur.score += valeur;
  if (trouvee) joueur.trouvees += 1;
  return joueur;
}

/** Comptabilise la manche elle-même, une fois tous les points attribués. */
export function cloreManche(soiree, joueursDuTour = []) {
  for (const joueur of joueursDuTour) joueur.manchesJouees += 1;
  soiree.manches += 1;
  return soiree;
}

export function reinitialiserScores(soiree) {
  for (const joueur of soiree.joueurs) {
    joueur.score = 0;
    joueur.manchesJouees = 0;
    joueur.trouvees = 0;
  }
  soiree.manches = 0;
  return soiree;
}

export const classement = (soiree) =>
  [...soiree.joueurs].sort((a, b) => b.score - a.score || a.nom.localeCompare(b.nom, 'fr'));

export const prochainJoueur = (soiree) =>
  [...soiree.joueurs].sort((a, b) => a.manchesJouees - b.manchesJouees)[0] ?? null;

/* ------------------------------------------------------------------ */
/* Instantané : la part commune à tous les jeux                        */
/* ------------------------------------------------------------------ */

export const instantaneNoyau = (soiree) => ({
  v: 1,
  c: soiree.code,
  n: soiree.nom,
  d: soiree.reglages.duree,
  m: soiree.manches,
  j: soiree.joueurs.map((x) => [x.nom, x.score, x.manchesJouees, x.trouvees])
});

export function appliquerInstantaneNoyau(soiree, donnees) {
  if (!donnees || typeof donnees !== 'object' || donnees.v !== 1) {
    throw new ErreurSoiree('Ce lien de soirée est illisible.');
  }
  soiree.code = /^[A-Z0-9]{3,8}$/.test(donnees.c ?? '') ? donnees.c : genererCode();
  soiree.nom =
    typeof donnees.n === 'string' && donnees.n.trim()
      ? donnees.n.slice(0, REGLES.maxLongueurNom)
      : 'Soirée';
  soiree.manches = Number.isInteger(donnees.m) && donnees.m >= 0 ? donnees.m : 0;
  if (REGLES.dureesChrono.includes(Number(donnees.d))) soiree.reglages.duree = Number(donnees.d);

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
  return soiree;
}

/* ------------------------------------------------------------------ */
/* Le lien : la soirée voyage dans le fragment de l'URL                */
/* ------------------------------------------------------------------ */

export const LONGUEUR_CONFORTABLE = 4000;
export const LONGUEUR_MAX = 16000;

function versBase64Url(texte) {
  const octets = new TextEncoder().encode(texte);
  let binaire = '';
  for (const octet of octets) binaire += String.fromCharCode(octet);
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function depuisBase64Url(valeur) {
  const base64 = valeur.replace(/-/g, '+').replace(/_/g, '/');
  const complet = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return new TextDecoder().decode(Uint8Array.from(atob(complet), (c) => c.charCodeAt(0)));
}

/**
 * Fabrique les fonctions de lien d'un jeu à partir de ses deux sérialiseurs.
 * Un fragment d'URL n'est jamais transmis au serveur qui héberge la page : le
 * contenu d'une soirée reste sur les appareils qui ouvrent le lien.
 */
export function creerLien({ instantane, depuisInstantane }) {
  const versFragment = (soiree) => `s=${versBase64Url(JSON.stringify(instantane(soiree)))}`;

  const depuisFragment = (valeur) => {
    if (typeof valeur !== 'string') throw new ErreurSoiree('Ce lien de soirée est illisible.');
    const apresDiese = valeur.includes('#') ? valeur.slice(valeur.indexOf('#') + 1) : valeur;
    const nettoye = apresDiese.trim().replace(/^#/, '');
    const charge = nettoye.startsWith('s=') ? nettoye.slice(2) : nettoye;

    if (!charge || !/^[A-Za-z0-9\-_]+$/.test(charge)) {
      throw new ErreurSoiree('Ce lien de soirée est illisible.');
    }
    if (charge.length > LONGUEUR_MAX) {
      throw new ErreurSoiree('Ce lien de soirée est trop long pour être lu.');
    }
    let donnees;
    try {
      donnees = JSON.parse(depuisBase64Url(charge));
    } catch {
      throw new ErreurSoiree('Ce lien de soirée est illisible.');
    }
    return depuisInstantane(donnees);
  };

  const lienPartageable = (soiree) =>
    `${window.location.origin}${window.location.pathname}#${versFragment(soiree)}`;

  return { versFragment, depuisFragment, lienPartageable };
}
