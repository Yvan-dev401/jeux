// Petit client HTTP pour l'API des soirées.

export class ErreurApi extends Error {
  constructor(message, statut) {
    super(message);
    this.nom = 'ErreurApi';
    this.statut = statut;
  }
}

async function requete(methode, chemin, corps) {
  let reponse;
  try {
    reponse = await fetch(chemin, {
      method: methode,
      headers: corps ? { 'Content-Type': 'application/json' } : undefined,
      body: corps ? JSON.stringify(corps) : undefined
    });
  } catch {
    throw new ErreurApi('Connexion impossible. Vérifie ta connexion internet.', 0);
  }

  let donnees = null;
  const type = reponse.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    donnees = await reponse.json().catch(() => null);
  }

  if (!reponse.ok) {
    throw new ErreurApi(donnees?.erreur || 'Une erreur est survenue.', reponse.status);
  }
  return donnees ?? {};
}

export const api = {
  paquet: () => requete('GET', '/api/paquet'),
  creerSoiree: (nom) => requete('POST', '/api/soirees', nom ? { nom } : {}),
  lireSoiree: (code) => requete('GET', `/api/soirees/${encodeURIComponent(code)}`),
  cloturerSoiree: (code) => requete('DELETE', `/api/soirees/${encodeURIComponent(code)}`),
  majReglages: (code, reglages) =>
    requete('PATCH', `/api/soirees/${encodeURIComponent(code)}/reglages`, reglages),
  ajouterJoueur: (code, nom) =>
    requete('POST', `/api/soirees/${encodeURIComponent(code)}/joueurs`, { nom }),
  retirerJoueur: (code, id) =>
    requete('DELETE', `/api/soirees/${encodeURIComponent(code)}/joueurs/${id}`),
  ajouterCarte: (code, categorie, texte) =>
    requete('POST', `/api/soirees/${encodeURIComponent(code)}/cartes`, { categorie, texte }),
  retirerCarte: (code, categorie, id) =>
    requete('DELETE', `/api/soirees/${encodeURIComponent(code)}/cartes/${categorie}/${id}`),
  tirer: (code, nombre) =>
    requete('POST', `/api/soirees/${encodeURIComponent(code)}/tirage`, { nombre }),
  enregistrerManche: (code, manche) =>
    requete('POST', `/api/soirees/${encodeURIComponent(code)}/manches`, manche),
  reinitialiser: (code) => requete('POST', `/api/soirees/${encodeURIComponent(code)}/reinitialiser`)
};
