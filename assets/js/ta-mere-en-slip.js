// « Ta mère en slip » — enchaînement des écrans et déroulé d'une manche.
//
// Site entièrement statique : aucune requête réseau, aucun stockage navigateur.
// La soirée vit dans la mémoire de la page et dans le fragment de l'URL, ce qui
// permet de recharger sans rien perdre et de transférer la partie par lien.
import {
  REGLES,
  PAQUET_DE_BASE,
  ErreurSoiree,
  creerSoiree as nouvelleSoiree,
  ajouterJoueur,
  retirerJoueur,
  majReglages,
  ajouterCarte,
  retirerCarte,
  enregistrerManche,
  reinitialiserScores,
  tirerCombinaisons,
  classement,
  prochainJoueur
} from './soiree.js';
import { versFragment, depuisFragment, lienPartageable, LONGUEUR_CONFORTABLE } from './lien.js';

const $ = (id) => document.getElementById(id);

const ecrans = {
  depart: $('ecran-depart'),
  salon: $('ecran-salon'),
  recap: $('ecran-recap'),
  tour: $('ecran-tour')
};

const etat = {
  soiree: null,
  categorieActive: 'personnages',
  manche: null
};

const CARTES_PAR_MANCHE = 40;

/* ------------------------------------------------------------------ */
/* Utilitaires d'affichage                                             */
/* ------------------------------------------------------------------ */

function montrerEcran(nom) {
  ecrans.depart.hidden = nom !== 'depart';
  ecrans.salon.hidden = nom !== 'salon';
  ecrans.recap.hidden = nom !== 'recap';
  ecrans.tour.hidden = nom !== 'tour';
  document.body.style.overflow = nom === 'tour' ? 'hidden' : '';
}

function afficherMessage(element, texte, duree = 0) {
  if (!element) return;
  element.textContent = texte;
  element.hidden = !texte;
  if (texte && duree > 0) {
    window.setTimeout(() => {
      if (element.textContent === texte) element.hidden = true;
    }, duree);
  }
}

function signalerErreur(erreur, contexte = 'salon') {
  const cible = contexte === 'depart' ? $('erreur-depart') : $('erreur-salon');
  const message = erreur instanceof ErreurSoiree ? erreur.message : 'Une erreur est survenue.';
  afficherMessage(cible, message, 6000);
}

const initiale = (nom) => nom.trim().charAt(0).toUpperCase() || '?';
const pluriel = (n, singulier, plurielMot = `${singulier}s`) => (n > 1 ? plurielMot : singulier);

/** L'URL suit la soirée, sans empiler d'entrées dans l'historique. */
function ecrireUrl() {
  if (!etat.soiree) return;
  window.history.replaceState(null, '', `#${versFragment(etat.soiree)}`);
}

/** Après chaque changement : on redessine et on met le lien à jour. */
function majSoiree() {
  rendreSalon();
  ecrireUrl();
}

/* ------------------------------------------------------------------ */
/* Chargement initial                                                  */
/* ------------------------------------------------------------------ */

function initialiser() {
  brancherEvenements();
  construireChoixDuree();

  $('compte-cartes').textContent = `${PAQUET_DE_BASE.total} cartes de base`;
  $('detail-paquet').textContent =
    `${PAQUET_DE_BASE.total} cartes (${PAQUET_DE_BASE.compte.personnages} personnages, ` +
    `${PAQUET_DE_BASE.compte.actions} actions)`;
  $('detail-combinaisons').textContent = PAQUET_DE_BASE.combinaisons.toLocaleString('fr-FR');

  const fragment = window.location.hash.slice(1);
  if (fragment) reprendre(fragment, { silencieux: true });
}

function construireChoixDuree() {
  const conteneur = $('choix-duree');
  conteneur.querySelectorAll('label').forEach((n) => n.remove());
  for (const duree of REGLES.dureesChrono) {
    const label = document.createElement('label');
    label.className = 'puce-radio';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'duree';
    input.value = String(duree);
    input.checked = duree === REGLES.dureeChronoDefaut;
    input.addEventListener('change', () => {
      try {
        majReglages(etat.soiree, { duree });
        majSoiree();
      } catch (erreur) {
        signalerErreur(erreur);
      }
    });
    const span = document.createElement('span');
    span.textContent = `${duree} s`;
    label.append(input, span);
    conteneur.append(label);
  }
}

/* ------------------------------------------------------------------ */
/* Ouvrir, reprendre, clôturer une soirée                              */
/* ------------------------------------------------------------------ */

function ouvrirSoiree(nom) {
  try {
    etat.soiree = nouvelleSoiree({ nom });
  } catch (erreur) {
    signalerErreur(erreur, 'depart');
    return;
  }
  majSoiree();
  montrerEcran('salon');
  afficherMessage($('info-salon'), 'Soirée ouverte. Ajoute les joueurs pour commencer !', 6000);
  $('champ-joueur').focus();
}

function reprendre(lien, { silencieux = false } = {}) {
  try {
    etat.soiree = depuisFragment(lien);
  } catch (erreur) {
    if (!silencieux) signalerErreur(erreur, 'depart');
    else afficherMessage($('erreur-depart'), 'Ce lien de soirée est illisible.', 6000);
    window.history.replaceState(null, '', window.location.pathname);
    montrerEcran('depart');
    return false;
  }
  majSoiree();
  montrerEcran('salon');
  return true;
}

function cloturerSoiree() {
  const message =
    'Clôturer la soirée ? Joueurs, scores et cartes ajoutées seront effacés immédiatement et définitivement.';
  if (!window.confirm(message)) return;
  etat.soiree = null;
  etat.manche = null;
  window.history.replaceState(null, '', window.location.pathname);
  montrerEcran('depart');
  afficherMessage($('erreur-depart'), '', 0);
  $('champ-lien').value = '';
}

async function transferer() {
  const lien = lienPartageable(etat.soiree);
  const tropLong = lien.length > LONGUEUR_CONFORTABLE;
  try {
    await navigator.clipboard.writeText(lien);
    afficherMessage(
      $('info-salon'),
      tropLong
        ? 'Lien copié. Il est long (beaucoup de cartes maison) : certaines applis de messagerie risquent de le couper.'
        : 'Lien de la soirée copié ! Ouvre-le sur l’autre téléphone pour y poursuivre la partie.',
      9000
    );
  } catch {
    afficherMessage($('info-salon'), `Copie impossible : le lien de la soirée est dans la barre d’adresse.`, 9000);
  }
}

/* ------------------------------------------------------------------ */
/* Rendu du salon                                                      */
/* ------------------------------------------------------------------ */

function rendreSalon() {
  const soiree = etat.soiree;
  if (!soiree) return;

  $('nom-soiree').textContent = soiree.nom;
  $('valeur-code').textContent = soiree.code;
  $('compteur-manches').textContent = `${soiree.manches} ${pluriel(soiree.manches, 'manche')}`;

  rendreJoueurs(soiree);
  rendreCartes(soiree);
  rendrePodium(soiree);

  const radio = document.querySelector(`#choix-duree input[value="${soiree.reglages.duree}"]`);
  if (radio) radio.checked = true;
}

function rendreJoueurs(soiree) {
  const liste = $('liste-joueurs');
  liste.textContent = '';

  for (const joueur of soiree.joueurs) {
    const li = document.createElement('li');
    li.className = 'joueur';

    const pastille = document.createElement('span');
    pastille.className = 'joueur__pastille';
    pastille.setAttribute('aria-hidden', 'true');
    pastille.textContent = initiale(joueur.nom);

    const nom = document.createElement('span');
    nom.className = 'joueur__nom';
    nom.textContent = joueur.nom;

    const score = document.createElement('span');
    score.className = 'joueur__score';
    score.textContent = `${joueur.score} ${pluriel(joueur.score, 'pt')}`;

    const retirer = document.createElement('button');
    retirer.type = 'button';
    retirer.className = 'icone-bouton';
    retirer.textContent = '✕';
    retirer.setAttribute('aria-label', `Retirer ${joueur.nom}`);
    retirer.addEventListener('click', () => {
      try {
        retirerJoueur(soiree, joueur.id);
        majSoiree();
      } catch (erreur) {
        signalerErreur(erreur);
      }
    });

    li.append(pastille, nom, score, retirer);
    liste.append(li);
  }

  $('compteur-joueurs').textContent = `${soiree.joueurs.length} / ${REGLES.maxJoueurs}`;
  $('note-joueurs').hidden = soiree.joueurs.length >= REGLES.minJoueurs;
  $('champ-joueur').disabled = soiree.joueurs.length >= REGLES.maxJoueurs;

  const select = $('choix-joueur');
  const choixPrecedent = select.value;
  select.textContent = '';
  for (const joueur of soiree.joueurs) {
    const option = document.createElement('option');
    option.value = joueur.id;
    option.textContent = `${joueur.nom} — ${joueur.score} ${pluriel(joueur.score, 'pt')}`;
    select.append(option);
  }
  if (soiree.joueurs.some((j) => j.id === choixPrecedent)) {
    select.value = choixPrecedent;
  } else {
    const suivant = prochainJoueur(soiree);
    if (suivant) select.value = suivant.id;
  }

  select.disabled = soiree.joueurs.length === 0;
  $('btn-lancer').disabled = soiree.joueurs.length < REGLES.minJoueurs;
}

function rendreCartes(soiree) {
  const categorie = etat.categorieActive;
  const cartes = soiree.cartesPerso[categorie] ?? [];
  const total = soiree.cartesPerso.personnages.length + soiree.cartesPerso.actions.length;

  $('compteur-cartes').textContent =
    total === 0
      ? 'aucune carte ajoutée'
      : `${total} ${pluriel(total, 'carte')} ${pluriel(total, 'ajoutée')}`;

  for (const onglet of document.querySelectorAll('.onglet')) {
    onglet.setAttribute('aria-selected', String(onglet.dataset.categorie === categorie));
  }

  $('champ-carte').placeholder =
    categorie === 'personnages' ? 'un pilote de rallye' : 'je répare un vélo';
  $('exemple-carte').textContent =
    categorie === 'personnages'
      ? 'Écris le personnage tel qu’il se lit après « Je suis ».'
      : 'Écris l’action à la première personne : « je danse la salsa ».';

  const liste = $('liste-cartes');
  liste.textContent = '';

  if (cartes.length === 0) {
    const vide = document.createElement('li');
    vide.className = 'liste-cartes__vide';
    vide.textContent =
      categorie === 'personnages'
        ? 'Aucun personnage ajouté pour l’instant.'
        : 'Aucune action ajoutée pour l’instant.';
    liste.append(vide);
  }

  for (const carte of cartes) {
    const li = document.createElement('li');
    li.className = 'carte-perso';
    const texte = document.createElement('span');
    texte.textContent = carte.texte;
    const supprimer = document.createElement('button');
    supprimer.type = 'button';
    supprimer.textContent = '✕';
    supprimer.setAttribute('aria-label', `Supprimer la carte ${carte.texte}`);
    supprimer.addEventListener('click', () => {
      try {
        retirerCarte(soiree, categorie, carte.id);
        majSoiree();
      } catch (erreur) {
        signalerErreur(erreur);
      }
    });
    li.append(texte, supprimer);
    liste.append(li);
  }
}

function rendrePodium(soiree) {
  const podium = $('podium');
  podium.textContent = '';

  if (soiree.joueurs.length === 0) {
    const vide = document.createElement('li');
    vide.className = 'podium__vide';
    vide.textContent = 'Le classement apparaîtra après la première manche.';
    podium.append(vide);
    return;
  }

  classement(soiree).forEach((joueur, index) => {
    const li = document.createElement('li');
    const rang = document.createElement('span');
    rang.className = 'podium__rang';
    rang.textContent = String(index + 1);
    const nom = document.createElement('span');
    nom.className = 'podium__nom';
    nom.textContent = joueur.nom;
    const points = document.createElement('span');
    points.className = 'podium__points';
    points.textContent = `${joueur.score} ${pluriel(joueur.score, 'pt')}`;
    li.append(rang, nom, points);
    podium.append(li);
  });
}

/* ------------------------------------------------------------------ */
/* Déroulé d'une manche                                                */
/* ------------------------------------------------------------------ */

async function lancerManche() {
  const soiree = etat.soiree;
  const joueur = soiree?.joueurs.find((j) => j.id === $('choix-joueur').value);
  if (!joueur) {
    afficherMessage($('erreur-salon'), 'Choisis le joueur qui prend le téléphone.', 5000);
    return;
  }

  let tirage;
  try {
    tirage = tirerCombinaisons(soiree, CARTES_PAR_MANCHE);
  } catch (erreur) {
    signalerErreur(erreur);
    return;
  }

  etat.manche = {
    joueur,
    duree: soiree.reglages.duree,
    tirage,
    index: 0,
    resultats: [],
    finLe: 0,
    intervalle: null,
    decompte: null,
    verrouillage: null,
    inclinaisonPropre: null,
    terminee: false
  };

  montrerEcran('tour');
  $('tour-joueur').textContent = joueur.nom;
  $('tour-chrono').textContent = String(soiree.reglages.duree);
  await garderEcranAllume();
  demarrerDecompte();
}

function demarrerDecompte() {
  const manche = etat.manche;
  $('ecran-tour').className = 'plein-ecran plein-ecran--pret';
  $('bloc-decompte').hidden = false;
  $('bloc-combinaison').hidden = true;
  $('bloc-verdict').hidden = true;
  $('bloc-actions-tour').hidden = true;
  $('decompte-consigne').textContent =
    `${manche.joueur.nom}, tiens le téléphone face aux autres, écran vers eux.`;

  let reste = 3;
  $('decompte-nombre').textContent = String(reste);
  manche.decompte = window.setInterval(() => {
    if (!etat.manche || etat.manche.terminee) {
      window.clearInterval(manche.decompte);
      return;
    }
    reste -= 1;
    if (reste <= 0) {
      window.clearInterval(manche.decompte);
      demarrerChrono();
      return;
    }
    $('decompte-nombre').textContent = String(reste);
    vibrer(40);
  }, 1000);
}

function demarrerChrono() {
  const manche = etat.manche;
  manche.finLe = Date.now() + manche.duree * 1000;

  $('bloc-decompte').hidden = true;
  $('bloc-combinaison').hidden = false;
  $('bloc-actions-tour').hidden = false;
  afficherCombinaison();
  activerInclinaison();

  manche.intervalle = window.setInterval(() => {
    const reste = Math.max(0, Math.ceil((manche.finLe - Date.now()) / 1000));
    const chrono = $('tour-chrono');
    chrono.textContent = String(reste);
    chrono.classList.toggle('chrono--urgent', reste <= 10);
    if (reste <= 0) terminerManche();
  }, 200);
}

function afficherCombinaison() {
  const manche = etat.manche;
  const carte = manche.tirage[manche.index];
  if (!carte) {
    terminerManche();
    return;
  }
  const personnage = carte.parties.find((p) => p.categorie === 'personnages');
  const action = carte.parties.find((p) => p.categorie === 'actions');

  const texteP = personnage ? `Je suis ${personnage.texte}` : '';
  const texteA = action ? action.texte : '';

  $('combi-personnage').textContent = texteP;
  $('combi-personnage').hidden = !personnage;
  $('combi-action').textContent = texteA;
  $('combi-action').hidden = !action;
  document.querySelector('.combinaison__liant').hidden = !(personnage && action);

  // Plus la combinaison est longue, plus on baisse le plafond de taille :
  // elle doit tenir à l'écran sans défilement, même en paysage.
  const longueur = texteP.length + texteA.length;
  $('bloc-combinaison').dataset.longueur =
    longueur >= 50 ? 'long' : longueur >= 30 ? 'moyen' : 'court';
}

function repondre(resultat) {
  const manche = etat.manche;
  if (!manche || manche.terminee || manche.verrouillage) return;

  const carte = manche.tirage[manche.index];
  if (!carte) return;

  manche.resultats.push({
    resultat,
    personnage: carte.parties.find((p) => p.categorie === 'personnages')?.texte ?? '',
    action: carte.parties.find((p) => p.categorie === 'actions')?.texte ?? ''
  });

  vibrer(resultat === 'trouve' ? [30, 40, 30] : 60);

  $('ecran-tour').className = `plein-ecran plein-ecran--${resultat === 'trouve' ? 'trouve' : 'passe'}`;
  $('bloc-combinaison').hidden = true;
  const verdict = $('bloc-verdict');
  verdict.hidden = false;
  verdict.textContent = resultat === 'trouve' ? 'TROUVÉ !' : 'PASSE';

  manche.verrouillage = window.setTimeout(() => {
    manche.verrouillage = null;
    if (!etat.manche || etat.manche.terminee) return;
    manche.index += 1;
    $('ecran-tour').className = 'plein-ecran';
    verdict.hidden = true;
    $('bloc-combinaison').hidden = false;
    afficherCombinaison();
  }, 620);
}

function terminerManche({ abandon = false } = {}) {
  const manche = etat.manche;
  if (!manche || manche.terminee) return;
  manche.terminee = true;

  window.clearInterval(manche.intervalle);
  window.clearInterval(manche.decompte);
  window.clearTimeout(manche.verrouillage);
  manche.inclinaisonPropre?.();
  libererEcran();
  vibrer([80, 60, 120]);

  if (abandon && manche.resultats.length === 0) {
    etat.manche = null;
    montrerEcran('salon');
    return;
  }

  const trouvees = manche.resultats.filter((r) => r.resultat === 'trouve').length;
  const passees = manche.resultats.length - trouvees;

  try {
    enregistrerManche(etat.soiree, { joueurId: manche.joueur.id, trouvees, passees });
    majSoiree();
  } catch (erreur) {
    signalerErreur(erreur);
  }

  afficherRecap(manche, trouvees, passees);
}

function afficherRecap(manche, trouvees, passees) {
  $('recap-joueur').textContent = manche.joueur.nom;
  $('recap-score').textContent = `${trouvees} ${pluriel(trouvees, 'pt')}`;
  $('recap-detail').textContent =
    `${trouvees} ${pluriel(trouvees, 'trouvée')} · ${passees} ${pluriel(passees, 'passée')}`;

  const liste = $('recap-liste');
  liste.textContent = '';
  for (const ligne of manche.resultats) {
    const li = document.createElement('li');
    li.dataset.resultat = ligne.resultat;
    const marque = document.createElement('span');
    marque.className = 'liste-recap__marque';
    marque.textContent = ligne.resultat === 'trouve' ? '✓' : '↷';
    const texte = document.createElement('span');
    texte.textContent = [ligne.personnage ? `Je suis ${ligne.personnage}` : '', ligne.action]
      .filter(Boolean)
      .join(' et ');
    li.append(marque, texte);
    liste.append(li);
  }

  if (manche.resultats.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Aucune carte jouée sur cette manche.';
    liste.append(li);
  }

  montrerEcran('recap');
  // Le détail carte par carte n'est ni enregistré ni transporté dans le lien :
  // il disparaît dès le retour au salon.
}

/* ------------------------------------------------------------------ */
/* Confort : vibration, écran allumé, inclinaison                      */
/* ------------------------------------------------------------------ */

function vibrer(motif) {
  try {
    navigator.vibrate?.(motif);
  } catch {
    /* sans importance */
  }
}

let verrouEcran = null;
async function garderEcranAllume() {
  try {
    verrouEcran = (await navigator.wakeLock?.request('screen')) ?? null;
  } catch {
    verrouEcran = null;
  }
}
function libererEcran() {
  try {
    verrouEcran?.release();
  } catch {
    /* sans importance */
  }
  verrouEcran = null;
}

// Incliner le téléphone vers le bas = trouvé, vers le haut = passe.
// Actif seulement si le navigateur donne l'orientation sans demander de
// permission ; les deux boutons restent la commande principale.
function activerInclinaison() {
  const manche = etat.manche;
  if (typeof window.DeviceOrientationEvent === 'undefined') return;
  if (typeof window.DeviceOrientationEvent.requestPermission === 'function') return;

  let arme = true;
  const surOrientation = (evenement) => {
    const beta = evenement.beta;
    if (typeof beta !== 'number') return;
    if (arme && beta < 40) {
      arme = false;
      repondre('trouve');
    } else if (arme && beta > 140) {
      arme = false;
      repondre('passe');
    } else if (!arme && beta > 60 && beta < 120) {
      arme = true;
    }
  };

  window.addEventListener('deviceorientation', surOrientation);
  manche.inclinaisonPropre = () => window.removeEventListener('deviceorientation', surOrientation);
}

/* ------------------------------------------------------------------ */
/* Branchements                                                        */
/* ------------------------------------------------------------------ */

function brancherEvenements() {
  $('form-creer').addEventListener('submit', (e) => {
    e.preventDefault();
    ouvrirSoiree($('champ-nom-soiree').value.trim());
  });

  $('form-reprendre').addEventListener('submit', (e) => {
    e.preventDefault();
    const lien = $('champ-lien').value.trim();
    if (!lien) {
      afficherMessage($('erreur-depart'), 'Colle le lien reçu pour reprendre la soirée.', 5000);
      return;
    }
    reprendre(lien);
  });

  $('form-joueur').addEventListener('submit', (e) => {
    e.preventDefault();
    const nom = $('champ-joueur').value.trim();
    if (!nom) return;
    try {
      ajouterJoueur(etat.soiree, nom);
      majSoiree();
      $('champ-joueur').value = '';
      $('champ-joueur').focus();
    } catch (erreur) {
      signalerErreur(erreur);
    }
  });

  $('form-carte').addEventListener('submit', (e) => {
    e.preventDefault();
    const texte = $('champ-carte').value.trim();
    if (!texte) return;
    try {
      ajouterCarte(etat.soiree, etat.categorieActive, texte);
      majSoiree();
      $('champ-carte').value = '';
      $('champ-carte').focus();
    } catch (erreur) {
      signalerErreur(erreur);
    }
  });

  for (const onglet of document.querySelectorAll('.onglet')) {
    onglet.addEventListener('click', () => {
      etat.categorieActive = onglet.dataset.categorie;
      if (etat.soiree) rendreCartes(etat.soiree);
      $('champ-carte').focus();
    });
  }

  $('btn-transferer').addEventListener('click', transferer);
  $('btn-cloturer').addEventListener('click', cloturerSoiree);
  $('btn-reinitialiser').addEventListener('click', () => {
    if (!window.confirm('Remettre tous les scores de la soirée à zéro ?')) return;
    reinitialiserScores(etat.soiree);
    majSoiree();
    afficherMessage($('info-salon'), 'Scores remis à zéro.', 4000);
  });

  $('btn-lancer').addEventListener('click', lancerManche);
  $('btn-retour-salon').addEventListener('click', () => {
    etat.manche = null;
    montrerEcran('salon');
  });

  $('btn-trouve').addEventListener('click', () => repondre('trouve'));
  $('btn-passe').addEventListener('click', () => repondre('passe'));
  $('btn-quitter-tour').addEventListener('click', () => terminerManche({ abandon: true }));

  document.addEventListener('keydown', (e) => {
    if (ecrans.tour.hidden) return;
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      repondre('trouve');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      repondre('passe');
    } else if (e.key === 'Escape') {
      terminerManche({ abandon: true });
    }
  });

  // Un lien collé dans la barre d'adresse pendant que la page est ouverte.
  window.addEventListener('hashchange', () => {
    const fragment = window.location.hash.slice(1);
    if (!fragment) return;
    if (etat.soiree && fragment === versFragment(etat.soiree)) return;
    reprendre(fragment, { silencieux: true });
  });

  window.addEventListener('pagehide', libererEcran);
}

initialiser();
window.__jeuPret = true; // repère pour l'alerte « page ouverte en file:// »
