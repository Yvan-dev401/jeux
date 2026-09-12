// Le paquet de base est un fichier statique versionné avec le code.
// Les cartes ajoutées pendant une soirée ne le rejoignent jamais : elles
// restent dans la mémoire de la soirée et disparaissent avec elle.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CONFIG } from './config.js';
import { ErreurSoiree } from './sessions.js';

const ici = dirname(fileURLToPath(import.meta.url));
const chemin = join(ici, '..', 'public', 'assets', 'data', 'cartes.json');

const brut = JSON.parse(readFileSync(chemin, 'utf8'));
const parCategorie = new Map(brut.categories.map((c) => [c.id, c]));

export const paquetDeBase = {
  version: brut.version,
  compte: Object.fromEntries(brut.categories.map((c) => [c.id, c.cartes.length])),
  combinaisons: brut.categories.reduce((total, c) => total * c.cartes.length, 1)
};

function cartesDisponibles(soiree, categorieId) {
  const base = parCategorie.get(categorieId)?.cartes ?? [];
  const perso = soiree.cartesPerso[categorieId]?.map((c) => c.texte) ?? [];
  return base.concat(perso);
}

/**
 * Tire des combinaisons « personnage + action » pour une manche.
 * Les combinaisons déjà vues dans la soirée sont évitées tant que c'est
 * possible ; ce suivi vit lui aussi uniquement en mémoire.
 */
export function tirerCombinaisons(soiree, nombre) {
  const total = Math.min(Math.max(1, Number(nombre) || 20), CONFIG.maxTirage);
  const categories = soiree.reglages.categories;
  const listes = categories.map((id) => ({ id, cartes: cartesDisponibles(soiree, id) }));

  if (listes.some((l) => l.cartes.length === 0)) {
    throw new ErreurSoiree(400, 'Une catégorie sélectionnée est vide.');
  }

  const combinaisonsPossibles = listes.reduce((t, l) => t * l.cartes.length, 1);
  if (soiree.combinaisonsVues.size >= combinaisonsPossibles * 0.8) {
    soiree.combinaisonsVues.clear(); // le paquet est « rebattu »
  }

  const tirage = [];
  const vuesCeTour = new Set();
  let gardeFou = total * 40;

  while (tirage.length < total && gardeFou > 0) {
    gardeFou -= 1;
    const parties = listes.map((l) => {
      const index = Math.floor(Math.random() * l.cartes.length);
      return { categorie: l.id, index, texte: l.cartes[index] };
    });
    const cle = parties.map((p) => `${p.categorie}:${p.index}`).join('|');
    if (vuesCeTour.has(cle) || soiree.combinaisonsVues.has(cle)) continue;
    vuesCeTour.add(cle);
    soiree.combinaisonsVues.add(cle);
    tirage.push({
      cle,
      parties: parties.map((p) => ({ categorie: p.categorie, texte: p.texte }))
    });
  }

  // Paquet trop petit pour remplir la manche sans répétition : on complète.
  while (tirage.length < total) {
    const parties = listes.map((l) => ({
      categorie: l.id,
      texte: l.cartes[Math.floor(Math.random() * l.cartes.length)]
    }));
    tirage.push({ cle: `rep:${tirage.length}`, parties });
  }

  return tirage;
}
