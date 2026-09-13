// Paquet de « Mime ou rien » — écrit pour cette version, tout public.
// Trois niveaux : plus le mime est difficile, plus il rapporte.

export const MIMES = {
  facile: [
    'se brosser les dents', 'nager', 'conduire une voiture', 'jouer au tennis',
    'dormir debout', 'manger une glace', 'prendre une photo', 'faire du vélo',
    'arroser les plantes', 'boire un café brûlant', 'porter une valise trop lourde',
    'marcher contre le vent', 'faire la vaisselle', 'enfiler un pull trop petit',
    'éternuer', 'applaudir', 'grimper à une échelle', 'ramer dans une barque',
    'jouer de la guitare', 'balayer', 'se laver les cheveux', 'sauter à la corde',
    'lire un journal', 'peindre un mur', 'téléphoner', 'danser le rock',
    'pêcher à la ligne', 'faire des pompes', 'se maquiller', 'monter un escalier',
    'promener un chien qui tire', 'fermer une fenêtre qui coince', 'jongler',
    'tricoter', 'souffler des bougies', 'repasser une chemise'
  ],
  moyen: [
    'un pingouin', 'un funambule', 'une girafe qui boit', 'un chef d’orchestre',
    'un boxeur fatigué', 'une statue qui s’anime', 'un robot en panne',
    'un serveur qui perd son plateau', 'un mime enfermé dans une boîte',
    'un cow-boy au duel', 'une poule qui pond', 'un plongeur sous-marin',
    'un vampire au lever du soleil', 'un bébé qui apprend à marcher',
    'un chat qui se réveille', 'un pilote de rallye dans un virage',
    'un touriste perdu', 'un coiffeur inspiré', 'un dompteur de puces',
    'un joueur d’échecs qui réfléchit', 'un magicien qui rate son tour',
    'un cuisinier qui goûte trop salé', 'un gardien de but', 'un skieur qui tombe',
    'un chanteur d’opéra', 'un sculpteur sur glace', 'une abeille butineuse',
    'un pompier qui déroule son tuyau', 'un randonneur en montagne',
    'un chirurgien concentré', 'une girouette', 'un lanceur de poids',
    'un yogi en équilibre', 'un explorateur dans la jungle', 'un gondolier',
    'un mannequin sur un podium'
  ],
  difficile: [
    'rater son train de peu', 'expliquer un itinéraire compliqué',
    'monter un meuble sans notice', 'se faire piquer par une guêpe en voiture',
    'mentir à sa grand-mère', 'sentir une odeur bizarre sans le dire',
    'retenir un éternuement au théâtre', 'faire semblant d’aimer un cadeau',
    'chercher ses clés dans un sac trop plein', 'attendre un ascenseur en retard',
    'essayer d’ouvrir un bocal', 'se disputer sans faire de bruit',
    'découvrir une facture salée', 'draguer maladroitement',
    'marcher pieds nus sur des galets', 'négocier au marché',
    'regarder un film d’horreur', 'attraper une mouche', 'passer un entretien raté',
    'arriver en retard discrètement', 'goûter un plat trop épicé',
    'faire croire qu’on sait danser', 'ouvrir un parapluie dans le vent',
    'porter un plateau sans rien renverser', 'se réveiller en sursaut',
    'chercher du réseau', 'perdre au dernier moment', 'faire la queue trop longtemps',
    'se cogner l’orteil sans crier', 'convaincre un enfant de dormir',
    'sortir d’une voiture trop basse', 'comprendre une notice en langue étrangère'
  ]
};

export const POINTS = { facile: 1, moyen: 2, difficile: 3 };
export const NIVEAUX = [
  { id: 'facile', libelle: 'Facile', points: 1 },
  { id: 'moyen', libelle: 'Moyen', points: 2 },
  { id: 'difficile', libelle: 'Corsé', points: 3 }
];

export const PAQUET_MIMES = {
  compte: Object.fromEntries(Object.entries(MIMES).map(([k, v]) => [k, v.length])),
  total: Object.values(MIMES).reduce((t, l) => t + l.length, 0)
};
