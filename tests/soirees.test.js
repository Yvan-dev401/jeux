import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../server/sessions.js';
import { tirerCombinaisons, paquetDeBase } from '../server/paquet.js';
import { CONFIG } from '../server/config.js';

beforeEach(() => store.toutEffacer());

test('une soirée est créée avec un code lisible et des réglages par défaut', () => {
  const soiree = store.creerSoiree({ nom: 'Samedi chez Léa' });
  assert.match(soiree.code, /^[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(soiree.nom, 'Samedi chez Léa');
  assert.equal(soiree.reglages.duree, CONFIG.dureeChronoDefaut);
  assert.deepEqual(soiree.joueurs, []);
});

test('deux soirées sont indépendantes', () => {
  const a = store.creerSoiree();
  const b = store.creerSoiree();
  store.ajouterJoueur(a.code, 'Léa');
  assert.notEqual(a.code, b.code);
  assert.equal(store.lireSoiree(a.code).joueurs.length, 1);
  assert.equal(store.lireSoiree(b.code).joueurs.length, 0);
});

test('le code est insensible à la casse et aux espaces', () => {
  const soiree = store.creerSoiree();
  assert.equal(store.lireSoiree(` ${soiree.code.toLowerCase()} `).code, soiree.code);
});

test('on accepte jusqu’à 12 joueurs, pas un de plus', () => {
  const { code } = store.creerSoiree();
  for (let i = 0; i < CONFIG.maxJoueurs; i += 1) store.ajouterJoueur(code, `Joueur ${i}`);
  assert.throws(() => store.ajouterJoueur(code, 'Treizième'), /complète/);
});

test('un prénom en double est refusé', () => {
  const { code } = store.creerSoiree();
  store.ajouterJoueur(code, 'Léa');
  assert.throws(() => store.ajouterJoueur(code, ' léa '), /déjà pris/);
});

test('une durée hors liste est refusée', () => {
  const { code } = store.creerSoiree();
  assert.throws(() => store.majReglages(code, { duree: 42 }), /Durée invalide/);
  assert.equal(store.majReglages(code, { duree: 120 }).reglages.duree, 120);
});

test('les cartes ajoutées restent dans leur soirée', () => {
  const a = store.creerSoiree();
  const b = store.creerSoiree();
  store.ajouterCarte(a.code, 'personnages', 'une dompteuse de hamsters');
  assert.equal(store.lireSoiree(a.code).cartesPerso.personnages.length, 1);
  assert.equal(store.lireSoiree(b.code).cartesPerso.personnages.length, 0);
});

test('les scores de manche s’additionnent', () => {
  const { code } = store.creerSoiree();
  const { joueur } = store.ajouterJoueur(code, 'Léa');
  store.enregistrerManche(code, { joueurId: joueur.id, trouvees: 7, passees: 2 });
  store.enregistrerManche(code, { joueurId: joueur.id, trouvees: 3, passees: 0 });
  const vue = store.vueSoiree(store.lireSoiree(code));
  assert.equal(vue.joueurs[0].score, 10);
  assert.equal(vue.joueurs[0].manchesJouees, 2);
  assert.equal(vue.manches, 2);
});

test('clôturer une soirée efface toutes ses données', () => {
  const { code } = store.creerSoiree();
  store.ajouterJoueur(code, 'Léa');
  store.ajouterCarte(code, 'actions', 'je fais du trapèze');
  store.supprimerSoiree(code);
  assert.throws(() => store.lireSoiree(code), /n'existe plus/);
});

test('une soirée inactive expire et disparaît', () => {
  const soiree = store.creerSoiree();
  soiree.vueLe = Date.now() - CONFIG.sessionTtlMs - 1000;
  assert.equal(store.purger(), 1);
  assert.equal(store.statistiques().soireesEnCours, 0);
});

test('le tirage combine un personnage et une action sans répétition', () => {
  const soiree = store.creerSoiree();
  const tirage = tirerCombinaisons(soiree, 30);
  assert.equal(tirage.length, 30);
  assert.equal(new Set(tirage.map((t) => t.cle)).size, 30);
  for (const combinaison of tirage) {
    assert.deepEqual(
      combinaison.parties.map((p) => p.categorie),
      ['personnages', 'actions']
    );
    assert.ok(combinaison.parties.every((p) => typeof p.texte === 'string' && p.texte.length > 0));
  }
});

test('le tirage utilise aussi les cartes ajoutées pendant la soirée', () => {
  const soiree = store.creerSoiree();
  store.majReglages(soiree.code, { categories: ['personnages'] });
  for (let i = 0; i < 40; i += 1) {
    store.ajouterCarte(soiree.code, 'personnages', `personnage maison ${i}`);
  }
  const textes = tirerCombinaisons(soiree, 60).flatMap((t) => t.parties.map((p) => p.texte));
  assert.ok(textes.some((t) => t.startsWith('personnage maison')));
});

test('le paquet de base tient ses promesses', () => {
  assert.ok(paquetDeBase.compte.personnages >= 90, 'au moins 90 personnages');
  assert.ok(paquetDeBase.compte.actions >= 90, 'au moins 90 actions');
  assert.ok(paquetDeBase.combinaisons > 5000, 'des milliers de combinaisons');
});

test('les textes sont nettoyés et bornés', () => {
  const { code } = store.creerSoiree();
  const { joueur } = store.ajouterJoueur(code, '   Léa    Martin  ');
  assert.equal(joueur.nom, 'Léa Martin');
  assert.throws(() => store.ajouterJoueur(code, '   '), /vide/);
  assert.throws(() => store.ajouterCarte(code, 'actions', 'x'.repeat(200)), /limité/);
  assert.throws(() => store.ajouterCarte(code, 'lieux', 'à la plage'), /Catégorie inconnue/);
});
