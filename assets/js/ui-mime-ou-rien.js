// « Mime ou rien » — écrans de manche.
import * as jeu from './mime-ou-rien.js';
import { PAQUET_MIMES, NIVEAUX } from './mimes.js';
import {
  $, installerSalle, afficherMessage, pluriel, vibrer, garderEcranAllume, libererEcran
} from './salle.js';

const MIMES_PAR_MANCHE = 30;
const libelleNiveau = Object.fromEntries(NIVEAUX.map((n) => [n.id, n.libelle]));
let manche = null;

const salle = installerSalle({
  jeu,
  ecrans: ['tour'],
  peutLancer: (soiree) => {
    if (soiree.joueurs.length < 4) return 'Ajoute au moins 4 joueurs, deux par équipe.';
    if (!jeu.equipesPretes(soiree)) return 'Chaque équipe a besoin d’au moins deux joueurs.';
    return null;
  },
  surLancer: () => lancerManche(),
  surRendu: (soiree) => rendreEquipes(soiree),
  surCloture: () => {
    manche = null;
  },
  // Toucher un joueur le change d'équipe : plus direct qu'un menu.
  decorerJoueur: (li, joueur, soiree, majSoiree) => {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = `badge-equipe badge-equipe--${joueur.equipe}`;
    badge.textContent = joueur.equipe === 'a' ? 'A' : 'B';
    badge.setAttribute('aria-label', `${joueur.nom} — changer d’équipe`);
    badge.addEventListener('click', () => {
      jeu.changerEquipe(soiree, joueur.id);
      majSoiree();
    });
    li.append(badge);
  }
});

$('detail-paquet').textContent = `${PAQUET_MIMES.total} mimes`;

function rendreEquipes(soiree) {
  const tableau = $('tableau-equipes');
  tableau.textContent = '';
  for (const equipe of jeu.EQUIPES) {
    const membres = jeu.equipeDe(soiree, equipe.id);
    const li = document.createElement('li');
    li.className = `equipe equipe--${equipe.id}`;

    const nom = document.createElement('span');
    nom.className = 'equipe__nom';
    nom.textContent = equipe.libelle;

    const detail = document.createElement('span');
    detail.className = 'equipe__membres';
    detail.textContent = membres.length
      ? membres.map((m) => m.nom).join(', ')
      : 'personne pour l’instant';

    const points = document.createElement('span');
    points.className = 'equipe__points';
    const score = jeu.scoreEquipe(soiree, equipe.id);
    points.textContent = `${score} ${pluriel(score, 'pt')}`;

    li.append(nom, detail, points);
    tableau.append(li);
  }
  $('compteur-equipes').textContent =
    `${jeu.scoreEquipe(soiree, 'a')} — ${jeu.scoreEquipe(soiree, 'b')}`;

  const select = $('choix-joueur');
  const avant = select.value;
  select.textContent = '';
  for (const joueur of soiree.joueurs) {
    const option = document.createElement('option');
    option.value = joueur.id;
    option.textContent = `${joueur.nom} — équipe ${joueur.equipe.toUpperCase()}`;
    select.append(option);
  }
  if (soiree.joueurs.some((j) => j.id === avant)) select.value = avant;
  else {
    const suivant = jeu.prochainMimeur(soiree);
    if (suivant) select.value = suivant.id;
  }
  select.disabled = soiree.joueurs.length === 0;
}

/* ------------------------------- La manche -------------------------------- */

async function lancerManche() {
  const soiree = salle.soiree;
  const mimeur = soiree?.joueurs.find((j) => j.id === $('choix-joueur').value);
  if (!mimeur) {
    afficherMessage($('erreur-salon'), 'Choisis qui va mimer.', 5000);
    return;
  }

  manche = {
    mimeur,
    duree: soiree.reglages.duree,
    pile: jeu.tirerMimes(soiree, MIMES_PAR_MANCHE),
    index: 0,
    resultats: [],
    finLe: 0,
    intervalle: null,
    decompte: null,
    verrouillage: null,
    terminee: false
  };

  salle.montrerEcran('tour');
  $('tour-joueur').textContent = `${mimeur.nom} · équipe ${mimeur.equipe.toUpperCase()}`;
  $('tour-chrono').textContent = String(manche.duree);
  await garderEcranAllume();
  demarrerDecompte();
}

function demarrerDecompte() {
  $('ecran-tour').className = 'plein-ecran plein-ecran--pret';
  $('bloc-decompte').hidden = false;
  $('bloc-mime').hidden = true;
  $('bloc-verdict').hidden = true;
  $('bloc-actions-tour').hidden = true;
  $('decompte-consigne').textContent =
    `${manche.mimeur.nom}, garde l’écran pour toi. Ni parole, ni bruit, ni objet.`;

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
  $('bloc-mime').hidden = false;
  $('bloc-actions-tour').hidden = false;
  afficherMime();

  manche.intervalle = window.setInterval(() => {
    const reste = Math.max(0, Math.ceil((manche.finLe - Date.now()) / 1000));
    const chrono = $('tour-chrono');
    chrono.textContent = String(reste);
    chrono.classList.toggle('chrono--urgent', reste <= 10);
    if (reste <= 0) terminerManche();
  }, 200);
}

function afficherMime() {
  const carte = manche.pile[manche.index];
  if (!carte) {
    terminerManche();
    return;
  }
  $('mime-niveau').textContent =
    `${libelleNiveau[carte.niveau]} · ${carte.points} ${pluriel(carte.points, 'pt')}`;
  $('mime-texte').textContent = carte.texte;
  $('bloc-mime').dataset.longueur = carte.texte.length >= 30 ? 'long' : 'court';
}

function repondre(resultat) {
  if (!manche || manche.terminee || manche.verrouillage || !manche.finLe) return;
  const carte = manche.pile[manche.index];
  if (!carte) return;

  manche.resultats.push({ ...carte, resultat });
  vibrer(resultat === 'trouve' ? [30, 40, 30] : 60);

  $('ecran-tour').className = `plein-ecran plein-ecran--${resultat === 'trouve' ? 'trouve' : 'passe'}`;
  $('bloc-mime').hidden = true;
  const verdict = $('bloc-verdict');
  verdict.hidden = false;
  verdict.textContent = resultat === 'trouve' ? `+${carte.points}` : 'PASSE';

  manche.verrouillage = window.setTimeout(() => {
    manche.verrouillage = null;
    if (!manche || manche.terminee) return;
    manche.index += 1;
    $('ecran-tour').className = 'plein-ecran';
    verdict.hidden = true;
    $('bloc-mime').hidden = false;
    afficherMime();
  }, 520);
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

  const devines = manche.resultats.filter((r) => r.resultat === 'trouve');
  const points = devines.reduce((total, r) => total + r.points, 0);

  try {
    jeu.enregistrerManche(salle.soiree, {
      joueurId: manche.mimeur.id,
      points,
      trouvees: devines.length
    });
    // On relâche la sélection : l'autre équipe sera proposée d'elle-même.
    $('choix-joueur').value = '';
    salle.majSoiree();
  } catch (erreur) {
    salle.signalerErreur(erreur);
  }

  afficherRecap(devines.length, points);
}

function afficherRecap(devines, points) {
  $('recap-etiquette').textContent = `Équipe ${manche.mimeur.equipe.toUpperCase()}`;
  $('recap-joueur').textContent = manche.mimeur.nom;
  $('recap-score').textContent = `${points} ${pluriel(points, 'pt')}`;
  $('recap-detail').textContent =
    `${devines} ${pluriel(devines, 'mime')} ${pluriel(devines, 'deviné')} sur ` +
    `${manche.resultats.length} ${pluriel(manche.resultats.length, 'proposé')}.`;

  const liste = $('recap-liste');
  liste.textContent = '';
  for (const ligne of manche.resultats) {
    const li = document.createElement('li');
    li.dataset.resultat = ligne.resultat;
    const marque = document.createElement('span');
    marque.className = 'liste-recap__marque';
    marque.textContent = ligne.resultat === 'trouve' ? `+${ligne.points}` : '↷';
    const texte = document.createElement('span');
    texte.textContent = ligne.texte;
    li.append(marque, texte);
    liste.append(li);
  }
  if (manche.resultats.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Aucun mime joué sur cette manche.';
    liste.append(li);
  }
  salle.montrerEcran('recap');
}

$('btn-trouve').addEventListener('click', () => repondre('trouve'));
$('btn-passe').addEventListener('click', () => repondre('passe'));
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
    terminerManche({ sortie: true });
  }
});

window.__jeuPret = true;
