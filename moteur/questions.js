/* =====================================================================
   Le grand quiz Commander — moteur v4 : les questions, sous forme de données.

   mode : "commun" (découverte ET confirmé) ou "confirme" (confirmé seulement). Le confirmé contient tout le commun.
   type : choix | multi | echelle | dilemme | grille | couleurs | paires | tribus | plans | cartes | aversions | texte | collection
   e    : effets d'une option. Clés : "a.<style>" (style de jeu), "c.<W|U|B|R|G|C>" (couleur RÉVÉLÉE : uniquement dans des
          questions qui ne nomment jamais de couleur), "p.<timmy|johnny|spike|vorthos|mel>" (psychologie). Échelle relative :
          seule la différence entre les options compte (docs/moteur.md §3.1).
   set  : réglages directs (bracket, budget, complexité…), utilisés tels quels par la correspondance.
   fiab : fiabilité de la question (1 = directe et claire ; 0,6 = indirecte ou ambiguë). Défaut 1.
   ===================================================================== */
(function (QC) {
  "use strict";
  const O = (id, l, e, extra) => Object.assign({ id, l, e: e || {} }, extra || {});

  QC.CHAPITRES = [
    { id: "toi", n: "I", titre: "Qui tu es", intro: "Pas de bonne réponse : suis ton instinct. Si une question ne te parle pas, « Je ne sais pas » est une réponse utile aussi.", art: "Jace, the Mind Sculptor" },
    { id: "gagner", n: "II", titre: "Comment tu veux gagner", intro: "La façon dont une partie se termine compte autant que le fait de gagner.", art: "Craterhoof Behemoth" },
    { id: "oeil", n: "III", titre: "Coup d'œil", intro: "De vrais commandants défilent. Réagis à l'instinct : l'illustration, le texte, l'ambiance.", art: "Mirror Gallery" },
    { id: "table", n: "IV", titre: "Ta place à la table", intro: "Le Commander se joue à plusieurs : ton rôle social compte autant que ton deck.", art: "Kenrith, the Returned King" },
    { id: "moteur", n: "V", titre: "Ton moteur de jeu", intro: "Note chaque idée selon l'envie de la piloter, pas selon sa puissance.", art: "Paradox Engine" },
    { id: "univers", n: "VI", titre: "Univers et thème", intro: "Le thème n'est pas un détail : c'est souvent lui qui te fait ressortir un deck du placard.", art: "The Ur-Dragon" },
    { id: "cadre", n: "VII", titre: "Puissance, budget, rythme", intro: "Le cadre dans lequel tu aimes jouer.", art: "Smothering Tithe" },
    { id: "contre", n: "VIII", titre: "Ce que tu ne veux plus affronter", intro: "Pense à tes pires soirées. Ces réponses préparent ta discussion d'avant-partie.", art: "Stasis" },
    { id: "couleurs", n: "IX", titre: "Les couleurs", intro: "Pour finir, la seule partie où l'on parle vraiment de couleurs. Tes réponses ont déjà dessiné une bonne partie de ton hexagone.", art: "Prismatic Vista" },
    { id: "contexte", n: "X", titre: "Ton contexte", intro: "Tes decks actuels et tes cartes préférées, pour ne pas te proposer de doublons.", art: "Command Tower" }
  ];

  const PERSO = [
    ["villain", "Ambition, domination, tout le monde contre toi.", { "c.B": 1, "c.U": .3, "c.R": .3, "a.theft": .4, "a.aristo": .4, "p.vorthos": .2 }, "Villain"],
    ["dwarf", "Marteaux, équipements, trésors et machines.", { "c.R": 1, "c.W": .5, "c.C": .4, "a.artifacts": .8, "a.voltron": .5, "p.vorthos": .2 }, "Dwarf"],
    ["necro", "Les morts se relèvent à ton signal.", { "c.B": 1, "c.U": .2, "c.G": .2, "a.gy": 1, "a.aristo": .4, "p.vorthos": .2 }, "Zombie"],
    ["dragons", "Des ailes, du feu et des créatures énormes.", { "c.R": 1, "c.G": .3, "a.big": .8, "a.kindred": .4, "p.timmy": .4, "p.vorthos": .2 }, "Dragon"],
    ["pirate", "Trésors, abordages et pillage.", { "c.U": .6, "c.R": .6, "c.B": .3, "a.theft": .7, "a.artifacts": .3, "p.vorthos": .2 }, "Pirate"],
    ["paladin", "Armure, honneur et lumière.", { "c.W": 1, "a.voltron": .8, "a.life": .3, "p.vorthos": .2 }, "Knight"],
    ["inventor", "Inventions, artefacts et expériences ratées.", { "c.U": .7, "c.R": .7, "c.C": .5, "a.artifacts": 1, "a.spells": .3, "p.johnny": .3 }, "Artificer"],
    ["druid", "La nature grandit, les terres répondent.", { "c.G": 1, "a.lands": 1, "a.big": .4, "p.vorthos": .2 }, "Druid"],
    ["king", "Un royaume, une armée, un peuple.", { "c.W": 1, "a.tokens": 1, "a.hug": .3, "p.vorthos": .2 }, "Noble"],
    ["horror", "Indicible, inévitable, dérangeante.", { "c.C": 1, "c.B": .3, "c.U": .3, "a.big": .5, "a.mill": .3, "p.vorthos": .2 }, "Eldrazi"],
    ["trickster", "Voler, tromper, retourner la situation.", { "c.U": .6, "c.B": .6, "a.theft": .8, "a.chaos": .3, "p.johnny": .2 }, "Rogue"],
    ["archmage", "Savoir absolu et sorts parfaits.", { "c.U": 1, "a.spells": 1, "a.control": .4, "p.mel": .2 }, "Wizard"],
    ["beastmaster", "Une ménagerie qui t'obéit.", { "c.G": 1, "a.aggro": .4, "a.counters": .5, "a.kindred": .3 }, "Beast"],
    ["chaos", "Personne, pas même toi, ne sait ce qui va arriver.", { "c.R": 1, "a.chaos": 1, "p.timmy": .2 }, null],
    ["angel", "Protéger, guérir, veiller.", { "c.W": 1, "a.life": 1, "a.pillow": .3, "p.vorthos": .2 }, "Angel"],
    ["warlord", "Tout le monde à l'attaque, maintenant.", { "c.R": .7, "c.W": .7, "a.aggro": 1, "a.tokens": .3 }, "Warrior"],
    ["diplomat", "Tu fais et défais les alliances.", { "c.G": .5, "c.U": .5, "c.W": .4, "a.hug": 1, "a.goad": .4 }, "Advisor"],
    ["machine", "Une machine parfaite, sans âme et sans couleur.", { "c.C": 1, "a.artifacts": .8, "a.big": .3, "p.mel": .3 }, "Construct"]
  ];
  QC.PERSONNAGES.machine = "La machine";

  QC.QUESTIONS = [
    /* ===================== I. Qui tu es ===================== */
    { id: "fantasy", ch: "toi", mode: "commun", type: "multi", max: 2, art: true,
      q: "Qui as-tu envie d'incarner à la table ?", help: "Deux choix au plus. Pense à un personnage, pas à une mécanique.",
      options: PERSO.map(([id, d, e, kind]) => O(id, QC.PERSONNAGES[id], e, { d, fant: id, kind })) },
    { id: "moment", ch: "toi", mode: "commun", type: "choix", q: "Ta meilleure partie de Commander, c'est celle où…", options: [
      O("t", "J'ai posé un truc énorme et toute la table a réagi", { "p.timmy": 1, "a.big": .3 }),
      O("j", "Ma combinaison improbable a enfin fonctionné", { "p.johnny": 1, "a.combo": .3 }),
      O("s", "J'ai gagné en jouant chaque tour parfaitement", { "p.spike": 1, "a.control": .2 }),
      O("v", "Mon deck a raconté une vraie histoire", { "p.vorthos": 1 })] },
    { id: "carte", ch: "toi", mode: "commun", type: "choix", q: "Quand tu lis une nouvelle carte, tu…", options: [
      O("m", "Cherches comment elle s'emboîte avec d'autres", { "p.mel": 1, "p.johnny": .4 }),
      O("v", "Regardes d'abord l'illustration et son nom", { "p.vorthos": 1 }),
      O("s", "Évalues tout de suite sa puissance", { "p.spike": 1 }),
      O("t", "Imagines le moment où tu vas la poser", { "p.timmy": 1 })] },
    { id: "probleme", ch: "toi", mode: "commun", type: "choix", fiab: .9, q: "Face à un problème, tu…", options: [
      O("W", "Imposes une règle qui vaut pour tout le monde", { "c.W": 1, "a.stax": .3, "a.pillow": .2 }),
      O("U", "L'avais vu venir, et tu avais déjà la réponse", { "c.U": 1, "a.control": .4 }),
      O("B", "Le règles, quel qu'en soit le prix", { "c.B": 1, "a.aristo": .3 }),
      O("R", "Agis tout de suite, on verra après", { "c.R": 1, "a.aggro": .3 }),
      O("G", "Deviens simplement plus fort que lui", { "c.G": 1, "a.big": .3 }),
      O("C", "Sors l'outil qui marche dans tous les cas", { "c.C": 1, "a.artifacts": .3 })] },
    { id: "philo", ch: "toi", mode: "commun", type: "multi", max: 2, fiab: .9, q: "La philosophie qui te parle le plus", help: "Deux choix au plus.", options: [
      O("W", "L'ordre et la communauté : des règles justes pour tous", { "c.W": 1 }),
      O("U", "Le savoir et la perfection : tout prévoir", { "c.U": 1 }),
      O("B", "L'ambition : le pouvoir, quel qu'en soit le prix", { "c.B": 1 }),
      O("R", "La liberté et la passion : agir maintenant", { "c.R": 1 }),
      O("G", "La nature et la croissance : devenir ce qu'on est", { "c.G": 1 }),
      O("C", "La précision : ne dépendre de rien ni de personne", { "c.C": 1 })] },
    { id: "d1", ch: "toi", mode: "commun", type: "dilemme", q: "Tu préfères…", options: [
      O("a", "Gagner une partie sur trois, de façon spectaculaire", { "p.timmy": 1 }),
      O("b", "Gagner une partie sur deux, toujours de la même façon", { "p.spike": 1 })] },
    { id: "d9", ch: "toi", mode: "commun", type: "dilemme", q: "Tu préfères…", options: [
      O("a", "Une mécanique parfaitement huilée", { "p.mel": 1 }),
      O("b", "Un deck qui raconte une histoire", { "p.vorthos": 1 })] },
    { id: "booster", ch: "toi", mode: "confirme", type: "choix", q: "Quand tu découvres une nouvelle extension, ton œil va d'abord vers…", options: [
      O("t", "Les créatures géantes et les effets spectaculaires", { "p.timmy": 1 }),
      O("j", "Les textes bizarres dont personne ne voit encore l'utilité", { "p.johnny": 1 }),
      O("s", "Les cartes qui vont changer le format", { "p.spike": 1 }),
      O("v", "Les illustrations et l'histoire du plan", { "p.vorthos": 1 })] },
    { id: "depart", ch: "toi", mode: "confirme", type: "choix", q: "Quand tu commences un nouveau deck, tu pars de…", options: [
      O("t", "Une carte qui me fait vibrer", { "p.timmy": 1 }), O("j", "Une interaction que je viens de découvrir", { "p.johnny": 1, "p.mel": .3 }),
      O("s", "Une liste efficace que j'affine", { "p.spike": 1 }), O("v", "Un thème, un univers, une histoire", { "p.vorthos": 1 })] },
    { id: "theme", ch: "toi", mode: "confirme", type: "echelle", q: "Thème ou efficacité ?", gauche: "100 % thème, même si c'est moins fort", droite: "100 % efficacité, le thème viendra après",
      e: { "p.spike": .8, "p.vorthos": -.8 }, set: "themeEff" },

    /* ===================== II. Comment tu veux gagner ===================== */
    { id: "vibe", ch: "gagner", mode: "commun", type: "multi", max: 3, q: "Ce qui te ferait vraiment plaisir pendant une partie", help: "Trois choix au plus.", options: [
      O("army", "Avoir une énorme armée", { "a.aggro": .7, "a.tokens": 1 }),
      O("giant", "Un monstre gigantesque", { "a.big": 1, "a.voltron": .6 }),
      O("dead", "Faire revenir les morts", { "a.gy": 1, "a.aristo": .4 }),
      O("spells", "Lancer plein de sorts", { "a.spells": 1 }),
      O("steal", "Voler les cartes des autres", { "a.theft": 1 }),
      O("lock", "Empêcher les autres de faire ce qu'ils veulent", { "a.stax": 1, "a.control": .6 }),
      O("combo", "Une combinaison qui gagne d'un coup", { "a.combo": 1 }),
      O("crazy", "Une partie complètement folle", { "a.chaos": 1 }),
      O("allies", "Me faire des alliés, manipuler", { "a.hug": 1, "a.goad": .6 }),
      O("hurt", "Faire un peu mal à tout le monde", { "a.slug": 1, "a.punish": .3 }),
      O("grow", "Des créatures qui grandissent sans arrêt", { "a.counters": 1 }),
      O("lands", "Poser plein de terrains et en profiter", { "a.lands": 1 }),
      O("tribe", "Une armée d'un seul type de créature", { "a.kindred": 1 }),
      O("mill", "Vider la bibliothèque des adversaires", { "a.mill": 1 })] },
    { id: "envie", ch: "gagner", mode: "commun", type: "multi", max: 3, q: "Les cartes que tu aimerais avoir en jeu", help: "Trois choix au plus.", options: [
      O("machine", "Une machine qui produit des ressources à chaque tour", { "a.artifacts": 1 }),
      O("ench", "Un enchantement qui te fait piocher à chaque nouvel enchantement", { "a.ench": 1 }),
      O("walker", "Un planeswalker qui monte en puissance tour après tour", { "a.walkers": 1 }),
      O("blink", "Une créature qu'on fait sortir et revenir pour répéter son effet", { "a.blink": 1 }),
      O("life", "Des points de vie qui se transforment en menaces", { "a.life": 1 }),
      O("reflect", "Une carte qui renvoie chaque coup à l'attaquant", { "a.punish": 1 }),
      O("wall", "Un mur que personne n'ose attaquer", { "a.pillow": 1 }),
      O("rule", "Une règle qui ralentit tout le monde, sauf toi", { "a.stax": 1 }),
      O("sword", "Un équipement géant sur ton commandant", { "a.voltron": 1 }),
      O("land", "Un terrain de plus à chaque tour", { "a.lands": 1 }),
      O("counter", "Des marqueurs qui doublent sans arrêt", { "a.counters": 1 }),
      O("library", "Des adversaires à court de cartes", { "a.mill": 1 })] },
    { id: "wincon", ch: "gagner", mode: "commun", type: "multi", max: 3, q: "Tes façons de gagner préférées", help: "Trois choix au plus.", options: [
      O("army", "Une armée qui attaque", { "a.aggro": 1, "a.tokens": .4 }),
      O("voltron", "Un seul monstre, aux dégâts de commandant", { "a.voltron": 1 }),
      O("drain", "Drainer la vie de toute la table", { "a.aristo": 1, "a.life": .3, "a.slug": .3 }),
      O("combo", "Une combinaison infinie", { "a.combo": 1 }),
      O("alt", "Une condition de victoire alternative", { "a.combo": .5, "a.control": .4, "a.life": .2 }),
      O("mill", "Vider leurs bibliothèques", { "a.mill": 1 }),
      O("burn", "Brûler la table à coups de dégâts directs", { "a.slug": .8, "a.punish": .6 }),
      O("goad", "Laisser les autres s'entretuer", { "a.goad": 1, "a.hug": .3 }),
      O("survive", "Survivre derrière mes défenses jusqu'à ce que tout le monde craque", { "a.pillow": 1, "a.life": .3 }),
      O("big", "Une créature gigantesque qui écrase tout", { "a.big": 1 }),
      O("walkers", "Mes planeswalkers qui montent en puissance", { "a.walkers": 1 })] },
    { id: "d3", ch: "gagner", mode: "commun", type: "dilemme", q: "Tu préfères…", art: ["Ghalta, Primal Hunger", "Krenko, Mob Boss"], options: [
      O("a", "Une seule créature énorme", { "a.voltron": .8, "a.big": .6, "a.tokens": -.4 }),
      O("b", "Cinquante petites créatures", { "a.tokens": 1, "a.aggro": .3, "a.voltron": -.4 })] },
    { id: "d11", ch: "gagner", mode: "commun", type: "dilemme", q: "Ce qui travaille pour toi…", options: [
      O("a", "Des terrains", { "a.lands": 1, "a.artifacts": -.3 }), O("b", "Des artefacts", { "a.artifacts": 1, "a.lands": -.3 })] },
    { id: "d12", ch: "gagner", mode: "commun", type: "dilemme", q: "Tu préfères…", options: [
      O("a", "Faire revenir tes créatures pour rejouer leurs effets", { "a.blink": 1, "a.gy": .2 }),
      O("b", "Des permanents uniques et puissants : planeswalkers, enchantements", { "a.walkers": .8, "a.ench": .6 })] },
    { id: "explosion", ch: "gagner", mode: "commun", type: "echelle", q: "Comment tu préfères conclure ?", gauche: "Petit à petit, en grignotant", droite: "En un seul tour où tout explose",
      e: { "a.combo": .6, "a.tokens": .3, "a.big": .3, "a.slug": -.4, "a.control": -.2 } },
    { id: "tempo", ch: "gagner", mode: "commun", type: "choix", ordered: true, q: "Idéalement, la partie se termine vers le…", options: [
      O("4", "Tour 4 à 6 : rapide et tranchant", { "a.aggro": .5, "a.combo": .4, "a.pillow": -.3 }, { set: { vitesse: 5 } }),
      O("7", "Tour 7 à 9 : le rythme classique", {}, { set: { vitesse: 4 } }),
      O("10", "Tour 10 à 12 : on a le temps de construire", { "a.big": .3, "a.control": .2 }, { set: { vitesse: 2.5 } }),
      O("13", "Tour 13 et plus : plus c'est long, mieux c'est", { "a.big": .4, "a.pillow": .4, "a.control": .3, "a.aggro": -.3 }, { set: { vitesse: 1 } })] },
    { id: "winrate", ch: "gagner", mode: "commun", type: "choix", ordered: true, q: "Sur quatre parties, tu es content si tu en gagnes…", options: [
      O("1", "Une : chacun son tour", { "p.spike": .2 }), O("2", "Deux", { "p.spike": .6 }), O("3", "Trois ou plus", { "p.spike": 1 }),
      O("x", "Peu importe, je joue pour l'expérience", { "p.timmy": .6, "p.vorthos": .3 })] },
    { id: "d2", ch: "gagner", mode: "confirme", type: "dilemme", q: "Tu préfères…", options: [
      O("a", "Un plateau énorme que tout le monde voit", { "a.aggro": .6, "a.tokens": .6, "a.big": .3, "a.control": -.3 }),
      O("b", "Une main pleine que personne ne voit", { "a.control": .8, "a.spells": .7 })] },
    { id: "d6", ch: "gagner", mode: "confirme", type: "dilemme", q: "Ta ressource préférée…", options: [
      O("a", "Ton cimetière", { "a.gy": 1 }), O("b", "Ta main", { "a.spells": .6, "a.control": .5 })] },
    { id: "d7", ch: "gagner", mode: "commun", type: "dilemme", q: "Tu préfères…", options: [
      O("a", "Imposer le rythme à la table", { "a.control": .6, "a.stax": .7 }),
      O("b", "Laisser jouer et exploser au bon moment", { "a.combo": .6, "a.big": .5 })] },
    { id: "d10", ch: "gagner", mode: "confirme", type: "dilemme", q: "Tu préfères…", options: [
      O("a", "Un plan fiable", { "a.combo": .3, "a.control": .3, "a.chaos": -.6 }), O("b", "Une surprise à chaque partie", { "a.chaos": 1 })] },
    { id: "d4", ch: "gagner", mode: "confirme", type: "dilemme", q: "Tu préfères…", options: [
      O("a", "Faire très mal à un seul joueur", { "a.aggro": .5, "a.voltron": .6 }), O("b", "Faire un peu mal à tout le monde", { "a.slug": 1, "a.aristo": .3 })] },

    /* ===================== III. Coup d'œil ===================== */
    { id: "oeil", ch: "oeil", mode: "commun", type: "cartes", n: 16, q: "Ton ressenti sur ce commandant" },

    /* ===================== IV. Ta place à la table ===================== */
    { id: "role", ch: "table", mode: "commun", type: "choix", q: "Ton rôle naturel à la table", options: [
      O("threat", "La menace", { "a.aggro": .6, "a.voltron": .5 }, { d: "On me cible dès le tour 3" }),
      O("diplo", "Le diplomate", { "a.hug": .9, "a.goad": .4 }, { d: "Je négocie, je fais des alliances", set: { politique: 1 } }),
      O("sheriff", "Le shérif", { "a.control": .8 }, { d: "Je calme celui qui mène" }),
      O("shadow", "L'ombre", { "a.combo": .5, "a.pillow": .5 }, { d: "On m'oublie jusqu'au tour où je gagne" }),
      O("chaos", "Le chaos", { "a.chaos": 1 }, { d: "Personne ne sait ce que je vais faire" })] },
    { id: "creature", ch: "table", mode: "commun", type: "choix", q: "Ta créature préférée, c'est celle qui…", options: [
      O("etb", "Arrive en jeu avec un effet que tu aimerais répéter", { "a.blink": 1 }),
      O("grow", "Grandit un peu plus à chaque tour", { "a.counters": 1 }),
      O("haste", "Attaque dès qu'elle arrive", { "a.aggro": 1 }),
      O("dies", "Rapporte quelque chose quand elle meurt", { "a.aristo": 1, "a.gy": .3 }),
      O("untouch", "Ne peut pas être ciblée, et porte tout ton équipement", { "a.voltron": 1 }),
      O("copy", "Copie les meilleures créatures des autres", { "a.theft": 1 })] },
    { id: "politique", ch: "table", mode: "commun", type: "echelle", q: "La négociation à table (« je ne t'attaque pas si… »)", gauche: "Je déteste, laissez-moi jouer", droite: "C'est la meilleure partie du jeu",
      e: { "a.hug": .7, "a.goad": .5, "a.pillow": -.2 }, set: "politique" },
    { id: "archenemy", ch: "table", mode: "commun", type: "choix", q: "Être la cible de toute la table, ça te…", options: [
      O("go", "Motive : qu'ils viennent", { "a.voltron": .4, "a.big": .3, "a.pillow": -.4 }),
      O("fun", "Amuse, tant que je peux me défendre", { "a.control": .4, "a.punish": .4 }),
      O("stress", "Stresse : je préfère rester discret", { "a.pillow": .6, "a.hug": .3 }),
      O("ruin", "Gâche la partie", { "a.pillow": .8, "a.hug": .6 })] },
    { id: "vol", ch: "table", mode: "commun", type: "choix", q: "Tu peux voler le commandant d'un adversaire jusqu'à la fin de la partie.", options: [
      O("yes", "Avec plaisir", { "a.theft": 1 }), O("threat", "Seulement si c'est la plus grosse menace", { "a.theft": .4, "a.control": .3 }),
      O("kill", "Non, je préfère simplement le tuer", { "a.theft": -.3, "a.control": .2 }), O("never", "Jamais : voler, ce n'est pas fun", { "a.theft": -1 })] },
    { id: "attaque", ch: "table", mode: "commun", type: "choix", q: "Quelqu'un t'attaque avec un gros monstre. Le rêve, c'est…", options: [
      O("trap", "Le détruire avec un piège au bon moment", { "a.control": .8 }),
      O("reflect", "Lui renvoyer les dégâts à la figure", { "a.punish": 1 }),
      O("tank", "Encaisser : j'ai trop de vie pour m'en soucier", { "a.life": 1 }),
      O("deter", "Qu'il n'ose même pas : mes défenses le dissuadent", { "a.pillow": 1 })] },
    { id: "rase", ch: "table", mode: "commun", type: "choix", q: "Ton plateau vient d'être rasé. Tu…", options: [
      O("gy", "Ressors tout de ton cimetière", { "a.gy": 1 }),
      O("hand", "Repars avec ta main pleine", { "a.spells": .5, "a.control": .5 }),
      O("cmdr", "Relances ton commandant et c'est reparti", { "a.voltron": .8 }),
      O("perm", "T'en fiches : tes enchantements, artefacts et terrains sont toujours là", { "a.ench": .6, "a.artifacts": .6, "a.lands": .5 })] },
    { id: "interaction", ch: "table", mode: "confirme", type: "echelle", q: "Combien d'interaction (removal, contres) tu veux avoir en main ?", gauche: "Presque rien, je déroule mon plan", droite: "Toujours une réponse prête",
      e: { "a.control": .8 }, set: "interaction" },
    { id: "contresort", ch: "table", mode: "confirme", type: "choix", q: "Dire « non » avec un contresort, c'est…", options: [
      O("love", "Mon plaisir préféré", { "a.control": 1 }), O("some", "Utile de temps en temps", { "a.control": .4 }),
      O("after", "Pas mon style, je préfère répondre après coup", { "a.control": .1 }), O("hate", "Je déteste ça, des deux côtés", { "a.control": -.6 })] },
    { id: "gagnant", ch: "table", mode: "confirme", type: "choix", q: "Un adversaire va gagner au prochain tour. Tu peux l'arrêter, mais ça te coûte ta propre victoire.", options: [
      O("stop", "Je l'arrête, c'est mon rôle", { "a.control": .5 }), O("other", "Je laisse quelqu'un d'autre s'en charger", { "a.pillow": .4, "a.hug": .2 }),
      O("deal", "Je négocie : je l'arrête si on m'aide ensuite", { "a.hug": .7, "a.goad": .3 }), O("race", "Je tente de gagner avant lui", { "a.aggro": .4, "a.combo": .5 })] },
    { id: "d5", ch: "table", mode: "confirme", type: "dilemme", q: "Tu préfères…", options: [
      O("a", "Gagner avec tes propres cartes", { "a.theft": -.6 }), O("b", "Retourner les cartes des autres contre eux", { "a.theft": 1, "a.goad": .3 })] },
    { id: "d8", ch: "table", mode: "confirme", type: "dilemme", q: "Tu préfères…", options: [
      O("a", "Interagir avec tout le monde à chaque tour", { "a.hug": .6, "a.goad": .4, "a.control": .3 }),
      O("b", "Construire tranquillement dans ton coin", { "a.pillow": .7, "a.counters": .3, "a.lands": .3 })] },
    { id: "combo_pret", ch: "table", mode: "confirme", type: "choix", q: "Ton combo est prêt au tour 5, mais la table s'amuse beaucoup.", options: [
      O("win", "Je gagne : c'est le jeu", { "a.combo": .8, "p.spike": .5 }), O("wait", "J'attends un tour ou deux", { "a.combo": .3, "a.hug": .3 }),
      O("again", "Je gagne et je propose de rejouer tout de suite", { "a.combo": .6 }), O("none", "Je ne mets pas de combo infini dans mes decks", { "a.combo": -1 })] },

    /* ===================== V. Ton moteur de jeu (confirmé) ===================== */
    { id: "envieMoteurs", ch: "moteur", mode: "confirme", type: "grille", q: "Les moteurs qui te donnent envie",
      items: ["tokens", "counters", "aristo", "gy", "lands", "blink", "artifacts", "ench", "spells", "big", "life", "walkers", "kindred"] },
    { id: "enviePlans", ch: "moteur", mode: "confirme", type: "grille", q: "Les plans de jeu qui te donnent envie",
      items: ["aggro", "voltron", "combo", "mill", "control", "stax", "pillow", "hug", "slug", "goad", "chaos", "punish", "theft"] },

    /* ===================== VI. Univers et thème ===================== */
    { id: "tribus", ch: "univers", mode: "commun", type: "tribus", max: 6, q: "Les types de créatures qui te parlent", help: "Six choix au plus." },
    { id: "plans", ch: "univers", mode: "confirme", type: "plans", max: 4, q: "Les plans de Magic qui te font rêver", help: "Quatre choix au plus.", options: [
      O("inn", "Innistrad (horreur gothique)", { "c.B": .6, "c.W": .3, "c.U": .2 }), O("rav", "Ravnica (cité des guildes)", { "c.W": .2, "c.U": .2, "c.B": .2, "c.R": .2, "c.G": .2 }),
      O("phy", "Phyrexia (horreur biomécanique)", { "c.B": .5, "c.C": .5 }), O("ther", "Theros (mythes grecs)", { "c.W": .4, "c.U": .3, "c.G": .2 }),
      O("kam", "Kamigawa (esprits et néons)", { "c.U": .4, "c.W": .3, "c.C": .2 }), O("ixa", "Ixalan (dinosaures et pirates)", { "c.G": .4, "c.R": .3, "c.U": .2 }),
      O("eld", "Eldraine (contes de fées)", { "c.W": .4, "c.G": .3 }), O("blb", "Bloomburrow (animaux des bois)", { "c.G": .5, "c.W": .2 }),
      O("tark", "Tarkir (clans et dragons)", { "c.R": .4, "c.U": .2, "c.B": .2 }), O("akh", "Amonkhet (Égypte des dieux)", { "c.B": .3, "c.W": .3 }),
      O("khm", "Kaldheim (mythes nordiques)", { "c.G": .3, "c.R": .3 }), O("dom", "Dominaria (la grande histoire)", { "c.W": .3, "c.U": .3, "c.C": .2 }),
      O("dsk", "Duskmourn (maison hantée)", { "c.B": .5 }), O("otj", "Thunder Junction (western)", { "c.R": .4, "c.B": .3 }),
      O("stx", "Strixhaven (université de magie)", { "c.U": .4, "c.R": .3 }), O("lrw", "Lorwyn (féerie celtique)", { "c.G": .3, "c.B": .3, "c.W": .2 })] },
    { id: "ub", ch: "univers", mode: "commun", type: "choix", ordered: true, q: "Les cartes Universes Beyond (Warhammer 40K, Seigneur des Anneaux, Final Fantasy, Marvel…)", options: [
      O("love", "J'adore, surtout si ça mélange mes univers préférés", {}, { set: { ub: 2 } }), O("ok", "Ça me va", {}, { set: { ub: 1 } }),
      O("pref", "Je préfère les univers de Magic", {}, { set: { ub: 0 } }), O("no", "Pas dans mes decks", {}, { set: { ub: -1 } })] },
    { id: "victoire_reve", ch: "univers", mode: "confirme", type: "choix", q: "Ta victoire de rêve ressemble à…", options: [
      O("t", "Un dragon de 12/12 qui finit le travail", { "p.timmy": 1, "a.big": .5 }), O("j", "Une boucle de cinq cartes que j'explique fièrement à toute la table", { "p.johnny": 1, "p.mel": .4, "a.combo": .5 }),
      O("s", "Un plan propre et inévitable", { "p.spike": 1, "a.control": .3 }), O("v", "Une fin digne de l'histoire de mon commandant", { "p.vorthos": 1 })] },

    /* ===================== VII. Puissance, budget, rythme ===================== */
    { id: "ambiance", ch: "cadre", mode: "commun", type: "choix", ordered: true, q: "L'ambiance de partie qui te plaît", options: [
      O("chill", "Détendue : on rigole, on fait des trucs fous", { "p.timmy": .3 }, { set: { bracket: 2 } }),
      O("mid", "Équilibrée : on joue pour gagner, sans excès", {}, { set: { bracket: 3 } }),
      O("hard", "Compétitive : je veux de la puissance", { "p.spike": .6 }, { set: { bracket: 4 } })] },
    { id: "bracket", ch: "cadre", mode: "confirme", type: "choix", ordered: true, q: "Le niveau de puissance qui te fait le plus envie", help: "Les brackets officiels servent de langage commun avant de jouer. Cette réponse remplace la précédente.", options: [
      O("1", "Bracket 1 (Exhibition) : le concept avant tout", { "p.vorthos": .4 }, { set: { bracket: 1 } }),
      O("2", "Bracket 2 (Core) : niveau préconstruit, sans Game Changers", {}, { set: { bracket: 2 } }),
      O("3", "Bracket 3 (Upgraded) : deck amélioré, trois Game Changers au plus", {}, { set: { bracket: 3 } }),
      O("4", "Bracket 4 (Optimized) : fort, sans restriction", { "p.spike": .5 }, { set: { bracket: 4 } }),
      O("5", "Bracket 5 (cEDH) : compétitif, tout pour gagner", { "p.spike": 1 }, { set: { bracket: 5 } })] },
    { id: "complexite", ch: "cadre", mode: "commun", type: "echelle", q: "Le pilotage idéal", gauche: "Simple : je veux discuter en jouant", droite: "Un casse-tête qui me fait réfléchir",
      e: { "p.mel": .4, "p.johnny": .3 }, set: "complexite" },
    { id: "hasard", ch: "cadre", mode: "commun", type: "echelle", q: "Le hasard (pile ou face, cascade, dés, pioche du dessus)", gauche: "Je veux tout contrôler", droite: "Plus c'est fou, mieux c'est",
      e: { "a.chaos": 1, "a.control": -.3, "a.stax": -.3, "a.combo": -.2 }, set: "hasard" },
    { id: "budget", ch: "cadre", mode: "commun", type: "choix", ordered: true, q: "Budget pour un nouveau deck", options: [
      O("1", "Moins de 100 €", {}, { set: { budget: 1 } }), O("2", "100 à 300 €", {}, { set: { budget: 2 } }),
      O("3", "300 à 800 €", {}, { set: { budget: 3 } }), O("4", "Pas de limite", {}, { set: { budget: 4 } })] },
    { id: "proxy", ch: "cadre", mode: "confirme", type: "choix", q: "Les proxys (cartes imprimées) dans ton groupe", options: [
      O("yes", "Totalement acceptés", {}, { set: { proxy: 2 } }), O("test", "Pour tester seulement", {}, { set: { proxy: 1 } }), O("no", "Non, que des vraies cartes", {}, { set: { proxy: 0 } })] },
    { id: "depart_deck", ch: "cadre", mode: "commun", type: "choix", q: "Ton point de départ préféré", options: [
      O("precon", "Un deck préconstruit que j'améliore", {}, { set: { depart: "precon" } }), O("list", "Une liste trouvée en ligne que je modifie", { "p.spike": .2 }, { set: { depart: "list" } }),
      O("scratch", "Tout construire de zéro", { "p.johnny": .3 }, { set: { depart: "scratch" } }), O("any", "Peu importe", {}, { set: { depart: "any" } })] },
    { id: "popularite", ch: "cadre", mode: "confirme", type: "echelle", q: "Commandant populaire ou obscur ?", gauche: "Un grand classique, ça me va", droite: "Je veux un commandant que personne ne joue",
      e: { "p.johnny": .5 }, set: "obscur" },
    { id: "cmdtype", ch: "cadre", mode: "confirme", type: "choix", q: "Tu préfères un commandant…", options: [
      O("crea", "Créature légendaire classique", {}, { set: { cmdtype: "crea" } }), O("odd", "Atypique : planeswalker, véhicule…", { "a.walkers": .4 }, { set: { cmdtype: "odd" } }),
      O("duo", "En duo : partenaires ou Background", {}, { set: { cmdtype: "duo" } }), O("any", "Peu importe", {}, { set: { cmdtype: "any" } })] },
    { id: "ncol", ch: "cadre", mode: "commun", type: "choix", ordered: true, q: "Combien de couleurs dans ton deck idéal ?", options: [
      O("1", "Une seule, pure", {}, { set: { ncol: 1 } }), O("2", "Deux", {}, { set: { ncol: 2 } }), O("3", "Trois", {}, { set: { ncol: 3 } }),
      O("4", "Quatre ou cinq", {}, { set: { ncol: 4 } }), O("0", "Peu importe", {}, { set: { ncol: 0 } })] },

    /* ===================== VIII. Ce que tu ne veux plus affronter ===================== */
    { id: "aversions", ch: "contre", mode: "commun", type: "aversions", q: "Ton ressenti face à…",
      items: ["stax", "mld", "turns", "fastcombo", "theft", "mill", "discard", "chaos", "solitaire", "slug", "counterspells", "wipes", "pillow", "hardlock", "infect", "voltron", "endless", "tutors", "gyhate", "powergap", "goad", "target"] },

    /* ===================== IX. Les couleurs (déclaré : seules questions qui nomment les couleurs) ===================== */
    { id: "couleurs", ch: "couleurs", mode: "commun", type: "couleurs", q: "Ton affinité avec chaque couleur", help: "Une seule étoile pour ta couleur coup de cœur. « Jamais » écarte fortement cette couleur de tes propositions." },
    { id: "paires", ch: "couleurs", mode: "confirme", type: "paires", max: 3, q: "Les paires de couleurs qui t'attirent", help: "Trois choix au plus.",
      options: ["WU", "UB", "BR", "RG", "WG", "WB", "UR", "BG", "WR", "UG"].map(k => O(k, k)) },

    /* ===================== X. Ton contexte ===================== */
    { id: "possedes", ch: "contexte", mode: "commun", type: "collection", q: "Tes commandants actuels", help: "Ils ne te seront pas reproposés. Tu peux aussi coller une liste de deck complète." },
    { id: "prochain", ch: "contexte", mode: "commun", type: "choix", q: "Pour ton prochain deck, tu veux…", options: [
      O("new", "Quelque chose de différent de ce que j'ai", {}, { set: { prochain: "new" } }), O("deeper", "Mieux faire ce que j'aime déjà", {}, { set: { prochain: "deeper" } }),
      O("any", "Peu importe", {}, { set: { prochain: "any" } })] },
    { id: "favcards", ch: "contexte", mode: "commun", type: "texte", recherche: "cartes", max: 3, q: "Trois cartes que tu adores" },
    { id: "deteste", ch: "contexte", mode: "commun", type: "texte", recherche: "cartes", max: 1, q: "La carte ou le commandant que tu détestes le plus affronter" },
    { id: "reve", ch: "contexte", mode: "confirme", type: "texte", recherche: "commandants", max: 1, q: "Un commandant que tu as toujours voulu essayer" }
  ];

  /* Ce que chaque aversion fait subir : sert aux avertissements (« fait subir aux autres… »). */
  QC.AVERSIONS = {
    stax: { l: "Stax et taxes", style: "stax" }, mld: { l: "Destruction massive de terrains" }, turns: { l: "Tours supplémentaires en chaîne" },
    fastcombo: { l: "Combo infini rapide", style: "combo" }, theft: { l: "Vol de créatures", style: "theft" }, mill: { l: "Meule", style: "mill" },
    discard: { l: "Défausse et wheels" }, chaos: { l: "Chaos aléatoire", style: "chaos" }, solitaire: { l: "Tours de solitaire" },
    slug: { l: "Group slug", style: "slug" }, counterspells: { l: "Contresorts systématiques", style: "control" }, wipes: { l: "Wipes à répétition" },
    pillow: { l: "Pillowfort", style: "pillow" }, hardlock: { l: "Verrous durs", style: "stax" }, infect: { l: "Poison / infect" },
    voltron: { l: "Voltron qui tue en deux attaques", style: "voltron" }, endless: { l: "Partie sans fin" }, tutors: { l: "Tutors partout" },
    gyhate: { l: "Hate de cimetière" }, powergap: { l: "Écart de puissance" }, goad: { l: "Goad", style: "goad" }, target: { l: "Être la cible désignée" }
  };

  QC.questionsDuMode = mode => QC.QUESTIONS.filter(q => q.mode === "commun" || (mode === "confirme" && q.mode === "confirme"));
})(typeof module !== "undefined" ? (globalThis.QC = globalThis.QC || {}) : (window.QC = window.QC || {}));
