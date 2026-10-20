// Moteur de « Mot de passe » : binômes, pioche, comptage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerLien } from '../assets/js/noyau.js';
import * as jeu from '../assets/js/mot-de-passe.js';

const remplir = (noms) => {
  const soiree = jeu.creerSoiree({ nom: 'Test' });
  const joueurs = noms.map((n) => jeu.ajouterJoueur(soiree, n));
  return { soiree, joueurs };
};

test('les binômes sont les paires consécutives de la liste', () => {
  const { soiree, joueurs } = remplir(['Léa', 'Yvan', 'Sam', 'Nina']);
  const { paires, seul } = jeu.binomes(soiree);
  assert.equal(paires.length, 2);
  assert.deepEqual(paires[0].map((j) => j.nom), ['Léa', 'Yvan']);
  assert.deepEqual(paires[1].map((j) => j.nom), ['Sam', 'Nina']);
  assert.equal(seul, null);
  assert.equal(joueurs.length, 4);
});

test('en nombre impair, un joueur reste sur la touche', () => {
  const { soiree } = remplir(['Léa', 'Yvan', 'Sam']);
  const { paires, seul } = jeu.binomes(soiree);
  assert.equal(paires.length, 1);
  assert.equal(seul.nom, 'Sam');
});

test('mélanger refait les binômes sans perdre personne', () => {
  const { soiree } = remplir(['Léa', 'Yvan', 'Sam', 'Nina', 'Ezra', 'Rea']);
  const avant = soiree.joueurs.map((j) => j.nom).sort();
  jeu.melangerBinomes(soiree);
  assert.deepEqual(soiree.joueurs.map((j) => j.nom).sort(), avant);
  assert.equal(jeu.binomes(soiree).paires.length, 3);
});

test('les deux coéquipiers marquent le même total', () => {
  const { soiree, joueurs } = remplir(['Léa', 'Yvan', 'Sam', 'Nina']);
  const [lea, yvan] = joueurs;
  jeu.enregistrerManche(soiree, {
    donneurId: lea.id, devineurId: yvan.id, points: 7, trouves: 7
  });
  assert.equal(lea.score, 7);
  assert.equal(yvan.score, 7, 'le binôme marque ensemble, pas chacun une part');
  assert.equal(jeu.scoreBinome([lea, yvan]), 7);
  assert.equal(lea.manchesJouees, 1);
  assert.equal(yvan.manchesJouees, 1);
  assert.equal(soiree.manches, 1);
});

test('le rôle de donneur alterne dans le binôme', () => {
  const { soiree, joueurs } = remplir(['Léa', 'Yvan']);
  const paire = jeu.binomes(soiree).paires[0];
  const premier = jeu.donneurDe(paire);
  jeu.enregistrerManche(soiree, {
    donneurId: premier.id, devineurId: joueurs.find((j) => j !== premier).id,
    points: 3, trouves: 3
  });
  assert.notEqual(jeu.donneurDe(paire).id, premier.id, 'c’est à l’autre de donner');
});

test('le binôme qui a le moins joué prend la main', () => {
  const { soiree, joueurs } = remplir(['Léa', 'Yvan', 'Sam', 'Nina']);
  jeu.enregistrerManche(soiree, {
    donneurId: joueurs[0].id, devineurId: joueurs[1].id, points: 4, trouves: 4
  });
  assert.deepEqual(jeu.prochainBinome(soiree).map((j) => j.nom), ['Sam', 'Nina']);
});

test('un binôme mal formé est refusé', () => {
  const { soiree, joueurs } = remplir(['Léa', 'Yvan']);
  assert.throws(
    () => jeu.enregistrerManche(soiree, { donneurId: joueurs[0].id, devineurId: joueurs[0].id, points: 1, trouves: 1 }),
    /deux joueurs différents/
  );
  assert.throws(
    () => jeu.enregistrerManche(soiree, { donneurId: joueurs[0].id, devineurId: 'inconnu', points: 1, trouves: 1 }),
    /introuvable/
  );
  assert.throws(
    () => jeu.enregistrerManche(soiree, { donneurId: joueurs[0].id, devineurId: joueurs[1].id, points: 1, trouves: -2 }),
    /Décompte de mots invalide/
  );
  assert.equal(joueurs[0].score, 0, 'aucun point accordé sur une manche refusée');
});

test('la pioche ne répète pas un mot tant qu’elle n’est pas épuisée', () => {
  const { soiree } = remplir(['Léa', 'Yvan']);
  const lot = jeu.tirerMots(soiree, 40);
  assert.equal(lot.length, 40);
  assert.equal(new Set(lot).size, 40);
  assert.ok(lot.every((m) => typeof m === 'string' && m.length > 0));
});

test('les binômes et les rôles survivent au lien', () => {
  const { soiree, joueurs } = remplir(['Léa', 'Yvan', 'Sam', 'Nina']);
  jeu.enregistrerManche(soiree, {
    donneurId: joueurs[0].id, devineurId: joueurs[1].id, points: 5, trouves: 5
  });
  const { versFragment, depuisFragment } = creerLien(jeu);
  const reprise = depuisFragment(versFragment(soiree));

  assert.deepEqual(
    reprise.joueurs.map((j) => [j.nom, j.score, j.donnees]),
    soiree.joueurs.map((j) => [j.nom, j.score, j.donnees ?? 0])
  );
  assert.deepEqual(
    jeu.binomes(reprise).paires.map((p) => p.map((j) => j.nom)),
    [['Léa', 'Yvan'], ['Sam', 'Nina']],
    'l’ordre des joueurs porte les binômes'
  );
});

test('remettre à zéro efface aussi les rôles', () => {
  const { soiree, joueurs } = remplir(['Léa', 'Yvan']);
  jeu.enregistrerManche(soiree, {
    donneurId: joueurs[0].id, devineurId: joueurs[1].id, points: 6, trouves: 6
  });
  jeu.reinitialiserScores(soiree);
  assert.deepEqual(soiree.joueurs.map((j) => [j.score, j.donnees, j.trouvees]), [[0, 0, 0], [0, 0, 0]]);
  assert.equal(soiree.manches, 0);
});
