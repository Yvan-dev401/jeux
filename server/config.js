// Réglages du serveur. Tout est volontairement borné : une soirée est une
// ressource temporaire, jamais un enregistrement durable.
export const CONFIG = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',

  // Cycle de vie des soirées (aucune écriture disque, aucune base de données)
  maxSessions: Number(process.env.MAX_SESSIONS) || 5000,
  sessionTtlMs: 3 * 60 * 60 * 1000, // 3 h sans activité => la soirée disparaît
  sweepIntervalMs: 60 * 1000,

  // Bornes d'une soirée
  minJoueurs: 2,
  maxJoueurs: 12,
  maxCartesPerso: 300, // par catégorie et par soirée
  maxLongueurNom: 24,
  maxLongueurCarte: 80,
  dureesChrono: [30, 60, 90, 120, 180],
  dureeChronoDefaut: 60,
  maxTirage: 60,

  // Garde-fous HTTP
  maxCorpsRequete: 16 * 1024
};
