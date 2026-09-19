// Champ de lignes : une grille de traits parcourue par une onde lente.
//
// La structure — grille de traits pivotés par une variable CSS `--rotate` —
// reprend celle du composant MagnetLines de React Bits (https://reactbits.dev,
// licence MIT). L'orientation, en revanche, ne suit plus le pointeur : elle
// est calculée à partir de deux ondes de fréquences volontairement non
// harmoniques, qui se croisent sans jamais retomber sur le même motif.
//
// Conséquences heureuses : l'animation existe aussi sur mobile, où il n'y a pas
// de pointeur, et le rendu ne dépend plus de la position des traits à l'écran —
// donc ni mesure de mise en page, ni recalcul au défilement.

const ANGLE_BASE = 22; // l'inclinaison des obliques d'origine

// Deux ondes : une porteuse ample et lente, une seconde plus courte et plus
// rapide qui la trouble. Les vitesses ne sont pas multiples l'une de l'autre,
// pour que le motif ne se répète pas de façon perceptible.
const ONDES = [
  { amplitude: 32, cyclesX: 1.15, cyclesY: 0.65, vitesse: 0.52 },
  { amplitude: 15, cyclesX: -0.8, cyclesY: 1.35, vitesse: 0.83 }
];

const TAU = Math.PI * 2;

export function creerChampLignes(conteneur, options = {}) {
  const {
    pas = 38, // espacement visé entre deux traits, en pixels
    maxTraits = 520, // garde-fou : au-delà, on desserre la grille
    angleBase = ANGLE_BASE
  } = options;

  if (!conteneur) return null;

  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  let traits = [];
  let positions = []; // position de chaque trait dans la grille, ramenée à 0…1
  let visible = true;
  let trame = 0;
  let derniereTrame = 0;
  let tempsAnime = 0;

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
    positions = [];
    for (let rangee = 0; rangee < rangees; rangee += 1) {
      for (let colonne = 0; colonne < colonnes; colonne += 1) {
        fragment.append(document.createElement('span'));
        positions.push({
          x: colonnes > 1 ? colonne / (colonnes - 1) : 0.5,
          y: rangees > 1 ? rangee / (rangees - 1) : 0.5
        });
      }
    }
    conteneur.replaceChildren(fragment);
    traits = [...conteneur.children];
    rendre(tempsAnime);
  }

  /** Écrit l'angle de chaque trait pour l'instant `temps`, en secondes. */
  function rendre(temps) {
    for (let i = 0; i < traits.length; i += 1) {
      const { x, y } = positions[i];
      let angle = angleBase;
      for (const onde of ONDES) {
        angle +=
          onde.amplitude *
          Math.sin(TAU * (x * onde.cyclesX + y * onde.cyclesY) + temps * onde.vitesse * TAU * 0.16);
      }
      traits[i].style.setProperty('--rotate', `${angle.toFixed(1)}deg`);
    }
  }

  function boucle(maintenant) {
    if (!visible || reduit.matches) {
      trame = 0;
      derniereTrame = 0;
      return;
    }
    // Le pas de temps est borné : après un long passage hors écran ou en
    // arrière-plan, l'onde reprend où elle en était au lieu de sauter.
    const ecoule = derniereTrame ? Math.min(0.05, (maintenant - derniereTrame) / 1000) : 0;
    derniereTrame = maintenant;
    tempsAnime += ecoule;
    rendre(tempsAnime);
    trame = window.requestAnimationFrame(boucle);
  }

  function relancer() {
    if (trame || !visible) return;
    if (reduit.matches) {
      rendre(tempsAnime);
      return;
    }
    derniereTrame = 0;
    trame = window.requestAnimationFrame(boucle);
  }

  // Hors écran, l'animation s'arrête : rien ne tourne pour rien.
  const sentinelle = new IntersectionObserver(
    ([entree]) => {
      visible = entree.isIntersecting;
      if (visible) relancer();
    },
    { rootMargin: '120px' }
  );
  sentinelle.observe(conteneur);

  let tailleConnue = '';
  const observateurTaille = new ResizeObserver(() => {
    const taille = `${conteneur.clientWidth}x${conteneur.clientHeight}`;
    if (taille === tailleConnue) return;
    tailleConnue = taille;
    construire();
  });
  observateurTaille.observe(conteneur);

  reduit.addEventListener?.('change', () => {
    if (reduit.matches) {
      if (trame) window.cancelAnimationFrame(trame);
      trame = 0;
      rendre(tempsAnime);
    } else {
      relancer();
    }
  });

  construire();
  relancer();
  conteneur.dataset.pret = 'oui';
  // C'est le script qui déclare avoir pris la main : le CSS n'a pas à le
  // deviner, et le héros garde ses obliques figées si rien ne s'exécute.
  conteneur.closest('.heros')?.classList.add('champ-actif');

  return {
    detruire() {
      if (trame) window.cancelAnimationFrame(trame);
      observateurTaille.disconnect();
      sentinelle.disconnect();
      conteneur.replaceChildren();
      delete conteneur.dataset.pret;
      conteneur.closest('.heros')?.classList.remove('champ-actif');
    },
    /** Fige le champ à un instant donné : utile pour comparer des rendus. */
    figerA(secondes) {
      if (trame) window.cancelAnimationFrame(trame);
      trame = 0;
      tempsAnime = secondes;
      rendre(secondes);
    },
    get nombreDeTraits() {
      return traits.length;
    }
  };
}
