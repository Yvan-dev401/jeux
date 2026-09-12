// Entrées en scène au défilement.
//
// Le mouvement fait partie de l'identité du site. Mais du contenu masqué en
// attendant du JavaScript, c'est du contenu qui peut ne jamais s'afficher :
// trois garde-fous l'évitent.
//   1. Le masquage n'est appliqué que si ce script s'exécute (classe sur <html>).
//   2. Ce qui est déjà à l'écran au chargement apparaît tout de suite.
//   3. Un filet de sécurité révèle tout ce qui resterait après 2,5 s.
const cibles = [...document.querySelectorAll('[data-apparition]')];
const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const reveler = (element, rang = 0) => {
  element.style.setProperty('--retard', `${Math.min(rang, 5) * 70}ms`);
  element.classList.add('est-visible');
};

if (cibles.length && !reduit && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('apparitions-actives');

  const observateur = new IntersectionObserver(
    (entrees) => {
      let rang = 0;
      for (const entree of entrees) {
        if (!entree.isIntersecting) continue;
        reveler(entree.target, rang);
        observateur.unobserve(entree.target);
        rang += 1;
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
  );

  for (const cible of cibles) {
    // Déjà visible au chargement : pas d'attente, pas de clignotement.
    if (cible.getBoundingClientRect().top < window.innerHeight) reveler(cible);
    else observateur.observe(cible);
  }

  window.setTimeout(() => {
    for (const cible of cibles) reveler(cible);
    observateur.disconnect();
  }, 2500);
}
