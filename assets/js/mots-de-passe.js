// Paquet de « Mot de passe » — écrit pour cette version, tout public.
//
// Des mots simples et imagés : il faut pouvoir les faire deviner par des
// synonymes, des contraires ou des situations, sans jamais les prononcer.

export const MOTS = [
  // Objets du quotidien
  'parapluie', 'brosse à dents', 'oreiller', 'tire-bouchon', 'échelle', 'bouilloire',
  'ceinture', 'cadenas', 'aspirateur', 'enveloppe', 'tabouret', 'arrosoir',
  'boussole', 'lunettes', 'valise', 'bougie', 'miroir', 'casserole', 'balai',
  'ciseaux', 'porte-clés', 'tondeuse', 'trousseau', 'passoire', 'télécommande',
  'rallonge', 'sèche-cheveux', 'hamac', 'cintre', 'thermomètre',

  // Lieux
  'phare', 'grenier', 'péage', 'aéroport', 'vestiaire', 'marché', 'bibliothèque',
  'piscine', 'caserne', 'ascenseur', 'cave', 'terrasse', 'chantier', 'glacier',
  'quai', 'vignoble', 'patinoire', 'carrefour', 'embouteillage', 'camping',

  // Métiers et personnages
  'pompier', 'arbitre', 'facteur', 'pâtissier', 'plombier', 'vétérinaire',
  'bibliothécaire', 'jardinier', 'apiculteur', 'déménageur', 'serrurier',
  'chef d’orchestre', 'guide de montagne', 'sauveteur', 'marionnettiste',

  // Nourriture
  'raclette', 'pastèque', 'moutarde', 'croissant', 'barbe à papa', 'pistache',
  'cornichon', 'brochette', 'camembert', 'citrouille', 'nouilles', 'chantilly',
  'sardine', 'artichaut', 'réglisse', 'gaufre', 'paella', 'noisette',

  // Nature et animaux
  'hérisson', 'tournesol', 'avalanche', 'marée', 'chauve-souris', 'cactus',
  'libellule', 'brouillard', 'écureuil', 'mousse', 'orage', 'flamant rose',
  'fourmilière', 'banquise', 'coquillage', 'taupe', 'rosée', 'cascade',

  // Actions et situations
  'déménagement', 'sieste', 'embrassade', 'réveillon', 'déguisement',
  'covoiturage', 'randonnée', 'brocante', 'répétition', 'baptême',
  'grève', 'panne', 'retard', 'surprise', 'dispute', 'réconciliation',
  'anniversaire', 'rentrée', 'vernissage', 'kermesse',

  // Notions
  'patience', 'vertige', 'nostalgie', 'jalousie', 'courage', 'routine',
  'hasard', 'secret', 'rumeur', 'silence', 'habitude', 'malentendu',
  'gourmandise', 'timidité', 'curiosité', 'fatigue', 'fierté', 'soulagement',

  // Divers
  'kermesse de village', 'carte postale', 'boîte aux lettres', 'feu rouge',
  'passage piéton', 'tour de magie', 'photo de classe', 'liste de courses',
  'bouchon de liège', 'jour férié', 'fausse note', 'coup de soleil',
  'nuit blanche', 'fou rire', 'tour du monde', 'peur du vide'
];

export const PAQUET_MOTS_DE_PASSE = { total: MOTS.length };
