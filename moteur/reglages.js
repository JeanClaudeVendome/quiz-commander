/* =====================================================================
   Le grand quiz Commander — moteur v4 : TOUS les réglages numériques.
   Aucun poids ne doit être écrit ailleurs. Chaque valeur est commentée.
   Voir docs/moteur.md pour la logique d'ensemble.
   ===================================================================== */
(function (QC) {
  "use strict";

  QC.STYLES = ["aggro", "voltron", "tokens", "aristo", "counters", "kindred", "big", "lands", "blink", "life", "gy", "artifacts",
    "ench", "spells", "control", "stax", "pillow", "combo", "hug", "slug", "goad", "theft", "mill", "chaos", "walkers", "punish"];
  QC.COULEURS = ["W", "U", "B", "R", "G", "C"];
  QC.PSY = ["timmy", "johnny", "spike", "vorthos", "mel"];

  /* Couleur naturelle de chaque style (sert à déduire des couleurs à partir des goûts de jeu).
     Normalisé par couleur au moment du calcul : un style lié à beaucoup de couleurs ne favorise aucune d'elles. */
  QC.STYLE_COULEUR = {
    aggro: { R: .6, W: .5, G: .3 }, voltron: { W: .5, G: .4, R: .3, C: .2 }, tokens: { W: .5, G: .5, R: .2 }, aristo: { B: .7, W: .3, R: .3 },
    counters: { G: .6, W: .4, U: .2 }, kindred: {}, big: { G: .7, R: .2, C: .3 }, lands: { G: .8, B: .2 }, blink: { W: .5, U: .5 },
    life: { W: .6, B: .4, G: .3 }, gy: { B: .7, G: .5, U: .2 }, artifacts: { U: .4, R: .4, W: .3, C: .7 }, ench: { W: .5, G: .5 },
    spells: { U: .6, R: .6 }, control: { U: .7, W: .4, B: .3 }, stax: { W: .6, U: .4, C: .3 }, pillow: { W: .8 },
    combo: { U: .5, B: .5, G: .2 }, hug: { G: .5, U: .4, W: .3 }, slug: { R: .6, B: .6 }, goad: { R: .6, B: .3 },
    theft: { U: .5, B: .5, R: .3 }, mill: { U: .6, B: .4 }, chaos: { R: .7, U: .2 }, walkers: { W: .3, U: .3, G: .2, B: .2, R: .2 },
    punish: { R: .6, B: .3, W: .2 }
  };

  QC.R = {
    /* ---------- Mesure (docs/moteur.md §3) ---------- */
    neutre: 1.5,            // « force du neutre » k : nombre d'unités d'information virtuelles au centre (0,5)
    multiNonCoche: 0.25,     // poids d'une option non cochée dans un choix multiple (ne pas cocher n'est pas rejeter)
    grilleStyle: 2.2,        // poids d'un item de grille « ce qui te donne envie » (question directe)
    grilleNiveaux: { 3: 1, 2: .65, 1: .3, 0: 0 },
    grilleCentrage: 0.4,     // part de la moyenne personnelle de la grille retirée (tendance à tout noter haut)
    coupDoeilPoids: 0.9,     // poids d'une réaction au coup d'œil, par style (× force du style dans la carte)
    coupDoeilSeuil: 0.3,     // un style n'est pris en compte dans une carte que s'il y vaut au moins 0,3
    tribuStyle: 1.0,         // poids de chaque type de créature choisi sur le style tribal (3 au plus)
    tribuCouleur: 0.8,       // poids de chaque type choisi sur les couleurs (selon la vraie répartition des commandants)
    planCouleur: 0.3,        // poids de chaque plan de Magic choisi sur les couleurs
    deckStyle: 2.5, deckCouleur: 2.0, carteFavCouleur: 0.8,

    /* Couleurs : trois couches (§3.5) */
    couches: { dit: .30, revele: .40, choisi: .30 },
    ditGrille: .70, ditPaires: .30,
    ditNiveaux: { 0: 0, 1: .25, 2: .6, 3: .85, star: 1 },
    reveleStyles: .40,       // part des couleurs « révélées » qui vient des styles aimés (le reste : questions indirectes)

    /* ---------- Correspondance (§5) ---------- */
    poids: { style: .40, couleur: .30, theme: .15, psy: .15 },
    themeVorthos: [.10, .25], // poids du thème selon Vorthos (0 → 1), avant ajustement par la fiabilité
    themeDebutant: .22,
    plancher: .05,            // note partielle minimale dans la moyenne géométrique
    aversionStyle: -0.55,     // un style à ce score ou moins est « rejeté »
    aversionSeuil: .35,       // force minimale d'un style rejeté dans le commandant pour le pénaliser
    aversionForce: .65,       // pénalité d'un style rejeté : × (1 − force × présence du style)
    comboRejete: .85,         // combo rejeté et combos rapides réellement joués (R, S) : multiplicateur en plus
    contrasteStyle: 1.5,      // amplifie l'écart au neutre de la note de style (elle doit départager plus que le thème)
    styleConnu: .4,           // somme minimale des forces de style pour considérer le style d'un commandant comme connu
    styleInconnu: .25,        // note de style d'un commandant au style inconnu (sous le neutre : on ne recommande pas à l'aveugle)
    inconnu: .85,             // multiplicateur supplémentaire pour un commandant au style inconnu
    bof: .85,                 // multiplicateur si une couleur du commandant a été notée « Bof » (une seule fois)
    couleurMin: .45,
    incolore: .9,             // note de couleur d'un commandant incolore = axe incolore du joueur × 0,9          // part de la couleur la plus faible du commandant dans sa note de couleur (le deck les joue toutes)
    jamais: .6,               // multiplicateur pour un commandant qui contient une couleur « Jamais »
    bracketAuDessus: .85,     // écart-type de la cloche au-dessus du bracket voulu (pénalité forte)
    bracketEnDessous: 2.0,    // écart-type en dessous (pénalité douce ; × 0,65 pour un Spike)
    bracketFlou: 1.4,         // bracket déduit de l'ambiance (découverte) : cloches élargies d'autant
    bracketPlancher: .2,
    complexite: .07,          // pénalité par point d'écart de complexité
    popularite: .3,           // pénalité maximale d'écart au réglage « classique ou obscur »
    populariteDebutant: .18,  // en découverte, sans réglage de popularité : léger avantage aux commandants connus
    obscurFaible: .8,         // un commandant obscur ET faible n'est pas une « pépite »
    budget: { 1: [[15, .8], [40, .6]], 2: [[40, .85], [90, .7]], 3: [[120, .85]], 4: [] },
    aime: 1.35, reve: 1.3, precon: 1.06, debutantComplexe: .8, prochainNouveau: .3, prochainMieux: .1,
    donneesFaibles: [.94, .08], // multiplicateur = 0,94 + 0,08 × confiance des données (léger : sinon les commandants vérifiés deviennent des aimants)

    /* ---------- Propositions (§5.4) ---------- */
    diversite: .72,           // λ de la sélection diversifiée (1 = que la note, 0 = que la diversité)
    parFamille: 4
  };

  /* Cartes de référence pour l'affichage et les tests : à quoi ressemble chaque personnage incarné. */
  QC.PERSONNAGES = {
    villain: "Le grand méchant", dwarf: "Le nain forgeron", necro: "Le nécromancien", dragons: "Le dompteur de dragons",
    pirate: "Le capitaine pirate", paladin: "Le paladin", inventor: "Le savant fou", druid: "Le druide", king: "Le souverain bâtisseur",
    horror: "L'horreur venue d'ailleurs", trickster: "L'escroc", archmage: "L'archimage", beastmaster: "Le maître des bêtes",
    chaos: "L'agent du chaos", angel: "L'ange gardien", warlord: "Le chef de guerre", diplomat: "Le diplomate"
  };
  QC.NOMS_STYLES = {
    aggro: "l'attaque", voltron: "le voltron", tokens: "les jetons", aristo: "les aristocrates", counters: "les compteurs +1/+1",
    kindred: "le tribal", big: "la rampe et les gros sorts", lands: "les terrains", blink: "le blink", life: "le gain de vie",
    gy: "le cimetière", artifacts: "les artefacts", ench: "les enchantements", spells: "le spellslinger", control: "le contrôle",
    stax: "le stax", pillow: "le pillowfort", combo: "le combo", hug: "le group hug", slug: "le group slug", goad: "le goad",
    theft: "le vol", mill: "la meule", chaos: "le chaos", walkers: "les planeswalkers", punish: "la punition"
  };
  QC.NOMS_COULEURS = { W: "le blanc", U: "le bleu", B: "le noir", R: "le rouge", G: "le vert", C: "l'incolore" };
})(typeof module !== "undefined" ? (globalThis.QC = globalThis.QC || {}) : (window.QC = window.QC || {}));
