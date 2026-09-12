// « Ta mère en slip » — enchaînement des écrans et déroulé d'une manche.
//
// Rien n'est stocké dans le navigateur : le code de la soirée vit dans l'URL,
// l'état de la manche vit dans cette page et s'efface quand on la quitte.
import { api, ErreurApi } from './api.js';

const $ = (id) => document.getElementById(id);

const ecrans = {
  depart: $('ecran-depart'),
  salon: $('ecran-salon'),
  recap: $('ecran-recap'),
  tour: $('ecran-tour')
};

const etat = {
  limites: null,
  paquet: null,
  soiree: null,
  revisionAffichee: -1,
  categorieActive: 'personnages',
  sondage: null,
  manche: null
};

const CARTES_PAR_MANCHE = 40;

/* ------------------------------------------------------------------ */
/* Utilitaires d'affichage                                            */
/* ------------------------------------------------------------------ */

function montrerEcran(nom) {
  ecrans.depart.hidden = nom !== 'depart';
  ecrans.salon.hidden = nom !== 'salon';
  ecrans.recap.hidden = nom !== 'recap';
  ecrans.tour.hidden = nom !== 'tour';
  document.body.style.overflow = nom === 'tour' ? 'hidden' : '';
  if (nom !== 'salon') arreterSondage();
  else demarrerSondage();
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
  const message = erreur instanceof ErreurApi ? erreur.message : 'Une erreur est survenue.';
  afficherMessage(cible, message, 6000);

  // La soirée n'existe plus : on revient au départ plutôt que d'afficher un salon fantôme.
  if (erreur instanceof ErreurApi && erreur.statut === 404 && etat.soiree) quitterSoiree();
}

const initiale = (nom) => nom.trim().charAt(0).toUpperCase() || '?';

/* ------------------------------------------------------------------ */
/* Chargement initial                                                  */
/* ------------------------------------------------------------------ */

async function initialiser() {
  brancherEvenements();

  try {
    const { paquet, limites } = await api.paquet();
    etat.paquet = paquet;
    etat.limites = limites;
    construireChoixDuree(limites);

    const total = Object.values(paquet.compte).reduce((a, b) => a + b, 0);
    $('compte-cartes').textContent = `${total} cartes de base`;
    $('detail-paquet').textContent =
      `${total} cartes (${paquet.compte.personnages} personnages, ${paquet.compte.actions} actions)`;
  } catch {
    // Le jeu reste utilisable : on garde les valeurs par défaut du HTML.
    construireChoixDuree({ dureesChrono: [30, 60, 90, 120, 180], dureeChronoDefaut: 60 });
  }

  const code = codeDepuisUrl();
  if (code) rejoindre(code).catch(() => {});
}

function codeDepuisUrl() {
  const brut = window.location.hash.replace('#', '').trim().toUpperCase();
  return /^[A-Z0-9]{3,8}$/.test(brut) ? brut : '';
}

function construireChoixDuree(limites) {
  const conteneur = $('choix-duree');
  conteneur.querySelectorAll('label').forEach((n) => n.remove());
  for (const duree of limites.dureesChrono) {
    const label = document.createElement('label');
    label.className = 'puce-radio';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'duree';
    input.value = String(duree);
    input.checked = duree === limites.dureeChronoDefaut;
    input.addEventListener('change', () => changerDuree(duree));
    const span = document.createElement('span');
    span.textContent = `${duree} s`;
    label.append(input, span);
    conteneur.append(label);
  }
}

/* ------------------------------------------------------------------ */
/* Soirée                                                              */
/* ------------------------------------------------------------------ */

async function creerSoiree(nom) {
  try {
    const { soiree } = await api.creerSoiree(nom);
    appliquerSoiree(soiree, { forcer: true });
    window.location.hash = soiree.code;
    montrerEcran('salon');
    afficherMessage($('info-salon'), `Soirée créée. Partage le code ${soiree.code} !`, 6000);
    $('champ-joueur').focus();
  } catch (erreur) {
    signalerErreur(erreur, 'depart');
  }
}

async function rejoindre(code) {
  try {
    const { soiree } = await api.lireSoiree(code);
    appliquerSoiree(soiree, { forcer: true });
    window.location.hash = soiree.code;
    montrerEcran('salon');
  } catch (erreur) {
    if (erreur instanceof ErreurApi && erreur.statut === 404) {
      window.location.hash = '';
      montrerEcran('depart');
    }
    signalerErreur(erreur, 'depart');
    throw erreur;
  }
}

function quitterSoiree() {
  etat.soiree = null;
  etat.revisionAffichee = -1;
  etat.manche = null;
  arreterSondage();
  window.location.hash = '';
  montrerEcran('depart');
}

function appliquerSoiree(soiree, { forcer = false } = {}) {
  etat.soiree = soiree;
  if (!forcer && soiree.revision === etat.revisionAffichee) return;
  etat.revisionAffichee = soiree.revision;
  rendreSalon();
}

async function rafraichir() {
  if (!etat.soiree) return;
  try {
    const { soiree } = await api.lireSoiree(etat.soiree.code);
    appliquerSoiree(soiree);
  } catch (erreur) {
    if (erreur instanceof ErreurApi && erreur.statut === 404) {
      afficherMessage($('erreur-depart'), 'La soirée est terminée.', 6000);
      quitterSoiree();
    }
  }
}

function demarrerSondage() {
  if (etat.sondage) return;
  etat.sondage = window.setInterval(() => {
    if (document.visibilityState === 'visible') rafraichir();
  }, 5000);
}

function arreterSondage() {
  if (!etat.sondage) return;
  window.clearInterval(etat.sondage);
  etat.sondage = null;
}

/* ------------------------------------------------------------------ */
/* Rendu du salon                                                      */
/* ------------------------------------------------------------------ */

function rendreSalon() {
  const soiree = etat.soiree;
  if (!soiree) return;

  $('nom-soiree').textContent = soiree.nom;
  $('valeur-code').textContent = soiree.code;
  $('compteur-manches').textContent =
    `${soiree.manches} manche${soiree.manches > 1 ? 's' : ''}`;

  const heures = Math.round(soiree.expireDans / 3600000);
  $('info-expiration').textContent =
    `Cette soirée et toutes ses données s'effacent après ${heures} h sans activité.`;

  rendreJoueurs(soiree);
  rendreCartes(soiree);
  rendrePodium(soiree);

  const radio = document.querySelector(`#choix-duree input[value="${soiree.reglages.duree}"]`);
  if (radio) radio.checked = true;
}

function rendreJoueurs(soiree) {
  const max = etat.limites?.maxJoueurs ?? 12;
  const min = etat.limites?.minJoueurs ?? 2;
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
    score.textContent = `${joueur.score} pt${joueur.score > 1 ? 's' : ''}`;

    const retirer = document.createElement('button');
    retirer.type = 'button';
    retirer.className = 'icone-bouton';
    retirer.textContent = '✕';
    retirer.setAttribute('aria-label', `Retirer ${joueur.nom}`);
    retirer.addEventListener('click', () => retirerJoueur(joueur.id));

    li.append(pastille, nom, score, retirer);
    liste.append(li);
  }

  $('compteur-joueurs').textContent = `${soiree.joueurs.length} / ${max}`;
  $('note-joueurs').hidden = soiree.joueurs.length >= min;
  $('champ-joueur').disabled = soiree.joueurs.length >= max;

  const select = $('choix-joueur');
  const choixPrecedent = select.value;
  select.textContent = '';
  for (const joueur of soiree.joueurs) {
    const option = document.createElement('option');
    option.value = joueur.id;
    option.textContent = `${joueur.nom} — ${joueur.score} pt${joueur.score > 1 ? 's' : ''}`;
    select.append(option);
  }
  if (soiree.joueurs.some((j) => j.id === choixPrecedent)) {
    select.value = choixPrecedent;
  } else {
    // Par défaut : celui qui a joué le moins de manches.
    const suivant = [...soiree.joueurs].sort((a, b) => a.manchesJouees - b.manchesJouees)[0];
    if (suivant) select.value = suivant.id;
  }

  const pretAJouer = soiree.joueurs.length >= min;
  $('btn-lancer').disabled = !pretAJouer;
  select.disabled = soiree.joueurs.length === 0;
}

function rendreCartes(soiree) {
  const categorie = etat.categorieActive;
  const cartes = soiree.cartesPerso[categorie] ?? [];
  const total = soiree.cartesPerso.personnages.length + soiree.cartesPerso.actions.length;

  $('compteur-cartes').textContent =
    total === 0 ? 'aucune carte ajoutée' : `${total} carte${total > 1 ? 's' : ''} ajoutée${total > 1 ? 's' : ''}`;

  for (const onglet of document.querySelectorAll('.onglet')) {
    onglet.setAttribute('aria-selected', String(onglet.dataset.categorie === categorie));
  }

  $('champ-carte').placeholder =
    categorie === 'personnages' ? 'un pilote de rallye' : "je répare un vélo";
  $('exemple-carte').textContent =
    categorie === 'personnages'
      ? 'Écris le personnage tel qu\'il se lit après « Je suis ».'
      : 'Écris l\'action à la première personne : « je danse la salsa ».';

  const liste = $('liste-cartes');
  liste.textContent = '';
  for (const carte of cartes) {
    const li = document.createElement('li');
    li.className = 'carte-perso';
    const texte = document.createElement('span');
    texte.textContent = carte.texte;
    const supprimer = document.createElement('button');
    supprimer.type = 'button';
    supprimer.textContent = '✕';
    supprimer.setAttribute('aria-label', `Supprimer la carte ${carte.texte}`);
    supprimer.addEventListener('click', () => retirerCarte(categorie, carte.id));
    li.append(texte, supprimer);
    liste.append(li);
  }
}

function rendrePodium(soiree) {
  const podium = $('podium');
  podium.textContent = '';

  if (soiree.joueurs.length === 0) {
    const vide = document.createElement('li');
    vide.style.border = 'none';
    vide.style.background = 'transparent';
    vide.style.padding = '0';
    vide.style.color = 'var(--texte-faible)';
    vide.textContent = 'Le classement apparaîtra après la première manche.';
    podium.append(vide);
    return;
  }

  const classement = [...soiree.joueurs].sort((a, b) => b.score - a.score || a.nom.localeCompare(b.nom));
  classement.forEach((joueur, index) => {
    const li = document.createElement('li');
    const rang = document.createElement('span');
    rang.className = 'podium__rang';
    rang.textContent = String(index + 1);
    const nom = document.createElement('span');
    nom.className = 'podium__nom';
    nom.textContent = joueur.nom;
    const points = document.createElement('span');
    points.className = 'podium__points';
    points.textContent = `${joueur.score} pt${joueur.score > 1 ? 's' : ''}`;
    li.append(rang, nom, points);
    podium.append(li);
  });
}

/* ------------------------------------------------------------------ */
/* Actions du salon                                                    */
/* ------------------------------------------------------------------ */

async function ajouterJoueur(nom) {
  try {
    const { soiree } = await api.ajouterJoueur(etat.soiree.code, nom);
    appliquerSoiree(soiree, { forcer: true });
    $('champ-joueur').value = '';
    $('champ-joueur').focus();
  } catch (erreur) {
    signalerErreur(erreur);
  }
}

async function retirerJoueur(id) {
  try {
    const { soiree } = await api.retirerJoueur(etat.soiree.code, id);
    appliquerSoiree(soiree, { forcer: true });
  } catch (erreur) {
    signalerErreur(erreur);
  }
}

async function ajouterCarte(texte) {
  try {
    const { soiree } = await api.ajouterCarte(etat.soiree.code, etat.categorieActive, texte);
    appliquerSoiree(soiree, { forcer: true });
    $('champ-carte').value = '';
    $('champ-carte').focus();
  } catch (erreur) {
    signalerErreur(erreur);
  }
}

async function retirerCarte(categorie, id) {
  try {
    const { soiree } = await api.retirerCarte(etat.soiree.code, categorie, id);
    appliquerSoiree(soiree, { forcer: true });
  } catch (erreur) {
    signalerErreur(erreur);
  }
}

async function changerDuree(duree) {
  try {
    const { soiree } = await api.majReglages(etat.soiree.code, { duree });
    appliquerSoiree(soiree, { forcer: true });
  } catch (erreur) {
    signalerErreur(erreur);
  }
}

async function reinitialiserScores() {
  if (!window.confirm('Remettre tous les scores de la soirée à zéro ?')) return;
  try {
    const { soiree } = await api.reinitialiser(etat.soiree.code);
    appliquerSoiree(soiree, { forcer: true });
    afficherMessage($('info-salon'), 'Scores remis à zéro.', 4000);
  } catch (erreur) {
    signalerErreur(erreur);
  }
}

async function cloturerSoiree() {
  const message =
    'Clôturer la soirée ? Joueurs, scores et cartes ajoutées seront effacés immédiatement et définitivement.';
  if (!window.confirm(message)) return;
  try {
    await api.cloturerSoiree(etat.soiree.code);
  } catch {
    // La soirée avait déjà expiré : le résultat est le même.
  }
  quitterSoiree();
  afficherMessage($('erreur-depart'), '', 0);
  afficherMessage($('info-salon'), '', 0);
}

async function copierCode() {
  const lien = `${window.location.origin}${window.location.pathname}#${etat.soiree.code}`;
  try {
    await navigator.clipboard.writeText(lien);
    afficherMessage($('info-salon'), 'Lien de la soirée copié !', 4000);
  } catch {
    afficherMessage($('info-salon'), `Partage ce lien : ${lien}`, 8000);
  }
}

/* ------------------------------------------------------------------ */
/* Déroulé d'une manche                                                */
/* ------------------------------------------------------------------ */

async function lancerManche() {
  const soiree = etat.soiree;
  const joueurId = $('choix-joueur').value;
  const joueur = soiree?.joueurs.find((j) => j.id === joueurId);
  if (!joueur) {
    afficherMessage($('erreur-salon'), 'Choisis le joueur qui prend le téléphone.', 5000);
    return;
  }

  let tirage;
  try {
    ({ tirage } = await api.tirer(soiree.code, CARTES_PAR_MANCHE));
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
    verrouillage: null,
    inclinaisonPropre: null,
    terminee: false
  };

  montrerEcran('tour');
  $('tour-joueur').textContent = joueur.nom;
  $('tour-chrono').textContent = String(soiree.reglages.duree);
  await garderEcranAllume();
  decompte();
}

function decompte() {
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
  const tic = window.setInterval(() => {
    reste -= 1;
    if (!etat.manche || etat.manche.terminee) {
      window.clearInterval(tic);
      return;
    }
    if (reste <= 0) {
      window.clearInterval(tic);
      demarrerChrono();
      return;
    }
    $('decompte-nombre').textContent = String(reste);
    vibrer(40);
  }, 1000);
  manche.decompte = tic;
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

  $('combi-personnage').textContent = personnage ? `Je suis ${personnage.texte}` : '';
  $('combi-personnage').hidden = !personnage;
  $('combi-action').textContent = action ? action.texte : '';
  $('combi-action').hidden = !action;
  document.querySelector('.combinaison__liant').hidden = !(personnage && action);
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

  $('ecran-tour').className =
    `plein-ecran plein-ecran--${resultat === 'trouve' ? 'trouve' : 'passe'}`;
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
  afficherRecap(manche, trouvees, passees);

  api
    .enregistrerManche(etat.soiree.code, { joueurId: manche.joueur.id, trouvees, passees })
    .then(({ soiree }) => appliquerSoiree(soiree, { forcer: true }))
    .catch((erreur) => signalerErreur(erreur));
}

function afficherRecap(manche, trouvees, passees) {
  $('recap-joueur').textContent = manche.joueur.nom;
  $('recap-score').textContent = `${trouvees} pt${trouvees > 1 ? 's' : ''}`;
  $('recap-detail').textContent =
    `${trouvees} trouvée${trouvees > 1 ? 's' : ''} · ${passees} passée${passees > 1 ? 's' : ''}`;

  const liste = $('recap-liste');
  liste.textContent = '';
  for (const ligne of manche.resultats) {
    const li = document.createElement('li');
    li.dataset.resultat = ligne.resultat;
    const marque = document.createElement('span');
    marque.className = 'liste-recap__marque';
    marque.textContent = ligne.resultat === 'trouve' ? '✓' : '↷';
    const texte = document.createElement('span');
    texte.textContent = [
      ligne.personnage ? `Je suis ${ligne.personnage}` : '',
      ligne.action
    ].filter(Boolean).join(' et ');
    li.append(marque, texte);
    liste.append(li);
  }

  if (manche.resultats.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Aucune carte jouée sur cette manche.';
    liste.append(li);
  }

  montrerEcran('recap');
  // Le détail de la manche n'est jamais transmis ni conservé : il disparaît
  // de la page dès qu'on revient au salon.
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
// Disponible seulement si le navigateur donne l'orientation sans permission
// explicite ; les deux boutons restent de toute façon la commande principale.
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
  manche.inclinaisonPropre = () =>
    window.removeEventListener('deviceorientation', surOrientation);
}

/* ------------------------------------------------------------------ */
/* Branchements                                                        */
/* ------------------------------------------------------------------ */

function brancherEvenements() {
  $('form-creer').addEventListener('submit', (e) => {
    e.preventDefault();
    creerSoiree($('champ-nom-soiree').value.trim());
  });

  $('form-rejoindre').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('champ-code').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,8}$/.test(code)) {
      afficherMessage($('erreur-depart'), 'Le code doit contenir 5 lettres ou chiffres.', 5000);
      return;
    }
    rejoindre(code).catch(() => {});
  });

  $('champ-code').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  $('form-joueur').addEventListener('submit', (e) => {
    e.preventDefault();
    const nom = $('champ-joueur').value.trim();
    if (nom) ajouterJoueur(nom);
  });

  $('form-carte').addEventListener('submit', (e) => {
    e.preventDefault();
    const texte = $('champ-carte').value.trim();
    if (texte) ajouterCarte(texte);
  });

  for (const onglet of document.querySelectorAll('.onglet')) {
    onglet.addEventListener('click', () => {
      etat.categorieActive = onglet.dataset.categorie;
      if (etat.soiree) rendreCartes(etat.soiree);
      $('champ-carte').focus();
    });
  }

  $('btn-copier-code').addEventListener('click', copierCode);
  $('btn-reinitialiser').addEventListener('click', reinitialiserScores);
  $('btn-cloturer').addEventListener('click', cloturerSoiree);
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

  window.addEventListener('hashchange', () => {
    const code = codeDepuisUrl();
    if (!code) {
      if (etat.soiree) quitterSoiree();
      return;
    }
    if (!etat.soiree || etat.soiree.code !== code) rejoindre(code).catch(() => {});
  });

  window.addEventListener('pagehide', () => {
    arreterSondage();
    libererEcran();
  });
}

initialiser();
