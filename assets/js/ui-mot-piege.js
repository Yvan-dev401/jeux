// « Le mot piégé » — distribution privée, discussion, vote.
import * as jeu from './mot-piege.js';
import { PAQUET_MOTS } from './mots-pieges.js';
import { $, installerSalle, afficherMessage, pluriel, vibrer } from './salle.js';

const salle = installerSalle({
  jeu,
  ecrans: ['distribution', 'vote'],
  peutLancer: (soiree) =>
    soiree.joueurs.length < jeu.MIN_JOUEURS
      ? `Ajoute au moins ${jeu.MIN_JOUEURS} joueurs pour lancer une manche.`
      : null,
  surLancer: () => distribuer(),
  surCloture: () => {
    /* la manche vit dans la soirée, effacée avec elle */
  }
});

$('detail-paquet').textContent = `${PAQUET_MOTS.paires} paires`;

/* ----------------------------- Distribution ------------------------------- */

function distribuer() {
  try {
    jeu.distribuer(salle.soiree);
  } catch (erreur) {
    salle.signalerErreur(erreur);
    return;
  }
  salle.montrerEcran('distribution');
  montrerPasse();
}

/** Écran d'attente : on annonce à qui passer le téléphone, sans rien dévoiler. */
function montrerPasse() {
  const soiree = salle.soiree;
  const joueur = jeu.joueurCourant(soiree);
  if (!joueur) {
    montrerVote();
    return;
  }
  const manche = soiree.manche;
  $('ecran-distribution').className = 'plein-ecran plein-ecran--pret';
  $('distrib-progression').textContent = `${manche.position + 1} / ${manche.ordre.length}`;
  $('distrib-nom').textContent = joueur.nom;
  $('bloc-passe').hidden = false;
  $('bloc-secret').hidden = true;
  $('btn-voir-mot').hidden = false;
  $('btn-mot-vu').hidden = true;
}

/** Le mot n'apparaît qu'après une action délibérée du joueur concerné. */
function montrerMot() {
  const soiree = salle.soiree;
  const joueur = jeu.joueurCourant(soiree);
  if (!joueur) return;
  $('secret-mot').textContent = jeu.motPour(soiree, joueur.id);
  $('bloc-passe').hidden = true;
  $('bloc-secret').hidden = false;
  $('btn-voir-mot').hidden = true;
  $('btn-mot-vu').hidden = false;
  vibrer(30);
}

function motVu() {
  jeu.passerAuSuivant(salle.soiree);
  if (jeu.distributionTerminee(salle.soiree)) montrerVote();
  else montrerPasse();
}

/* --------------------------------- Vote ----------------------------------- */

function montrerVote() {
  const soiree = salle.soiree;
  const liste = $('liste-suspects');
  liste.textContent = '';
  for (const joueur of soiree.joueurs) {
    const li = document.createElement('li');
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'choix-joueur';
    bouton.textContent = joueur.nom;
    bouton.addEventListener('click', () => conclure(joueur.id));
    li.append(bouton);
    liste.append(li);
  }
  salle.montrerEcran('vote');
}

function conclure(suspectId) {
  let issue;
  try {
    issue = jeu.voter(salle.soiree, suspectId);
  } catch (erreur) {
    salle.signalerErreur(erreur);
    return;
  }
  salle.majSoiree();
  vibrer(issue.demasque ? [40, 60, 40, 60, 90] : [120]);

  $('recap-etiquette').textContent = issue.demasque ? 'Intrus démasqué' : 'Intrus impuni';
  $('recap-verdict').textContent = issue.intrus ? issue.intrus.nom : 'Personne';
  $('recap-score').textContent = issue.demasque
    ? `+${jeu.POINTS_GROUPE} ${pluriel(jeu.POINTS_GROUPE, 'pt')} pour les autres`
    : `+${jeu.POINTS_INTRUS} ${pluriel(jeu.POINTS_INTRUS, 'pt')} pour l’intrus`;
  $('recap-detail').textContent = issue.demasque
    ? `${issue.intrus?.nom ?? 'L’intrus'} était bien l’intrus. Bien vu !`
    : issue.suspect
      ? `Le groupe a accusé ${issue.suspect.nom} à tort.`
      : 'Le groupe n’a désigné personne.';
  $('recap-mots').textContent =
    `Le groupe avait « ${issue.motGroupe} », l’intrus « ${issue.motIntrus} ».`;
  salle.montrerEcran('recap');
}

/* ------------------------------ Branchements ------------------------------ */

$('btn-voir-mot').addEventListener('click', montrerMot);
$('btn-mot-vu').addEventListener('click', motVu);
$('btn-personne').addEventListener('click', () => conclure(null));
$('btn-quitter-distribution').addEventListener('click', () => {
  salle.soiree.manche = null;
  salle.montrerEcran('salon');
  afficherMessage($('info-salon'), 'Distribution interrompue. Aucune manche comptée.', 5000);
});

document.addEventListener('keydown', (e) => {
  if ($('ecran-distribution').hidden) return;
  if (e.key === 'Escape') $('btn-quitter-distribution').click();
});

window.__jeuPret = true;
