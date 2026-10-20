// « Mot de passe » — écrans de manche.
import * as jeu from './mot-de-passe.js';
import { PAQUET_MOTS_DE_PASSE } from './mots-de-passe.js';
import {
  $, installerSalle, afficherMessage, pluriel, vibrer, garderEcranAllume, libererEcran
} from './salle.js';

const MOTS_PAR_MANCHE = 40;
let manche = null;

const salle = installerSalle({
  jeu,
  ecrans: ['tour'],
  peutLancer: (soiree) =>
    soiree.joueurs.length < 2 ? 'Ajoute au moins 2 joueurs pour former un binôme.' : null,
  surLancer: () => lancerManche(),
  surRendu: (soiree) => rendreBinomes(soiree),
  surCloture: () => {
    manche = null;
  }
});

$('detail-paquet').textContent = `${PAQUET_MOTS_DE_PASSE.total} mots`;

/* --------------------------------- Salon ---------------------------------- */

function rendreBinomes(soiree) {
  const { paires, seul } = jeu.binomes(soiree);
  const liste = $('liste-binomes');
  liste.textContent = '';

  paires.forEach((paire, index) => {
    const donneur = jeu.donneurDe(paire);
    const devineur = paire.find((j) => j !== donneur);
    const li = document.createElement('li');
    li.className = 'binome';

    const rang = document.createElement('span');
    rang.className = 'binome__rang';
    rang.textContent = String(index + 1);

    const noms = document.createElement('span');
    noms.className = 'binome__noms';
    noms.textContent = `${donneur.nom} → ${devineur.nom}`;

    const points = document.createElement('span');
    points.className = 'binome__points';
    const score = jeu.scoreBinome(paire);
    points.textContent = `${score} ${pluriel(score, 'pt')}`;

    li.append(rang, noms, points);
    liste.append(li);
  });

  if (seul) {
    const li = document.createElement('li');
    li.className = 'binome binome--seul';
    li.textContent = `${seul.nom} attend un partenaire — mélange ou ajoute un joueur.`;
    liste.append(li);
  }
  if (!paires.length && !seul) {
    const li = document.createElement('li');
    li.className = 'binome binome--seul';
    li.textContent = 'Ajoute des joueurs : ils se mettront par deux.';
    liste.append(li);
  }

  $('compteur-binomes').textContent = paires.length
    ? `${paires.length} ${pluriel(paires.length, 'binôme')}`
    : 'aucun binôme';

  // Le menu propose les binômes, pas les joueurs un par un.
  const select = $('choix-joueur');
  const avant = select.value;
  select.textContent = '';
  for (const paire of paires) {
    const donneur = jeu.donneurDe(paire);
    const devineur = paire.find((j) => j !== donneur);
    const option = document.createElement('option');
    option.value = `${donneur.id}|${devineur.id}`;
    option.textContent = `${donneur.nom} fait deviner à ${devineur.nom}`;
    select.append(option);
  }
  if ([...select.options].some((o) => o.value === avant)) select.value = avant;
  else {
    const suivant = jeu.prochainBinome(soiree);
    if (suivant) {
      const donneur = jeu.donneurDe(suivant);
      select.value = `${donneur.id}|${suivant.find((j) => j !== donneur).id}`;
    }
  }
  select.disabled = paires.length === 0;
}

/* ------------------------------- La manche -------------------------------- */

async function lancerManche() {
  const soiree = salle.soiree;
  const [donneurId, devineurId] = ($('choix-joueur').value || '').split('|');
  const donneur = soiree?.joueurs.find((j) => j.id === donneurId);
  const devineur = soiree?.joueurs.find((j) => j.id === devineurId);
  if (!donneur || !devineur) {
    afficherMessage($('erreur-salon'), 'Choisis le binôme qui joue.', 5000);
    return;
  }

  manche = {
    donneur,
    devineur,
    duree: soiree.reglages.duree,
    pile: jeu.tirerMots(soiree, MOTS_PAR_MANCHE),
    index: 0,
    resultats: [],
    finLe: 0,
    intervalle: null,
    decompte: null,
    verrouillage: null,
    terminee: false
  };

  salle.montrerEcran('tour');
  $('tour-joueur').textContent = `${donneur.nom} → ${devineur.nom}`;
  $('tour-chrono').textContent = String(manche.duree);
  await garderEcranAllume();
  demarrerDecompte();
}

function demarrerDecompte() {
  $('ecran-tour').className = 'plein-ecran plein-ecran--pret';
  $('bloc-decompte').hidden = false;
  $('bloc-mot').hidden = true;
  $('bloc-verdict').hidden = true;
  $('bloc-actions-tour').hidden = true;
  $('decompte-consigne').textContent =
    `${manche.donneur.nom} tient le téléphone. ${manche.devineur.nom}, ne regarde pas l’écran !`;

  let reste = 3;
  $('decompte-nombre').textContent = String(reste);
  manche.decompte = window.setInterval(() => {
    if (!manche || manche.terminee) {
      window.clearInterval(manche?.decompte);
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
  manche.finLe = Date.now() + manche.duree * 1000;
  $('bloc-decompte').hidden = true;
  $('bloc-mot').hidden = false;
  $('bloc-actions-tour').hidden = false;
  afficherMot();

  manche.intervalle = window.setInterval(() => {
    const reste = Math.max(0, Math.ceil((manche.finLe - Date.now()) / 1000));
    const chrono = $('tour-chrono');
    chrono.textContent = String(reste);
    chrono.classList.toggle('chrono--urgent', reste <= 10);
    if (reste <= 0) terminerManche();
  }, 200);
}

function afficherMot() {
  const mot = manche.pile[manche.index];
  if (!mot) {
    terminerManche();
    return;
  }
  $('mot-rang').textContent = `Mot ${manche.index + 1}`;
  $('mot-texte').textContent = mot;
  $('bloc-mot').dataset.longueur = mot.length >= 18 ? 'long' : 'court';
}

function repondre(resultat) {
  if (!manche || manche.terminee || manche.verrouillage || !manche.finLe) return;
  const mot = manche.pile[manche.index];
  if (!mot) return;

  manche.resultats.push({ mot, resultat });
  vibrer(resultat === 'trouve' ? [30, 40, 30] : 60);

  const teinte = resultat === 'trouve' ? 'trouve' : 'passe';
  $('ecran-tour').className = `plein-ecran plein-ecran--${teinte}`;
  $('bloc-mot').hidden = true;
  const verdict = $('bloc-verdict');
  verdict.hidden = false;
  verdict.textContent =
    resultat === 'trouve' ? '+1' : resultat === 'faute' ? 'LÂCHÉ' : 'PASSE';

  manche.verrouillage = window.setTimeout(() => {
    manche.verrouillage = null;
    if (!manche || manche.terminee) return;
    manche.index += 1;
    $('ecran-tour').className = 'plein-ecran';
    verdict.hidden = true;
    $('bloc-mot').hidden = false;
    afficherMot();
  }, 480);
}

function terminerManche({ sortie = false } = {}) {
  if (!manche || manche.terminee) return;
  manche.terminee = true;
  window.clearInterval(manche.intervalle);
  window.clearInterval(manche.decompte);
  window.clearTimeout(manche.verrouillage);
  libererEcran();
  vibrer([80, 60, 120]);

  if (sortie && manche.resultats.length === 0) {
    manche = null;
    salle.montrerEcran('salon');
    return;
  }

  const trouves = manche.resultats.filter((r) => r.resultat === 'trouve').length;

  try {
    jeu.enregistrerManche(salle.soiree, {
      donneurId: manche.donneur.id,
      devineurId: manche.devineur.id,
      points: trouves,
      trouves
    });
    // On relâche la sélection : le binôme suivant sera proposé de lui-même.
    $('choix-joueur').value = '';
    salle.majSoiree();
  } catch (erreur) {
    salle.signalerErreur(erreur);
  }

  afficherRecap(trouves);
}

function afficherRecap(trouves) {
  const fautes = manche.resultats.filter((r) => r.resultat === 'faute').length;
  const passes = manche.resultats.filter((r) => r.resultat === 'passe').length;

  $('recap-etiquette').textContent = 'Manche terminée';
  $('recap-joueur').textContent = `${manche.donneur.nom} → ${manche.devineur.nom}`;
  $('recap-score').textContent = `${trouves} ${pluriel(trouves, 'pt')}`;
  $('recap-detail').textContent =
    `${trouves} ${pluriel(trouves, 'mot')} ${pluriel(trouves, 'trouvé')}` +
    (passes ? `, ${passes} ${pluriel(passes, 'passé')}` : '') +
    (fautes ? `, ${fautes} ${pluriel(fautes, 'lâché')}` : '') +
    '.';

  const liste = $('recap-liste');
  liste.textContent = '';
  for (const ligne of manche.resultats) {
    const li = document.createElement('li');
    li.dataset.resultat = ligne.resultat === 'trouve' ? 'trouve' : 'passe';
    const marque = document.createElement('span');
    marque.className = 'liste-recap__marque';
    marque.textContent = ligne.resultat === 'trouve' ? '+1' : ligne.resultat === 'faute' ? '✕' : '↷';
    const texte = document.createElement('span');
    texte.textContent = ligne.mot;
    li.append(marque, texte);
    liste.append(li);
  }
  if (manche.resultats.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Aucun mot joué sur cette manche.';
    liste.append(li);
  }
  salle.montrerEcran('recap');
}

/* ------------------------------ Branchements ------------------------------ */

$('btn-melanger').addEventListener('click', () => {
  if (!salle.soiree) return;
  jeu.melangerBinomes(salle.soiree);
  $('choix-joueur').value = '';
  salle.majSoiree();
  salle.afficherInfo('Binômes mélangés.', 4000);
});

$('btn-trouve').addEventListener('click', () => repondre('trouve'));
$('btn-passe').addEventListener('click', () => repondre('passe'));
$('btn-faute').addEventListener('click', () => repondre('faute'));
$('btn-quitter-tour').addEventListener('click', () => terminerManche({ sortie: true }));

document.addEventListener('keydown', (e) => {
  if ($('ecran-tour').hidden) return;
  if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    repondre('trouve');
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    repondre('passe');
  } else if (e.key === 'Escape') {
    // En plein écran, Échap sert au navigateur à en sortir : on ne cumule
    // pas les deux effets.
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    terminerManche({ sortie: true });
  }
});

window.__jeuPret = true;
