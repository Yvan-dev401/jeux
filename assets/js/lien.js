// Le lien d'une soirée « Ta mère en slip », construit sur le noyau commun.
import { creerLien, LONGUEUR_CONFORTABLE, LONGUEUR_MAX } from './noyau.js';
import { instantane, depuisInstantane } from './soiree.js';

export { LONGUEUR_CONFORTABLE, LONGUEUR_MAX };
export const { versFragment, depuisFragment, lienPartageable } = creerLien({
  instantane,
  depuisInstantane
});
