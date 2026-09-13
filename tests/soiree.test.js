// Les modules du jeu sont du JavaScript standard, sans DOM : ils se testent
// directement avec le lanceur de tests de Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REGLES,
  PAQUET_DE_BASE,
  creerSoiree,
  ajouterJoueur,
  retirerJoueur,
  majReglages,
  ajouterCarte,
  enregistrerManche,
  reinitialiserScores,
  tirerCombinaisons,
  classement,
  prochainJoueur,
  instantane,
  depuisInstantane
} from '../assets/js/soiree.js';
import { versFragment, depuisFragment } from '../assets/js/lien.js';

test('une soirée s’ouvre avec un code lisible et des réglages par défaut', () => {
  const soiree = creerSoiree({ nom: 'Samedi chez Léa' });
  assert.match(soiree.code, /^[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(soiree.nom, 'Samedi chez Léa');
  assert.equal(soiree.reglages.duree, REGLES.dureeChronoDefaut);
  assert.deepEqual(soiree.joueurs, []);
});

test('deux soirées ouvertes en parallèle sont indépendantes', () => {
  const a = creerSoiree();
  const b = creerSoiree();
  ajouterJoueur(a, 'Léa');
  ajouterCarte(a, 'personnages', 'une dompteuse de hamsters');
  assert.equal(b.joueurs.length, 0);
  assert.equal(b.cartesPerso.personnages.length, 0);
});

test('on accepte jusqu’à 12 joueurs, pas un de plus', () => {
  const soiree = creerSoiree();
  for (let i = 0; i < REGLES.maxJoueurs; i += 1) ajouterJoueur(soiree, `Joueur ${i}`);
  assert.throws(() => ajouterJoueur(soiree, 'Treizième'), /complète/);
});

test('un prénom en double est refusé', () => {
  const soiree = creerSoiree();
  ajouterJoueur(soiree, 'Léa');
  assert.throws(() => ajouterJoueur(soiree, ' léa '), /déjà pris/);
});

test('retirer un joueur le sort du classement', () => {
  const soiree = creerSoiree();
  const lea = ajouterJoueur(soiree, 'Léa');
  ajouterJoueur(soiree, 'Yvan');
  retirerJoueur(soiree, lea.id);
  assert.deepEqual(classement(soiree).map((j) => j.nom), ['Yvan']);
});

test('une durée hors liste est refusée', () => {
  const soiree = creerSoiree();
  assert.throws(() => majReglages(soiree, { duree: 42 }), /Durée invalide/);
  assert.equal(majReglages(soiree, { duree: 120 }).reglages.duree, 120);
});

test('une manche devinée rapporte des points, une manche ratée n’en rapporte pas', () => {
  const soiree = creerSoiree();
  const lea = ajouterJoueur(soiree, 'Léa');
  const yvan = ajouterJoueur(soiree, 'Yvan');
  enregistrerManche(soiree, { joueurId: lea.id, points: 37, trouvee: true });
  enregistrerManche(soiree, { joueurId: yvan.id, points: 0, trouvee: false });
  enregistrerManche(soiree, { joueurId: lea.id, points: 12, trouvee: true });

  assert.equal(soiree.manches, 3);
  assert.deepEqual(classement(soiree).map((j) => [j.nom, j.score]), [['Léa', 49], ['Yvan', 0]]);
  assert.equal(classement(soiree)[0].trouvees, 2, 'deux combinaisons devinées');
  assert.equal(classement(soiree)[1].trouvees, 0, 'aucune combinaison devinée');
  assert.equal(prochainJoueur(soiree).nom, 'Yvan', 'le joueur ayant le moins joué passe ensuite');

  reinitialiserScores(soiree);
  assert.deepEqual(classement(soiree).map((j) => [j.score, j.trouvees]), [[0, 0], [0, 0]]);
});

test('un score de manche invalide est refusé', () => {
  const soiree = creerSoiree();
  const lea = ajouterJoueur(soiree, 'Léa');
  for (const points of [-1, 1.5, 181, 'beaucoup']) {
    assert.throws(
      () => enregistrerManche(soiree, { joueurId: lea.id, points, trouvee: true }),
      /Score de manche invalide/,
      `points refusés : ${points}`
    );
  }
  assert.equal(lea.score, 0, 'aucun point n’a été accordé');
});

test('une manche ne tire qu’une seule combinaison', () => {
  const soiree = creerSoiree();
  const tirage = tirerCombinaisons(soiree, 1);
  assert.equal(tirage.length, 1);
  assert.deepEqual(tirage[0].parties.map((p) => p.categorie), ['personnages', 'actions']);
});

test('le tirage combine un personnage et une action sans répétition', () => {
  const soiree = creerSoiree();
  const tirage = tirerCombinaisons(soiree, 40);
  assert.equal(tirage.length, 40);
  assert.equal(new Set(tirage.map((t) => t.cle)).size, 40);
  for (const combinaison of tirage) {
    assert.deepEqual(combinaison.parties.map((p) => p.categorie), ['personnages', 'actions']);
    assert.ok(combinaison.parties.every((p) => typeof p.texte === 'string' && p.texte.length > 0));
  }
});

test('le tirage utilise aussi les cartes ajoutées pendant la soirée', () => {
  const soiree = creerSoiree();
  majReglages(soiree, { categories: ['personnages'] });
  for (let i = 0; i < 40; i += 1) ajouterCarte(soiree, 'personnages', `personnage maison ${i}`);
  const textes = tirerCombinaisons(soiree, 60).flatMap((t) => t.parties.map((p) => p.texte));
  assert.ok(textes.some((t) => t.startsWith('personnage maison')));
});

test('le paquet de base tient ses promesses', () => {
  assert.ok(PAQUET_DE_BASE.compte.personnages >= 90, 'au moins 90 personnages');
  assert.ok(PAQUET_DE_BASE.compte.actions >= 90, 'au moins 90 actions');
  assert.ok(PAQUET_DE_BASE.combinaisons > 5000, 'des milliers de combinaisons');
});

test('les textes sont nettoyés et bornés', () => {
  const soiree = creerSoiree();
  assert.equal(ajouterJoueur(soiree, '   Léa    Martin  ').nom, 'Léa Martin');
  assert.throws(() => ajouterJoueur(soiree, '   '), /vide/);
  assert.throws(() => ajouterCarte(soiree, 'actions', 'x'.repeat(200)), /limité/);
  assert.throws(() => ajouterCarte(soiree, 'lieux', 'à la plage'), /Catégorie inconnue/);
});

test('un instantané traverse le lien sans rien perdre', () => {
  const soiree = creerSoiree({ nom: 'Soirée été' });
  const lea = ajouterJoueur(soiree, 'Léa');
  ajouterJoueur(soiree, 'Yvan');
  majReglages(soiree, { duree: 90 });
  ajouterCarte(soiree, 'personnages', 'une dompteuse de hamsters');
  ajouterCarte(soiree, 'actions', 'je répare un vélo');
  enregistrerManche(soiree, { joueurId: lea.id, points: 41, trouvee: true });

  const reprise = depuisFragment(versFragment(soiree));
  assert.equal(reprise.code, soiree.code);
  assert.equal(reprise.nom, 'Soirée été');
  assert.equal(reprise.reglages.duree, 90);
  assert.equal(reprise.manches, 1);
  assert.deepEqual(
    reprise.joueurs.map((j) => [j.nom, j.score, j.manchesJouees, j.trouvees]),
    [['Léa', 41, 1, 1], ['Yvan', 0, 0, 0]]
  );
  assert.deepEqual(reprise.cartesPerso.personnages.map((c) => c.texte), ['une dompteuse de hamsters']);
  assert.deepEqual(reprise.cartesPerso.actions.map((c) => c.texte), ['je répare un vélo']);
});

test('les accents et les emoji survivent au lien', () => {
  const soiree = creerSoiree({ nom: 'Noël 🎄' });
  ajouterJoueur(soiree, 'Chloé 🎯');
  const reprise = depuisFragment(versFragment(soiree));
  assert.equal(reprise.nom, 'Noël 🎄');
  assert.equal(reprise.joueurs[0].nom, 'Chloé 🎯');
});

test('une URL complète collée est acceptée, un lien abîmé est refusé', () => {
  const soiree = creerSoiree();
  ajouterJoueur(soiree, 'Léa');
  const url = `https://exemple.github.io/jeux/jeux/ta-mere-en-slip/#${versFragment(soiree)}`;
  assert.equal(depuisFragment(url).joueurs[0].nom, 'Léa');

  assert.throws(() => depuisFragment(''), /illisible/);
  assert.throws(() => depuisFragment('#s=pas-du-base64!!'), /illisible/);
  assert.throws(() => depuisFragment('#s=' + Buffer.from('{"v":9}').toString('base64url')), /illisible/);
});

test('un instantané trafiqué est ramené à des valeurs sûres', () => {
  const abime = depuisInstantane({
    v: 1,
    c: 'pas un code',
    n: '   ',
    d: 4242,
    m: -5,
    j: [['Léa', 3, 1, 1], 'pas un joueur', ['', 0, 0, 0], ['Léa', 1, 1, 1]],
    p: ['x'.repeat(500), 'une carte valable'],
    a: []
  });
  assert.match(abime.code, /^[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(abime.nom, 'Soirée');
  assert.equal(abime.reglages.duree, REGLES.dureeChronoDefaut);
  assert.equal(abime.manches, 0);
  assert.deepEqual(abime.joueurs.map((j) => j.nom), ['Léa'], 'doublons et entrées vides écartés');
  assert.deepEqual(abime.cartesPerso.personnages.map((c) => c.texte), ['une carte valable']);
});

test('un instantané ne transporte jamais l’historique des tirages', () => {
  const soiree = creerSoiree();
  ajouterJoueur(soiree, 'Léa');
  tirerCombinaisons(soiree, 20);
  assert.ok(soiree.combinaisonsVues.size > 0);
  assert.equal(JSON.stringify(instantane(soiree)).includes('combinaisonsVues'), false);
  assert.equal(depuisFragment(versFragment(soiree)).combinaisonsVues.size, 0);
});
