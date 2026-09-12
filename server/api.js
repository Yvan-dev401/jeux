// Routes JSON pour les soirées. Chaque route travaille sur la mémoire vive :
// rien n'est écrit, rien n'est journalisé côté contenu de partie.
import { CONFIG } from './config.js';
import * as store from './sessions.js';
import { ErreurSoiree } from './sessions.js';
import { paquetDeBase, tirerCombinaisons } from './paquet.js';

const ok = (corps, statut = 200) => ({ statut, corps });

function lireCorps(requete) {
  return new Promise((resoudre, rejeter) => {
    let donnees = '';
    let taille = 0;
    let depassement = false;
    requete.on('data', (morceau) => {
      if (depassement) return;
      taille += morceau.length;
      if (taille > CONFIG.maxCorpsRequete) {
        // On arrête de lire, mais sans couper la socket : la réponse 413 doit
        // pouvoir partir avant la fermeture.
        depassement = true;
        requete.pause();
        rejeter(new ErreurSoiree(413, 'Requête trop volumineuse.'));
        return;
      }
      donnees += morceau;
    });
    requete.on('end', () => {
      if (!donnees.trim()) return resoudre({});
      try {
        const valeur = JSON.parse(donnees);
        if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) {
          return rejeter(new ErreurSoiree(400, 'Corps JSON invalide.'));
        }
        resoudre(valeur);
      } catch {
        rejeter(new ErreurSoiree(400, 'Corps JSON invalide.'));
      }
    });
    requete.on('error', () => rejeter(new ErreurSoiree(400, 'Lecture de la requête impossible.')));
  });
}

const ROUTES = [
  {
    methode: 'GET',
    motif: /^\/api\/sante$/,
    gerer: () => ok({ etat: 'ok', ...store.statistiques(), paquet: paquetDeBase })
  },
  {
    methode: 'GET',
    motif: /^\/api\/paquet$/,
    gerer: () => ok({ paquet: paquetDeBase, limites: limitesPubliques() })
  },
  {
    methode: 'POST',
    motif: /^\/api\/soirees$/,
    gerer: (_p, corps) => ok({ soiree: store.vueSoiree(store.creerSoiree(corps)) }, 201)
  },
  {
    methode: 'GET',
    motif: /^\/api\/soirees\/([A-Za-z0-9]{3,8})$/,
    gerer: ([code]) => ok({ soiree: store.vueSoiree(store.lireSoiree(code)) })
  },
  {
    methode: 'DELETE',
    motif: /^\/api\/soirees\/([A-Za-z0-9]{3,8})$/,
    gerer: ([code]) => {
      store.supprimerSoiree(code);
      return ok({ supprimee: true, message: 'Soirée clôturée, toutes ses données sont effacées.' });
    }
  },
  {
    methode: 'PATCH',
    motif: /^\/api\/soirees\/([A-Za-z0-9]{3,8})\/reglages$/,
    gerer: ([code], corps) => ok({ soiree: store.vueSoiree(store.majReglages(code, corps)) })
  },
  {
    methode: 'POST',
    motif: /^\/api\/soirees\/([A-Za-z0-9]{3,8})\/joueurs$/,
    gerer: ([code], corps) => {
      const { soiree, joueur } = store.ajouterJoueur(code, corps.nom);
      return ok({ soiree: store.vueSoiree(soiree), joueur }, 201);
    }
  },
  {
    methode: 'DELETE',
    motif: /^\/api\/soirees\/([A-Za-z0-9]{3,8})\/joueurs\/([0-9a-f-]{36})$/,
    gerer: ([code, joueurId]) => ok({ soiree: store.vueSoiree(store.retirerJoueur(code, joueurId)) })
  },
  {
    methode: 'POST',
    motif: /^\/api\/soirees\/([A-Za-z0-9]{3,8})\/cartes$/,
    gerer: ([code], corps) => {
      const { soiree, carte } = store.ajouterCarte(code, corps.categorie, corps.texte);
      return ok({ soiree: store.vueSoiree(soiree), carte }, 201);
    }
  },
  {
    methode: 'DELETE',
    motif: /^\/api\/soirees\/([A-Za-z0-9]{3,8})\/cartes\/(personnages|actions)\/([0-9a-f-]{36})$/,
    gerer: ([code, categorie, carteId]) =>
      ok({ soiree: store.vueSoiree(store.retirerCarte(code, categorie, carteId)) })
  },
  {
    methode: 'POST',
    motif: /^\/api\/soirees\/([A-Za-z0-9]{3,8})\/tirage$/,
    gerer: ([code], corps) => {
      const soiree = store.lireSoiree(code);
      return ok({ tirage: tirerCombinaisons(soiree, corps.nombre) });
    }
  },
  {
    methode: 'POST',
    motif: /^\/api\/soirees\/([A-Za-z0-9]{3,8})\/manches$/,
    gerer: ([code], corps) => {
      const { soiree, joueur } = store.enregistrerManche(code, corps);
      return ok({ soiree: store.vueSoiree(soiree), joueur });
    }
  },
  {
    methode: 'POST',
    motif: /^\/api\/soirees\/([A-Za-z0-9]{3,8})\/reinitialiser$/,
    gerer: ([code]) => ok({ soiree: store.vueSoiree(store.reinitialiserScores(code)) })
  }
];

function limitesPubliques() {
  return {
    minJoueurs: CONFIG.minJoueurs,
    maxJoueurs: CONFIG.maxJoueurs,
    maxCartesPerso: CONFIG.maxCartesPerso,
    maxLongueurNom: CONFIG.maxLongueurNom,
    maxLongueurCarte: CONFIG.maxLongueurCarte,
    dureesChrono: CONFIG.dureesChrono,
    dureeChronoDefaut: CONFIG.dureeChronoDefaut,
    dureeVieSoireeMs: CONFIG.sessionTtlMs
  };
}

export async function gererApi(requete, reponse, chemin) {
  const methode = requete.method === 'HEAD' ? 'GET' : requete.method;
  let routeConnue = false;

  for (const route of ROUTES) {
    const correspondance = route.motif.exec(chemin);
    if (!correspondance) continue;
    routeConnue = true;
    if (route.methode !== methode) continue;

    try {
      const corps = methode === 'GET' || methode === 'DELETE' ? {} : await lireCorps(requete);
      const { statut, corps: charge } = await route.gerer(correspondance.slice(1), corps);
      return repondreJson(reponse, statut, charge);
    } catch (erreur) {
      if (erreur instanceof ErreurSoiree) {
        repondreJson(reponse, erreur.statut, { erreur: erreur.message });
        if (erreur.statut === 413) requete.destroy();
        return;
      }
      console.error('Erreur API:', erreur.message);
      return repondreJson(reponse, 500, { erreur: 'Erreur interne du serveur.' });
    }
  }

  return repondreJson(
    reponse,
    routeConnue ? 405 : 404,
    { erreur: routeConnue ? 'Méthode non autorisée.' : 'Route inconnue.' }
  );
}

export function repondreJson(reponse, statut, charge) {
  const corps = JSON.stringify(charge);
  reponse.writeHead(statut, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(corps),
    'Cache-Control': 'no-store'
  });
  reponse.end(corps);
}
