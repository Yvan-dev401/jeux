// « Qui a dit ça ? » — collecte privée des réponses, puis attribution.
import * as jeu from './qui-a-dit-ca.js';
import { PAQUET_QUESTIONS } from './questions.js';
import { $, installerSalle, afficherMessage, pluriel, vibrer } from './salle.js';

let attributions = {};

const salle = installerSalle({
  jeu,
  ecrans: ['collecte', 'attribution'],
  peutLancer: (soiree) =>
    soiree.joueurs.length < jeu.MIN_JOUEURS
      ? `Ajoute au moins ${jeu.MIN_JOUEURS} joueurs pour lancer une manche.`
      : null,
  surLancer: () => demarrer(),
  surRendu: (soiree) => rendreChoixMeneur(soiree),
  surCloture: () => {
    attributions = {};
  }
});

$('detail-paquet').textContent = `${PAQUET_QUESTIONS.total} questions`;

function rendreChoixMeneur(soiree) {
  const select = $('choix-joueur');
  const avant = select.value;
  select.textContent = '';
  for (const joueur of soiree.joueurs) {
    const option = document.createElement('option');
    option.value = joueur.id;
    const menees = joueur.menees ?? 0;
    option.textContent = menees
      ? `${joueur.nom} — ${menees} ${pluriel(menees, 'manche')} ${pluriel(menees, 'menée')}`
      : joueur.nom;
    select.append(option);
  }
  if (soiree.joueurs.some((j) => j.id === avant)) select.value = avant;
  else {
    const suivant = jeu.prochainMeneur(soiree);
    if (suivant) select.value = suivant.id;
  }
  select.disabled = soiree.joueurs.length === 0;
}

/* -------------------------------- Collecte -------------------------------- */

function demarrer() {
  const meneurId = $('choix-joueur').value;
  try {
    jeu.demarrerManche(salle.soiree, meneurId);
  } catch (erreur) {
    salle.signalerErreur(erreur);
    return;
  }
  attributions = {};
  salle.montrerEcran('collecte');
  montrerPasse();
}

function montrerPasse() {
  const soiree = salle.soiree;
  const auteur = jeu.auteurCourant(soiree);
  if (!auteur) {
    montrerAttribution();
    return;
  }
  const manche = soiree.manche;
  $('collecte-progression').textContent = `${manche.position + 1} / ${manche.ordre.length}`;
  $('collecte-nom').textContent = auteur.nom;
  $('bloc-passe').hidden = false;
  $('bloc-saisie').hidden = true;
  $('btn-repondre').hidden = false;
}

/** La question et le champ n'apparaissent qu'une fois le téléphone en main. */
function montrerSaisie() {
  const soiree = salle.soiree;
  if (!jeu.auteurCourant(soiree)) return;
  $('collecte-question').textContent = soiree.manche.question;
  $('bloc-passe').hidden = true;
  $('bloc-saisie').hidden = false;
  $('btn-repondre').hidden = true;
  const champ = $('champ-reponse');
  champ.value = '';
  champ.focus();
  vibrer(30);
}

function validerReponse(e) {
  e.preventDefault();
  const texte = $('champ-reponse').value.trim();
  if (!texte) return;
  try {
    jeu.repondre(salle.soiree, texte);
  } catch (erreur) {
    salle.signalerErreur(erreur);
    return;
  }
  $('champ-reponse').value = '';
  if (jeu.collecteTerminee(salle.soiree)) montrerAttribution();
  else montrerPasse();
}

/* ------------------------------ Attribution ------------------------------- */

function montrerAttribution() {
  const soiree = salle.soiree;
  const manche = soiree.manche;
  const meneur = soiree.joueurs.find((j) => j.id === manche.meneurId);
  const candidats = soiree.joueurs.filter((j) => j.id !== manche.meneurId);

  $('attribution-meneur').textContent = `${meneur?.nom ?? 'Le meneur'} devine`;
  $('attribution-question').textContent = manche.question;

  const liste = $('liste-attributions');
  liste.textContent = '';
  attributions = {};

  for (const reponse of jeu.reponsesMelangees(soiree)) {
    const li = document.createElement('li');
    li.className = 'attribution';

    const texte = document.createElement('p');
    texte.className = 'attribution__texte';
    texte.textContent = `« ${reponse.texte} »`;

    const label = document.createElement('label');
    label.className = 'champ sans-espace-haut';
    const intitule = document.createElement('span');
    intitule.className = 'champ__libelle';
    intitule.textContent = 'Selon toi, c’est';

    const select = document.createElement('select');
    const vide = document.createElement('option');
    vide.value = '';
    vide.textContent = 'Je ne sais pas';
    select.append(vide);
    for (const candidat of candidats) {
      const option = document.createElement('option');
      option.value = candidat.id;
      option.textContent = candidat.nom;
      select.append(option);
    }
    select.addEventListener('change', () => {
      attributions[reponse.id] = select.value || null;
    });

    label.append(intitule, select);
    li.append(texte, label);
    liste.append(li);
  }

  salle.montrerEcran('attribution');
}

function validerAttributions() {
  let issue;
  try {
    issue = jeu.attribuer(salle.soiree, attributions);
  } catch (erreur) {
    salle.signalerErreur(erreur);
    return;
  }
  // On relâche la sélection : le prochain meneur sera proposé de lui-même.
  $('choix-joueur').value = '';
  salle.majSoiree();
  vibrer(issue.justes ? [40, 60, 40] : [120]);

  const gagnes = issue.justes * jeu.POINTS_BONNE_ATTRIBUTION;
  $('recap-etiquette').textContent = 'Manche terminée';
  $('recap-joueur').textContent = issue.meneur?.nom ?? 'Meneur';
  $('recap-score').textContent = `${gagnes} ${pluriel(gagnes, 'pt')}`;
  $('recap-detail').textContent =
    `${issue.justes} ${pluriel(issue.justes, 'bonne')} ${pluriel(issue.justes, 'attribution')} ` +
    `sur ${issue.total}. Les auteurs non démasqués marquent un point chacun.`;

  const liste = $('recap-liste');
  liste.textContent = '';
  for (const resultat of issue.resultats) {
    const li = document.createElement('li');
    li.dataset.resultat = resultat.juste ? 'trouve' : 'passe';
    const marque = document.createElement('span');
    marque.className = 'liste-recap__marque';
    marque.textContent = resultat.juste ? '✓' : '✕';
    const texte = document.createElement('span');
    texte.textContent = resultat.juste
      ? `« ${resultat.reponse.texte} » — ${resultat.auteur?.nom ?? '?'}`
      : `« ${resultat.reponse.texte} » — c'était ${resultat.auteur?.nom ?? '?'}` +
        (resultat.suppose ? `, pas ${resultat.suppose.nom}` : '');
    li.append(marque, texte);
    liste.append(li);
  }
  salle.montrerEcran('recap');
}

/* ------------------------------ Branchements ------------------------------ */

$('btn-repondre').addEventListener('click', montrerSaisie);
$('form-reponse').addEventListener('submit', validerReponse);
$('btn-valider-attributions').addEventListener('click', validerAttributions);
$('btn-quitter-collecte').addEventListener('click', () => {
  salle.soiree.manche = null;
  salle.montrerEcran('salon');
  afficherMessage($('info-salon'), 'Manche interrompue. Rien n’a été compté.', 5000);
});

window.__jeuPret = true;
