// Les moteurs des trois autres jeux du catalogue. Comme celui de « Ta mère en
// slip », ils ne touchent pas au DOM et se testent directement avec Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerLien } from '../assets/js/noyau.js';

import * as mime from '../assets/js/mime-ou-rien.js';
import * as piege from '../assets/js/mot-piege.js';
import * as qui from '../assets/js/qui-a-dit-ca.js';

const remplir = (jeu, noms) => {
  const soiree = jeu.creerSoiree({ nom: 'Test' });
  const joueurs = noms.map((n) => jeu.ajouterJoueur(soiree, n));
  return { soiree, joueurs };
};

/* ------------------------------- Mime ou rien ------------------------------ */

test('mime : les joueurs se répartissent en deux équipes équilibrées', () => {
  const { soiree } = remplir(mime, ['Léa', 'Yvan', 'Sam', 'Nina', 'Ezra']);
  assert.equal(mime.equipeDe(soiree, 'a').length, 3);
  assert.equal(mime.equipeDe(soiree, 'b').length, 2);
  assert.ok(mime.equipesPretes(soiree), 'deux joueurs minimum par équipe');
});

test('mime : on peut changer un joueur d’équipe', () => {
  const { soiree, joueurs } = remplir(mime, ['Léa', 'Yvan', 'Sam', 'Nina']);
  const avant = joueurs[0].equipe;
  mime.changerEquipe(soiree, joueurs[0].id);
  assert.notEqual(joueurs[0].equipe, avant);
});

test('mime : le mimeur vient de l’équipe qui a le moins joué', () => {
  const { soiree, joueurs } = remplir(mime, ['Léa', 'Yvan', 'Sam', 'Nina']);
  const premier = mime.prochainMimeur(soiree);
  mime.enregistrerManche(soiree, { joueurId: premier.id, points: 6, trouvees: 4 });
  const second = mime.prochainMimeur(soiree);
  assert.notEqual(second.equipe, premier.equipe, 'l’autre équipe prend la main');
  assert.equal(mime.scoreEquipe(soiree, premier.equipe), 6);
  assert.equal(mime.scoreEquipe(soiree, second.equipe), 0);
  assert.equal(joueurs.find((j) => j.id === premier.id).trouvees, 4);
});

test('mime : la pioche ne répète pas un mime tant qu’elle n’est pas épuisée', () => {
  const { soiree } = remplir(mime, ['Léa', 'Yvan', 'Sam', 'Nina']);
  const lot = mime.tirerMimes(soiree, 40);
  assert.equal(lot.length, 40);
  assert.equal(new Set(lot.map((m) => m.texte)).size, 40);
  for (const carte of lot) {
    assert.ok(carte.points >= 1 && carte.points <= 3);
    assert.ok(typeof carte.texte === 'string' && carte.texte.length > 0);
  }
});

test('mime : les équipes survivent au lien', () => {
  const { soiree, joueurs } = remplir(mime, ['Léa', 'Yvan', 'Sam', 'Nina']);
  mime.enregistrerManche(soiree, { joueurId: joueurs[0].id, points: 5, trouvees: 3 });
  const { versFragment, depuisFragment } = creerLien(mime);
  const reprise = depuisFragment(versFragment(soiree));
  assert.deepEqual(
    reprise.joueurs.map((j) => [j.nom, j.equipe, j.score]),
    soiree.joueurs.map((j) => [j.nom, j.equipe, j.score])
  );
});

/* -------------------------------- Mot piégé -------------------------------- */

test('piégé : un seul joueur reçoit l’autre mot', () => {
  const { soiree } = remplir(piege, ['Léa', 'Yvan', 'Sam', 'Nina', 'Ezra']);
  const manche = piege.distribuer(soiree);
  const mots = soiree.joueurs.map((j) => piege.motPour(soiree, j.id));
  const intrus = mots.filter((m) => m === manche.motIntrus);
  assert.equal(intrus.length, 1, 'un seul intrus');
  assert.notEqual(manche.motGroupe, manche.motIntrus);
  assert.equal(manche.ordre.length, 5, 'tout le monde regarde son mot');
});

test('piégé : la distribution passe par tous les joueurs', () => {
  const { soiree } = remplir(piege, ['Léa', 'Yvan', 'Sam', 'Nina']);
  piege.distribuer(soiree);
  const vus = [];
  while (!piege.distributionTerminee(soiree)) {
    vus.push(piege.joueurCourant(soiree).id);
    piege.passerAuSuivant(soiree);
  }
  assert.equal(new Set(vus).size, 4);
  assert.equal(piege.joueurCourant(soiree), null);
});

test('piégé : démasquer l’intrus fait marquer tous les autres', () => {
  const { soiree } = remplir(piege, ['Léa', 'Yvan', 'Sam', 'Nina']);
  const manche = piege.distribuer(soiree);
  const issue = piege.voter(soiree, manche.intrusId);
  assert.equal(issue.demasque, true);
  for (const joueur of soiree.joueurs) {
    assert.equal(joueur.score, joueur.id === manche.intrusId ? 0 : piege.POINTS_GROUPE);
  }
  assert.equal(soiree.manches, 1);
});

test('piégé : un intrus qui passe inaperçu rafle la mise', () => {
  const { soiree } = remplir(piege, ['Léa', 'Yvan', 'Sam', 'Nina']);
  const manche = piege.distribuer(soiree);
  const innocent = soiree.joueurs.find((j) => j.id !== manche.intrusId);
  const issue = piege.voter(soiree, innocent.id);
  assert.equal(issue.demasque, false);
  assert.equal(soiree.joueurs.find((j) => j.id === manche.intrusId).score, piege.POINTS_INTRUS);
  assert.equal(innocent.score, 0);
  assert.throws(() => piege.voter(soiree, innocent.id), /déjà terminée/);
});

test('piégé : le lien ne transporte jamais l’identité de l’intrus', () => {
  const { soiree } = remplir(piege, ['Léa', 'Yvan', 'Sam', 'Nina']);
  const manche = piege.distribuer(soiree);
  const { versFragment, depuisFragment } = creerLien(piege);
  const fragment = versFragment(soiree);
  assert.equal(fragment.includes(manche.intrusId), false);
  assert.equal(JSON.stringify(piege.instantane(soiree)).includes(manche.motIntrus), false);
  assert.equal(depuisFragment(fragment).manche, null);
});

test('piégé : il faut au moins quatre joueurs', () => {
  const { soiree } = remplir(piege, ['Léa', 'Yvan', 'Sam']);
  assert.throws(() => piege.distribuer(soiree), /au moins 4 joueurs/);
});

/* ------------------------------ Qui a dit ça ? ----------------------------- */

test('qui : tout le monde répond sauf le meneur', () => {
  const { soiree, joueurs } = remplir(qui, ['Léa', 'Yvan', 'Sam', 'Nina']);
  const manche = qui.demarrerManche(soiree, joueurs[0].id);
  assert.equal(manche.ordre.length, 3);
  assert.equal(manche.ordre.includes(joueurs[0].id), false);
  assert.ok(manche.question.length > 0);
});

test('qui : la collecte avance joueur par joueur', () => {
  const { soiree, joueurs } = remplir(qui, ['Léa', 'Yvan', 'Sam', 'Nina']);
  qui.demarrerManche(soiree, joueurs[0].id);
  let tour = 0;
  while (!qui.collecteTerminee(soiree)) {
    const auteur = qui.auteurCourant(soiree);
    assert.notEqual(auteur.id, joueurs[0].id, 'le meneur ne répond pas');
    qui.repondre(soiree, `réponse ${(tour += 1)}`);
  }
  assert.equal(soiree.manche.reponses.length, 3);
  assert.equal(new Set(soiree.manche.reponses.map((r) => r.auteurId)).size, 3);
});

test('qui : deviner rapporte au meneur, rester anonyme rapporte à l’auteur', () => {
  const { soiree, joueurs } = remplir(qui, ['Léa', 'Yvan', 'Sam', 'Nina']);
  const [meneur, ...autres] = joueurs;
  qui.demarrerManche(soiree, meneur.id);
  while (!qui.collecteTerminee(soiree)) qui.repondre(soiree, `réponse de ${qui.auteurCourant(soiree).nom}`);

  const reponses = soiree.manche.reponses;
  // Le meneur trouve la première, se trompe sur les deux autres.
  const attributions = {
    [reponses[0].id]: reponses[0].auteurId,
    [reponses[1].id]: meneur.id,
    [reponses[2].id]: meneur.id
  };
  const issue = qui.attribuer(soiree, attributions);

  assert.equal(issue.justes, 1);
  assert.equal(issue.total, 3);
  assert.equal(meneur.score, qui.POINTS_BONNE_ATTRIBUTION);
  const demasque = autres.find((j) => j.id === reponses[0].auteurId);
  assert.equal(demasque.score, 0, 'démasqué, donc aucun point');
  for (const r of reponses.slice(1)) {
    assert.equal(soiree.joueurs.find((j) => j.id === r.auteurId).score, qui.POINTS_NON_DEMASQUE);
  }
  assert.equal(meneur.menees, 1);
});

test('qui : une réponse vide ou trop longue est refusée', () => {
  const { soiree, joueurs } = remplir(qui, ['Léa', 'Yvan', 'Sam']);
  qui.demarrerManche(soiree, joueurs[0].id);
  assert.throws(() => qui.repondre(soiree, '   '), /vide/);
  assert.throws(() => qui.repondre(soiree, 'x'.repeat(200)), /limité/);
});

test('qui : ni la question ni les réponses ne voyagent dans le lien', () => {
  const { soiree, joueurs } = remplir(qui, ['Léa', 'Yvan', 'Sam']);
  qui.demarrerManche(soiree, joueurs[0].id);
  qui.repondre(soiree, 'un secret bien gardé');
  const { versFragment, depuisFragment } = creerLien(qui);
  const fragment = versFragment(soiree);
  assert.equal(JSON.stringify(qui.instantane(soiree)).includes('secret'), false);
  assert.equal(depuisFragment(fragment).manche, null);
});

test('qui : le meneur tourne', () => {
  const { soiree, joueurs } = remplir(qui, ['Léa', 'Yvan', 'Sam']);
  const premier = qui.prochainMeneur(soiree);
  qui.demarrerManche(soiree, premier.id);
  while (!qui.collecteTerminee(soiree)) qui.repondre(soiree, 'bla');
  qui.attribuer(soiree, {});
  assert.notEqual(qui.prochainMeneur(soiree).id, premier.id);
  assert.ok(joueurs.length === 3);
});
