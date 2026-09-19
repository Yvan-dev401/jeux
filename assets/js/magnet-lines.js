// Champ de lignes magnétiques : une grille de traits qui s'orientent selon la
// position du pointeur.
//
// Portage en JavaScript natif du composant MagnetLines de React Bits
// (https://reactbits.dev, licence MIT). Le site n'utilise ni React ni étape de
// construction : la logique d'orientation est reprise telle quelle, l'ossature
// est réécrite pour le DOM.
//
// Deux écarts assumés par rapport à l'original, imposés par l'usage en fond de
// page plein écran plutôt qu'en carré de 80 vmin :
//   — les centres des traits sont mesurés une fois pour toutes, et non à chaque
//     mouvement de souris : lire la position de plusieurs centaines d'éléments
//     à chaque événement provoquerait un recalcul de mise en page permanent ;
//   — la grille s'adapte à la surface disponible, sous un plafond de traits.

const ANGLE_BASE = 22;

export function creerMagnetLines(conteneur, options = {}) {
  const {
    pas = 38, // espacement visé entre deux traits, en pixels
    maxTraits = 520, // garde-fou : au-delà, on desserre la grille
    angleBase = ANGLE_BASE
  } = options;

  if (!conteneur) return null;

  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  let traits = [];
  let centres = [];
  let visible = true;
  let trameDemandee = 0;
  let dernierPointeur = null;

  /** Construit la grille au plus près de l'espacement voulu, plafond compris. */
  function construire() {
    const largeur = conteneur.clientWidth;
    const hauteur = conteneur.clientHeight;
    if (!largeur || !hauteur) return;

    let ecart = pas;
    let colonnes = Math.max(2, Math.round(largeur / ecart));
    let rangees = Math.max(2, Math.round(hauteur / ecart));
    while (colonnes * rangees > maxTraits) {
      ecart += 4;
      colonnes = Math.max(2, Math.round(largeur / ecart));
      rangees = Math.max(2, Math.round(hauteur / ecart));
    }

    conteneur.style.setProperty('--colonnes', colonnes);
    conteneur.style.setProperty('--rangees', rangees);

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < colonnes * rangees; i += 1) {
      fragment.append(document.createElement('span'));
    }
    conteneur.replaceChildren(fragment);
    traits = [...conteneur.children];
    mesurer();
    orienterDepuisLeCentre();
  }

  /**
   * Mémorise le centre de chaque trait en coordonnées de page : ainsi le
   * défilement ne fausse rien et aucune mesure n'est refaite pendant le
   * mouvement du pointeur.
   */
  function mesurer() {
    const decalageX = window.scrollX;
    const decalageY = window.scrollY;
    centres = traits.map((trait) => {
      const rect = trait.getBoundingClientRect();
      return {
        x: rect.x + rect.width / 2 + decalageX,
        y: rect.y + rect.height / 2 + decalageY
      };
    });
  }

  /** Formule d'origine : le trait se place perpendiculairement au pointeur. */
  function orienter(x, y) {
    for (let i = 0; i < traits.length; i += 1) {
      const centre = centres[i];
      if (!centre) continue;
      const b = x - centre.x;
      const a = y - centre.y;
      const c = Math.sqrt(a * a + b * b) || 1;
      const r = ((Math.acos(b / c) * 180) / Math.PI) * (y > centre.y ? 1 : -1);
      traits[i].style.setProperty('--rotate', `${r}deg`);
    }
  }

  function orienterDepuisLeCentre() {
    if (!centres.length) return;
    const centre = centres[Math.floor(centres.length / 2)];
    if (reduit.matches) {
      for (const trait of traits) trait.style.setProperty('--rotate', `${angleBase}deg`);
      return;
    }
    orienter(centre.x, centre.y);
  }

  function surPointeur(evenement) {
    if (!visible || reduit.matches) return;
    dernierPointeur = { x: evenement.pageX, y: evenement.pageY };
    if (trameDemandee) return;
    trameDemandee = window.requestAnimationFrame(() => {
      trameDemandee = 0;
      if (dernierPointeur) orienter(dernierPointeur.x, dernierPointeur.y);
    });
  }

  // Hors écran, le champ n'a pas à consommer de calcul.
  const sentinelle = new IntersectionObserver(
    ([entree]) => {
      visible = entree.isIntersecting;
    },
    { rootMargin: '120px' }
  );
  sentinelle.observe(conteneur);

  // La grille se refait quand la surface change ; les centres, quand la mise en
  // page bouge sans changer la taille du conteneur.
  let tailleConnue = `${conteneur.clientWidth}x${conteneur.clientHeight}`;
  const observateurTaille = new ResizeObserver(() => {
    const taille = `${conteneur.clientWidth}x${conteneur.clientHeight}`;
    if (taille === tailleConnue) return;
    tailleConnue = taille;
    construire();
  });
  observateurTaille.observe(conteneur);

  window.addEventListener('pointermove', surPointeur, { passive: true });
  reduit.addEventListener?.('change', orienterDepuisLeCentre);

  construire();
  conteneur.dataset.pret = 'oui';
  // C'est le script qui déclare avoir pris la main : le CSS n'a pas à le
  // deviner, et le héros garde ses obliques figées si rien ne s'exécute.
  conteneur.closest('.heros')?.classList.add('magnet-actif');

  return {
    detruire() {
      window.removeEventListener('pointermove', surPointeur);
      reduit.removeEventListener?.('change', orienterDepuisLeCentre);
      observateurTaille.disconnect();
      sentinelle.disconnect();
      if (trameDemandee) window.cancelAnimationFrame(trameDemandee);
      conteneur.replaceChildren();
      delete conteneur.dataset.pret;
      conteneur.closest('.heros')?.classList.remove('magnet-actif');
    },
    get nombreDeTraits() {
      return traits.length;
    }
  };
}
