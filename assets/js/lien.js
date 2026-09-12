// La soirée voyage dans le fragment de l'URL (« #s=… »).
//
// Un fragment n'est pas transmis au serveur qui héberge la page : le contenu
// d'une soirée reste donc sur les appareils qui ouvrent le lien. C'est aussi
// ce qui permet de recharger la page sans perdre la partie en cours.
import { ErreurSoiree, instantane, depuisInstantane } from './soiree.js';

// Au-delà, certaines applis de messagerie coupent le lien à l'envoi.
export const LONGUEUR_CONFORTABLE = 4000;
export const LONGUEUR_MAX = 16000;

function versBase64Url(texte) {
  const octets = new TextEncoder().encode(texte);
  let binaire = '';
  for (const octet of octets) binaire += String.fromCharCode(octet);
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function depuisBase64Url(valeur) {
  const base64 = valeur.replace(/-/g, '+').replace(/_/g, '/');
  const complet = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binaire = atob(complet);
  const octets = Uint8Array.from(binaire, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(octets);
}

/** Encode une soirée en fragment prêt à coller derrière le « # ». */
export function versFragment(soiree) {
  return `s=${versBase64Url(JSON.stringify(instantane(soiree)))}`;
}

/** Reconstruit une soirée depuis un fragment, une URL complète ou un collage. */
export function depuisFragment(valeur) {
  if (typeof valeur !== 'string') throw new ErreurSoiree('Ce lien de soirée est illisible.');
  const apresDiese = valeur.includes('#') ? valeur.slice(valeur.indexOf('#') + 1) : valeur;
  const nettoye = apresDiese.trim().replace(/^#/, '');
  const charge = nettoye.startsWith('s=') ? nettoye.slice(2) : nettoye;

  if (!charge || !/^[A-Za-z0-9\-_]+$/.test(charge)) {
    throw new ErreurSoiree('Ce lien de soirée est illisible.');
  }
  if (charge.length > LONGUEUR_MAX) {
    throw new ErreurSoiree('Ce lien de soirée est trop long pour être lu.');
  }

  let donnees;
  try {
    donnees = JSON.parse(depuisBase64Url(charge));
  } catch {
    throw new ErreurSoiree('Ce lien de soirée est illisible.');
  }
  return depuisInstantane(donnees);
}

/** Lien complet et partageable vers la soirée en cours. */
export function lienPartageable(soiree) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${versFragment(soiree)}`;
}
