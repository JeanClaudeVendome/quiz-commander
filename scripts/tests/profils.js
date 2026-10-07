/* Joueurs tests : des réponses écrites à l'avance et ce qu'on attend du moteur (docs/moteur.md §7.2).
   Chaque attente reçoit le top 10 (liste de notes détaillées) et renvoie [réussi, message]. */
const cedhRef = require("../../data/power_ref.json");
const CEDH = new Set([...cedhRef.cedh, ...cedhRef.fort]);
const ord = ci => "WUBRG".split("").filter(c => (ci || "").includes(c)).join("");
const has = (x, c) => ord(x.c.ci).includes(c);
const count = (top, f) => top.filter(f).length;
const mean = (top, f) => top.reduce((s, x) => s + f(x), 0) / top.length;
const styleOf = (x, k, min) => (x.c.s && x.c.s[k] || 0) >= (min || .45);
const mainIn = (x, ks) => ks.includes((x.c.t || [])[0]);
const att = (msg, ok) => [ok, msg];

const COMMUN_NEUTRE = { moment: "?", carte: "?", d1: "?", d9: "?", explosion: 3, tempo: "7", winrate: "2", politique: 3, archenemy: "fun",
  ub: "ok", ambiance: "mid", complexite: 3, hasard: 3, budget: "2", depart_deck: "any", ncol: "0", prochain: "any" };

module.exports = [
  {
    id: "debutant", nom: "Lucas, débutant (dragons, rouge-vert, simple, petit budget)", mode: "commun",
    a: Object.assign({}, COMMUN_NEUTRE, {
      fantasy: ["dragons", "beastmaster"], moment: "t", carte: "t", probleme: "G", philo: ["R", "G"], d1: "a", d9: "b",
      vibe: ["giant", "army"], envie: ["sword", "counter"], wincon: ["big", "army"], d3: "a", d11: "a", d12: "a", explosion: 4, tempo: "7", winrate: "x",
      oeil: { "Ghalta, Primal Hunger": 1, "Atraxa, Praetors' Voice": 0, "Krenko, Mob Boss": 1, "Talrand, Sky Summoner": 0, "Lathliss, Dragon Queen": 1, "Teysa Karlov": 0 },
      role: "threat", creature: "haste", politique: 2, archenemy: "go", vol: "kill", attaque: "tank", rase: "cmdr",
      tribus: ["Dragon", "Dinosaur"], ub: "ok", ambiance: "chill", complexite: 1, hasard: 3, budget: "1", depart_deck: "precon", ncol: "2",
      aversions: { fastcombo: 0, counterspells: 1, solitaire: 1 }, couleurs: { W: 1, U: 1, B: 1, R: 3, G: 3, C: 2 }, prochain: "any"
    }),
    attentes: top => [
      att("au moins 8 sur 10 restent en rouge et/ou vert", count(top, x => ord(x.c.ci).split("").every(c => "RG".includes(c)) && ord(x.c.ci)) >= 8),
      att("au moins 2 dragons", count(top, x => (x.c.k || []).includes("Dragon")) >= 2),
      att("complexité moyenne ≤ 2,8", mean(top, x => x.c.x || 2) <= 2.8),
      att("aucun commandant de puissance ≥ 3,6", top.every(x => (x.c.p || 2) < 3.6)),
      att("au moins 1 commandant de préconstruit", count(top, x => (x.c.pc || []).length) >= 1)
    ]
  },
  {
    id: "confirmee", nom: "Sarah, confirmée (sacrifice et cimetière noir-vert, bracket 3, possède Meren, veut changer)", mode: "confirme",
    a: Object.assign({}, COMMUN_NEUTRE, {
      fantasy: ["necro", "villain"], moment: "j", carte: "m", probleme: "B", philo: ["B", "G"], d1: "a", d9: "a", booster: "j", depart: "j", theme: 3,
      vibe: ["dead", "combo", "army"], envie: ["life", "counter"], wincon: ["drain", "combo", "army"], d3: "b", d11: "a", d12: "a", explosion: 4, tempo: "10", winrate: "2",
      d2: "a", d6: "a", d7: "b", d10: "a", d4: "b",
      oeil: { "Teysa Karlov": 1, "Atraxa, Praetors' Voice": 0, "Krenko, Mob Boss": .5, "Talrand, Sky Summoner": 0, "Korvold, Fae-Cursed King": 1, "Ghalta, Primal Hunger": 0 },
      role: "shadow", creature: "dies", politique: 3, archenemy: "stress", vol: "threat", attaque: "tank", rase: "gy",
      interaction: 3, contresort: "after", gagnant: "other", d5: "a", d8: "b", combo_pret: "wait",
      envieMoteurs: { tokens: 2, counters: 1, aristo: 3, gy: 3, lands: 1, blink: 1, artifacts: 1, ench: 1, spells: 1, big: 1, life: 2, walkers: 0, kindred: 1 },
      enviePlans: { aggro: 1, voltron: 0, combo: 2, mill: 1, control: 1, stax: 0, pillow: 1, hug: 1, slug: 2, goad: 1, chaos: 1, punish: 1, theft: 2 },
      tribus: ["Zombie", "Squirrel"], plans: ["inn", "blb"], ub: "ok", victoire_reve: "j", ambiance: "mid", bracket: "3", complexite: 4, hasard: 2,
      budget: "2", proxy: "test", depart_deck: "list", popularite: 3, cmdtype: "crea", ncol: "2",
      aversions: { stax: 0, mld: 0, hardlock: 0, gyhate: 0, fastcombo: 1 }, couleurs: { W: 1, U: 1, B: 3, R: 1, G: 3, C: 1, star: "B" }, paires: ["BG", "WB"],
      possedes: { commandants: ["Meren of Clan Nel Toth"], decks: [{ cmdrs: ["Meren of Clan Nel Toth"], ci: "BG", styles: { gy: .3, aristo: .25 } }] }, prochain: "new"
    }),
    attentes: top => [
      att("Meren (déjà possédé) n'apparaît pas", top.every(x => x.c.n !== "Meren of Clan Nel Toth")),
      att("au moins 7 sur 10 contiennent du noir", count(top, x => has(x, "B")) >= 7),
      att("au moins 3 sur 10 ont un style principal autre que cimetière ou aristocrates (elle veut changer)", count(top, x => !mainIn(x, ["gy", "aristo"])) >= 3),
      att("puissance moyenne entre 2,2 et 3,6 (bracket 3)", (m => m >= 2.2 && m <= 3.6)(mean(top, x => x.c.p || 2)))
    ]
  },
  {
    id: "veteran", nom: "Marc, vétéran (contrôle et stax bleu-blanc, bracket 4, obscur, complexe, pas d'Universes Beyond)", mode: "confirme",
    a: Object.assign({}, COMMUN_NEUTRE, {
      fantasy: ["archmage", "villain"], moment: "s", carte: "s", probleme: "U", philo: ["U", "W"], d1: "b", d9: "a", booster: "s", depart: "s", theme: 5,
      vibe: ["lock", "combo", "spells"], envie: ["rule", "machine", "wall"], wincon: ["alt", "combo", "survive"], d3: "a", d11: "b", d12: "b", explosion: 3, tempo: "7", winrate: "3",
      d2: "b", d6: "b", d7: "a", d10: "a", d4: "a",
      oeil: { "Talrand, Sky Summoner": 1, "Atraxa, Praetors' Voice": .5, "Krenko, Mob Boss": 0, "Grand Arbiter Augustin IV": 1, "Ghalta, Primal Hunger": 0, "Brago, King Eternal": 1 },
      role: "sheriff", creature: "copy", politique: 2, archenemy: "fun", vol: "yes", attaque: "trap", rase: "hand",
      interaction: 5, contresort: "love", gagnant: "stop", d5: "b", d8: "a", combo_pret: "win",
      envieMoteurs: { tokens: 1, counters: 1, aristo: 1, gy: 1, lands: 1, blink: 2, artifacts: 3, ench: 2, spells: 3, big: 0, life: 1, walkers: 1, kindred: 0 },
      enviePlans: { aggro: 0, voltron: 1, combo: 3, mill: 1, control: 3, stax: 3, pillow: 2, hug: 0, slug: 1, goad: 0, chaos: 0, punish: 1, theft: 2 },
      tribus: ["Wizard", "Sphinx"], plans: ["dom", "rav"], ub: "no", victoire_reve: "s", ambiance: "hard", bracket: "4", complexite: 5, hasard: 1,
      budget: "4", proxy: "no", depart_deck: "scratch", popularite: 5, cmdtype: "any", ncol: "2",
      aversions: { chaos: 0, goad: 0, stax: 3, counterspells: 3 }, couleurs: { W: 3, U: 3, B: 2, R: 1, G: 0, C: 2, star: "U" }, paires: ["WU", "UB"],
      possedes: { commandants: ["Urza, Lord High Artificer"] }, prochain: "deeper"
    }),
    attentes: top => [
      att("aucune carte Universes Beyond", top.every(x => !x.c.ub)),
      att("aucun vert (« Jamais »)", top.every(x => !has(x, "G"))),
      att("puissance moyenne ≥ 3,0", mean(top, x => x.c.p || 2) >= 3.0),
      att("au moins 7 sur 10 jouent le contrôle, le stax, le combo, les sorts, les artefacts ou le vol", count(top, x => (x.c.t || []).some(k => ["control", "stax", "combo", "spells", "artifacts", "theft"].includes(k))) >= 7),
      att("au moins un des commandants aimés au coup d'œil (Grand Arbiter, Brago, Talrand)", count(top, x => ["Grand Arbiter Augustin IV", "Brago, King Eternal", "Talrand, Sky Summoner"].includes(x.c.n)) >= 1),
      att("au moins 4 commandants de puissance ≥ 3,5", count(top, x => (x.c.p || 2) >= 3.5) >= 4)
    ]
  },
  {
    id: "anticombo", nom: "Anti-combo (déteste les combos, aime l'attaque)", mode: "confirme",
    a: Object.assign({}, COMMUN_NEUTRE, {
      fantasy: ["warlord"], vibe: ["army", "giant"], wincon: ["army", "voltron"], explosion: 1, combo_pret: "none", d7: "a", d10: "a", moment: "t",
      enviePlans: { aggro: 3, voltron: 2, combo: 0, mill: 0, control: 1, stax: 0, pillow: 1, hug: 1, slug: 1, goad: 2, chaos: 1, punish: 1, theft: 1 },
      aversions: { fastcombo: 0, tutors: 0, solitaire: 0 }, couleurs: { W: 3, U: 1, B: 1, R: 3, G: 2, C: 1 }, bracket: "3"
    }),
    attentes: top => [
      att("aucun commandant dont le combo est son style principal", top.every(x => (x.c.t || [])[0] !== "combo")),
      att("aucun commandant à combo rapide réellement joué (R ou S)", top.every(x => !(x.c.cb && ["R", "S"].includes(x.c.cb.bp))))
    ]
  },
  {
    id: "incolore", nom: "Amateur d'incolore et d'artefacts", mode: "confirme",
    a: Object.assign({}, COMMUN_NEUTRE, {
      fantasy: ["machine", "inventor"], probleme: "C", philo: ["C", "U"], vibe: ["spells", "combo"], envie: ["machine"], d11: "b", rase: "perm",
      envieMoteurs: { artifacts: 3, tokens: 1, counters: 1, aristo: 0, gy: 1, lands: 1, blink: 1, ench: 0, spells: 2, big: 2, life: 0, walkers: 1, kindred: 0 },
      couleurs: { W: 1, U: 2, B: 1, R: 1, G: 1, C: 3, star: "C" }, ncol: "0"
    }),
    attentes: top => [
      att("au moins 1 commandant incolore", count(top, x => !ord(x.c.ci)) >= 1),
      att("au moins 5 sur 10 jouent les artefacts", count(top, x => styleOf(x, "artifacts")) >= 5)
    ]
  },
  {
    id: "hug", nom: "Diplomate (group hug, vert-bleu-blanc)", mode: "commun",
    a: Object.assign({}, COMMUN_NEUTRE, {
      fantasy: ["diplomat", "king"], vibe: ["allies", "lands"], role: "diplo", politique: 5, archenemy: "ruin", wincon: ["goad", "survive"], attaque: "deter",
      couleurs: { W: 2, U: 3, B: 1, R: 1, G: 3, C: 1 }, probleme: "G", philo: ["G", "W"]
    }),
    attentes: top => [att("au moins 3 sur 10 en group hug, goad ou pillowfort", count(top, x => styleOf(x, "hug") || styleOf(x, "goad") || styleOf(x, "pillow")) >= 3)]
  },
  {
    id: "voltron", nom: "Paladin (voltron blanc)", mode: "commun",
    a: Object.assign({}, COMMUN_NEUTRE, {
      fantasy: ["paladin"], vibe: ["giant"], envie: ["sword"], creature: "untouch", wincon: ["voltron"], rase: "cmdr", d3: "a", role: "threat",
      couleurs: { W: 3, U: 1, B: 1, R: 2, G: 1, C: 1, star: "W" }, probleme: "W", philo: ["W"]
    }),
    attentes: top => [
      att("au moins 4 sur 10 en voltron", count(top, x => styleOf(x, "voltron", .4)) >= 4),
      att("au moins 8 sur 10 contiennent du blanc", count(top, x => has(x, "W")) >= 8)
    ]
  },
  {
    id: "budget", nom: "Petit budget (aggro rouge-noir, débutant)", mode: "commun",
    a: Object.assign({}, COMMUN_NEUTRE, {
      fantasy: ["villain", "warlord"], vibe: ["army", "hurt"], wincon: ["army", "burn"], role: "threat", budget: "1", complexite: 2, depart_deck: "precon",
      couleurs: { W: 1, U: 0, B: 3, R: 3, G: 1, C: 1 }, probleme: "R", philo: ["R", "B"]
    }),
    attentes: top => [
      att("aucun commandant à plus de 15 €", top.every(x => x.c.usd == null || x.c.usd <= 15)),
      att("aucun bleu (« Jamais »)", top.every(x => !has(x, "U")))
    ]
  },
  {
    id: "elfes", nom: "Tribal elfes", mode: "commun",
    a: Object.assign({}, COMMUN_NEUTRE, { tribus: ["Elf"], vibe: ["tribe", "army", "lands"], fantasy: ["druid"], couleurs: { W: 1, U: 1, B: 2, R: 1, G: 3, C: 1, star: "G" } }),
    attentes: top => [att("au moins 3 commandants elfes ou tribaux elfes", count(top, x => (x.c.k || []).includes("Elf")) >= 3)]
  },
  {
    id: "ub", nom: "Fan d'Universes Beyond", mode: "commun",
    a: Object.assign({}, COMMUN_NEUTRE, { ub: "love", fantasy: ["warlord"], vibe: ["army"], couleurs: { W: 3, U: 2, B: 1, R: 2, G: 1, C: 1 } }),
    attentes: top => [att("au moins 3 cartes Universes Beyond", count(top, x => x.c.ub) >= 3)]
  },
  {
    id: "cedh", nom: "Spike cEDH (bracket 5, bleu-noir, budget illimité)", mode: "confirme",
    a: Object.assign({}, COMMUN_NEUTRE, {
      moment: "s", carte: "s", d1: "b", winrate: "3", booster: "s", depart: "s", theme: 5, victoire_reve: "s", vibe: ["combo", "lock"], wincon: ["combo", "alt"],
      enviePlans: { aggro: 0, voltron: 0, combo: 3, mill: 0, control: 3, stax: 3, pillow: 0, hug: 0, slug: 0, goad: 0, chaos: 0, punish: 0, theft: 2 },
      bracket: "5", budget: "4", proxy: "yes", couleurs: { W: 2, U: 3, B: 3, R: 2, G: 2, C: 1 }, combo_pret: "win", contresort: "love"
    }),
    attentes: top => [
      att("puissance moyenne ≥ 3,8", mean(top, x => x.c.p || 2) >= 3.8),
      att("au moins 4 commandants de la référence forte ou cEDH", count(top, x => CEDH.has(x.c.n)) >= 4)
    ]
  },
  {
    id: "chaos", nom: "Agent du chaos (rouge)", mode: "commun",
    a: Object.assign({}, COMMUN_NEUTRE, { fantasy: ["chaos"], vibe: ["crazy"], role: "chaos", hasard: 5, couleurs: { W: 1, U: 2, B: 1, R: 3, G: 1, C: 1, star: "R" }, probleme: "R" }),
    attentes: top => [att("au moins 3 sur 10 en chaos", count(top, x => styleOf(x, "chaos", .4)) >= 3)]
  }
];
