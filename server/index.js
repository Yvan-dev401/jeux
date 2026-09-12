// Serveur HTTP sans dépendance : fichiers statiques + API des soirées.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname, sep } from 'node:path';
import { CONFIG } from './config.js';
import { gererApi, repondreJson } from './api.js';
import { purger } from './sessions.js';

const ici = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ici, '..', 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};

function cheminSur(cheminUrl) {
  let decode;
  try {
    decode = decodeURIComponent(cheminUrl.split('?')[0]);
  } catch {
    return null; // URL mal encodée
  }
  const relatif = normalize(decode).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const absolu = join(RACINE, relatif);
  if (absolu !== RACINE && !absolu.startsWith(RACINE + sep)) return null;
  return absolu;
}

async function trouverFichier(absolu) {
  try {
    const infos = await stat(absolu);
    if (infos.isDirectory()) {
      const index = join(absolu, 'index.html');
      const infosIndex = await stat(index);
      return infosIndex.isFile() ? { chemin: index, infos: infosIndex } : null;
    }
    return { chemin: absolu, infos };
  } catch {
    return null;
  }
}

async function servirStatique(requete, reponse, cheminUrl) {
  const absolu = cheminSur(cheminUrl);
  if (!absolu) {
    reponse.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return reponse.end('Chemin invalide');
  }

  let cible = await trouverFichier(absolu);
  if (!cible && !extname(absolu)) cible = await trouverFichier(`${absolu}.html`);

  if (!cible) {
    const page404 = await trouverFichier(join(RACINE, '404.html'));
    if (page404) {
      reponse.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return createReadStream(page404.chemin).pipe(reponse);
    }
    reponse.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return reponse.end('Page introuvable');
  }

  const type = TYPES[extname(cible.chemin).toLowerCase()] || 'application/octet-stream';
  const cache = cible.chemin.endsWith('.html')
    ? 'no-cache'
    : 'public, max-age=3600';

  reponse.writeHead(200, {
    'Content-Type': type,
    'Content-Length': cible.infos.size,
    'Cache-Control': cache,
    'X-Content-Type-Options': 'nosniff'
  });
  if (requete.method === 'HEAD') return reponse.end();
  createReadStream(cible.chemin).pipe(reponse);
}

const serveur = createServer((requete, reponse) => {
  const chemin = (requete.url || '/').split('?')[0];

  reponse.setHeader('Referrer-Policy', 'same-origin');
  reponse.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (chemin.startsWith('/api/')) {
    const methodes = ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'];
    if (!methodes.includes(requete.method)) {
      return repondreJson(reponse, 405, { erreur: 'Méthode non autorisée.' });
    }
    return gererApi(requete, reponse, chemin);
  }

  if (requete.method !== 'GET' && requete.method !== 'HEAD') {
    reponse.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return reponse.end('Méthode non autorisée');
  }

  servirStatique(requete, reponse, chemin).catch((erreur) => {
    console.error('Erreur statique:', erreur.message);
    if (!reponse.headersSent) reponse.writeHead(500);
    reponse.end('Erreur interne');
  });
});

const balai = setInterval(() => {
  const supprimees = purger();
  if (supprimees > 0) console.log(`Purge : ${supprimees} soirée(s) expirée(s) effacée(s).`);
}, CONFIG.sweepIntervalMs);
balai.unref();

function arreter(signal) {
  console.log(`\n${signal} reçu, arrêt du serveur (les soirées en mémoire sont perdues).`);
  serveur.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', () => arreter('SIGINT'));
process.on('SIGTERM', () => arreter('SIGTERM'));

serveur.listen(CONFIG.port, CONFIG.host, () => {
  console.log(`Jeux — serveur prêt sur http://localhost:${CONFIG.port}`);
});

export { serveur };
