// La salle : tout ce qu'une soirée a de commun, quel que soit le jeu.
//
// Ouvrir ou reprendre une soirée, gérer les joueurs et le chrono, tenir le
// classement, transférer par lien, clôturer. Chaque jeu branche là-dessus ses
// propres écrans de manche.
import { creerLien, REGLES } from './noyau.js';

export const $ = (id) => document.getElementById(id);

export function afficherMessage(element, texte, duree = 0) {
  if (!element) return;
  element.textContent = texte;
  element.hidden = !texte;
  if (texte && duree > 0) {
    window.setTimeout(() => {
      if (element.textContent === texte) element.hidden = true;
    }, duree);
  }
}

export const initiale = (nom) => nom.trim().charAt(0).toUpperCase() || '?';
export const pluriel = (n, s, p = `${s}s`) => (n > 1 ? p : s);

export function vibrer(motif) {
  try {
    navigator.vibrate?.(motif);
  } catch {
    /* sans importance */
  }
}

let verrouEcran = null;
export async function garderEcranAllume() {
  try {
    verrouEcran = (await navigator.wakeLock?.request('screen')) ?? null;
  } catch {
    verrouEcran = null;
  }
}
export function libererEcran() {
  try {
    verrouEcran?.release();
  } catch {
    /* sans importance */
  }
  verrouEcran = null;
}

/**
 * Installe la salle sur la page.
 *
 * @param {object} config
 * @param {object} config.jeu           module du jeu (creerSoiree, ajouterJoueur, …)
 * @param {string[]} config.ecrans      identifiants des écrans propres au jeu
 * @param {Function} config.peutLancer  (soiree) => null ou un message de blocage
 * @param {Function} config.surLancer   () => démarre une manche
 * @param {Function} [config.surRendu]  (soiree) => rafraîchit les blocs du jeu
 * @param {Function} [config.surCloture] () => nettoie ce que le jeu affichait
 */
export function installerSalle(config) {
  const { jeu } = config;
  const lien = creerLien(jeu);
  const etat = { soiree: null };

  const ecrans = ['depart', 'salon', 'recap', ...(config.ecrans ?? [])];

  const montrerEcran = (nom) => {
    for (const cle of ecrans) {
      const element = $(`ecran-${cle}`);
      if (element) element.hidden = cle !== nom;
    }
    document.body.style.overflow = nom === 'tour' ? 'hidden' : '';
  };

  const signalerErreur = (erreur, contexte = 'salon') => {
    const cible = contexte === 'depart' ? $('erreur-depart') : $('erreur-salon');
    afficherMessage(cible, erreur?.message ?? 'Une erreur est survenue.', 6000);
  };

  const ecrireUrl = () => {
    if (!etat.soiree) return;
    window.history.replaceState(null, '', `#${lien.versFragment(etat.soiree)}`);
  };

  const rendre = () => {
    const soiree = etat.soiree;
    if (!soiree) return;
    $('nom-soiree').textContent = soiree.nom;
    $('valeur-code').textContent = soiree.code;
    $('compteur-manches').textContent = `${soiree.manches} ${pluriel(soiree.manches, 'manche')}`;
    rendreJoueurs(soiree);
    rendrePodium(soiree);
    const radio = document.querySelector(`#choix-duree input[value="${soiree.reglages.duree}"]`);
    if (radio) radio.checked = true;
    config.surRendu?.(soiree);
    majBoutonLancer(soiree);
  };

  const majSoiree = () => {
    rendre();
    ecrireUrl();
  };

  function majBoutonLancer(soiree) {
    const bouton = $('btn-lancer');
    if (!bouton) return;
    const blocage = config.peutLancer?.(soiree) ?? null;
    bouton.disabled = Boolean(blocage);
    afficherMessage($('note-joueurs'), blocage ?? '');
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
          jeu.retirerJoueur(soiree, joueur.id);
          majSoiree();
        } catch (erreur) {
          signalerErreur(erreur);
        }
      });

      li.append(pastille, nom, score);
      config.decorerJoueur?.(li, joueur, soiree, majSoiree);
      li.append(retirer);
      liste.append(li);
    }

    $('compteur-joueurs').textContent = `${soiree.joueurs.length} / ${REGLES.maxJoueurs}`;
    $('champ-joueur').disabled = soiree.joueurs.length >= REGLES.maxJoueurs;
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
    jeu.classement(soiree).forEach((joueur, index) => {
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

  function construireChoixDuree() {
    const conteneur = $('choix-duree');
    if (!conteneur) return;
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
          jeu.majReglages(etat.soiree, { duree });
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

  function ouvrirSoiree(nom) {
    try {
      etat.soiree = jeu.creerSoiree({ nom });
    } catch (erreur) {
      signalerErreur(erreur, 'depart');
      return;
    }
    majSoiree();
    montrerEcran('salon');
    afficherMessage($('info-salon'), 'Soirée ouverte. Ajoute les joueurs pour commencer !', 6000);
    $('champ-joueur').focus();
  }

  function reprendre(valeur, { silencieux = false } = {}) {
    try {
      etat.soiree = lien.depuisFragment(valeur);
    } catch (erreur) {
      afficherMessage($('erreur-depart'), silencieux ? 'Ce lien de soirée est illisible.' : erreur.message, 6000);
      window.history.replaceState(null, '', window.location.pathname);
      montrerEcran('depart');
      return false;
    }
    majSoiree();
    montrerEcran('salon');
    return true;
  }

  async function transferer() {
    const url = lien.lienPartageable(etat.soiree);
    try {
      await navigator.clipboard.writeText(url);
      afficherMessage($('info-salon'), 'Lien de la soirée copié ! Ouvre-le sur l’autre téléphone pour y poursuivre la partie.', 9000);
    } catch {
      afficherMessage($('info-salon'), 'Copie impossible : le lien de la soirée est dans la barre d’adresse.', 9000);
    }
  }

  function cloturer() {
    if (!window.confirm('Clôturer la soirée ? Joueurs et scores seront effacés immédiatement et définitivement.')) return;
    etat.soiree = null;
    config.surCloture?.();
    window.history.replaceState(null, '', window.location.pathname);
    montrerEcran('depart');
    afficherMessage($('erreur-depart'), '');
    if ($('champ-lien')) $('champ-lien').value = '';
  }

  function brancher() {
    $('form-creer').addEventListener('submit', (e) => {
      e.preventDefault();
      ouvrirSoiree($('champ-nom-soiree').value.trim());
    });

    $('form-reprendre').addEventListener('submit', (e) => {
      e.preventDefault();
      const valeur = $('champ-lien').value.trim();
      if (!valeur) {
        afficherMessage($('erreur-depart'), 'Colle le lien reçu pour reprendre la soirée.', 5000);
        return;
      }
      reprendre(valeur);
    });

    $('form-joueur').addEventListener('submit', (e) => {
      e.preventDefault();
      const nom = $('champ-joueur').value.trim();
      if (!nom) return;
      try {
        jeu.ajouterJoueur(etat.soiree, nom);
        majSoiree();
        $('champ-joueur').value = '';
        $('champ-joueur').focus();
      } catch (erreur) {
        signalerErreur(erreur);
      }
    });

    $('btn-transferer').addEventListener('click', transferer);
    $('btn-cloturer').addEventListener('click', cloturer);
    $('btn-reinitialiser').addEventListener('click', () => {
      if (!window.confirm('Remettre tous les scores de la soirée à zéro ?')) return;
      jeu.reinitialiserScores(etat.soiree);
      majSoiree();
      afficherMessage($('info-salon'), 'Scores remis à zéro.', 4000);
    });
    $('btn-lancer')?.addEventListener('click', () => config.surLancer?.());
    $('btn-retour-salon')?.addEventListener('click', () => montrerEcran('salon'));

    const regles = $('regles');
    if (regles) {
      for (const b of document.querySelectorAll('[data-ouvre-regles]')) {
        b.addEventListener('click', () => regles.showModal());
      }
      for (const b of document.querySelectorAll('[data-ferme-regles]')) {
        b.addEventListener('click', () => regles.close());
      }
      regles.addEventListener('click', (e) => {
        if (e.target === regles) regles.close();
      });
    }

    window.addEventListener('hashchange', () => {
      const fragment = window.location.hash.slice(1);
      if (!fragment) {
        if (etat.soiree) cloturerSansConfirmation();
        return;
      }
      if (etat.soiree && fragment === lien.versFragment(etat.soiree)) return;
      reprendre(fragment, { silencieux: true });
    });

    window.addEventListener('pagehide', libererEcran);
  }

  function cloturerSansConfirmation() {
    etat.soiree = null;
    config.surCloture?.();
    montrerEcran('depart');
  }

  brancher();
  construireChoixDuree();

  const fragment = window.location.hash.slice(1);
  if (fragment) reprendre(fragment, { silencieux: true });

  return {
    get soiree() {
      return etat.soiree;
    },
    montrerEcran,
    majSoiree,
    signalerErreur,
    afficherInfo: (texte, duree = 5000) => afficherMessage($('info-salon'), texte, duree)
  };
}
