// Bascule plein écran.
//
// Sur ordinateur et sur Android, l'API Fullscreen retire toute l'interface du
// navigateur. Safari sur iPhone ne la propose pas pour autre chose qu'une
// vidéo : le bouton s'efface alors au profit d'un conseil, car ajouter le site
// à l'écran d'accueil y donne le même résultat — et même mieux, puisque la
// barre d'adresse disparaît dès l'ouverture.
//
// Le module se branche tout seul sur [data-plein-ecran] et [data-astuce-plein-ecran].

const cible = () => document.documentElement;

const estSupporte = () =>
  Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);

const elementActif = () => document.fullscreenElement || document.webkitFullscreenElement || null;

/** Vrai quand la page tourne déjà sans interface de navigateur. */
export const dejaSansNavigateur = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  window.navigator.standalone === true;

export async function entrer() {
  const element = cible();
  const demande = element.requestFullscreen || element.webkitRequestFullscreen;
  if (!demande) return false;
  try {
    await demande.call(element, { navigationUI: 'hide' });
    return true;
  } catch {
    // Refus du navigateur (geste utilisateur manquant, politique de la page…).
    return false;
  }
}

export async function sortir() {
  const quitter = document.exitFullscreen || document.webkitExitFullscreen;
  if (!quitter) return false;
  try {
    await quitter.call(document);
    return true;
  } catch {
    return false;
  }
}

export const basculer = () => (elementActif() ? sortir() : entrer());

/**
 * Branche les boutons de la page. Renvoie `true` si le plein écran est
 * réellement disponible ici.
 */
export function installerPleinEcran() {
  const boutons = [...document.querySelectorAll('[data-plein-ecran]')];
  const astuces = [...document.querySelectorAll('[data-astuce-plein-ecran]')];

  // Déjà lancé depuis l'écran d'accueil : il n'y a plus rien à masquer.
  if (dejaSansNavigateur()) {
    for (const bouton of boutons) bouton.hidden = true;
    for (const astuce of astuces) astuce.hidden = true;
    return false;
  }

  if (!estSupporte()) {
    for (const bouton of boutons) bouton.hidden = true;
    for (const astuce of astuces) astuce.hidden = false;
    return false;
  }

  for (const astuce of astuces) astuce.hidden = true;

  const rafraichir = () => {
    const actif = Boolean(elementActif());
    for (const bouton of boutons) {
      bouton.textContent = actif ? 'Quitter le plein écran' : 'Plein écran';
      bouton.setAttribute('aria-pressed', String(actif));
    }
    document.documentElement.classList.toggle('est-plein-ecran', actif);
  };

  for (const bouton of boutons) {
    bouton.hidden = false;
    bouton.setAttribute('aria-pressed', 'false');
    bouton.addEventListener('click', async () => {
      const reussi = await basculer();
      // Le navigateur peut refuser sans lever d'erreur : on remet le libellé
      // en accord avec la réalité plutôt qu'avec notre intention.
      if (!reussi) rafraichir();
    });
  }

  document.addEventListener('fullscreenchange', rafraichir);
  document.addEventListener('webkitfullscreenchange', rafraichir);
  rafraichir();
  return true;
}
