/* Maquettes : joueurs du groupe, simulation des comptes (localStorage) et aides partagées. */

const TINT = {
  W: ["#B08A35", "#3A3220"], U: ["#3B5BA8", "#141B33"], B: ["#6A3F6E", "#1A1418"],
  R: ["#B3361F", "#3A1210"], G: ["#2F8A50", "#0F2A1A"], C: ["#7A7A86", "#24242A"], none: ["#6B4A70", "#1F1424"]
};
const CORDER = ["W", "U", "B", "R", "G", "C"];
const CN = { W: "le blanc", U: "le bleu", B: "le noir", R: "le rouge", G: "le vert", C: "l’incolore" };
const ZERO = Object.fromEntries(CORDER.map(c => [c, 0]));

/* Les profils de départ, à réclamer par chaque ami. */
const BASE = [{ id: "ben", nom: "Ben" }, { id: "ilyes", nom: "Ilyes" }, { id: "clement", nom: "Clement" }, { id: "filipe", nom: "Filipe" }];

/* Données d'exemple (mode « exemple » seulement), pour juger le rendu d'un site rempli. */
const DEMO = {
  ben: { titre: "Le dompteur de dragons", id_c: "Temur", avatar: "Miirym, Sentinel Wyrm", devise: "Plus c’est gros, mieux c’est", psy: "Timmy",
    qui: "Timmy pur jus : il veut poser la plus grosse créature de la table et voir tout le monde réagir. La rampe est sa religion.",
    citation: "Un dragon de 12/12, c’est une réponse à toutes les questions.", deteste: "Les contresorts systématiques et les wipes à répétition.", fetiche: "Cultivate",
    said: { W: .15, U: .5, B: .2, R: .95, G: .85, C: .3 }, rev: { W: .2, U: .4, B: .15, R: .8, G: .95, C: .35 },
    styles: [["Rampe & gros sorts", 95, "Cultivate"], ["Aggro", 70, "Craterhoof Behemoth"], ["Tribal", 66, "Dragonlord Atarka"], ["Terrains", 55, "Field of the Dead"], ["Chaos", 40, "Possibility Storm"], ["Contrôle", 12, "Cyclonic Rift"]],
    cmdrs: [["The Ur-Dragon", 80], ["Miirym, Sentinel Wyrm", 93], ["Lathliss, Dragon Queen", 71]], maj: "il y a 5 jours" },
  ilyes: { titre: "Le chef de guerre", id_c: "Boros", avatar: "Aurelia, the Warleader", devise: "Tout le monde à l’attaque, maintenant", psy: "Spike",
    qui: "Spike qui aime le combat : il veut finir vite et proprement, idéalement au tour 7. Il n’a pas peur d’être la cible de la table.",
    citation: "Si on m’attaque, c’est que j’ai déjà gagné.", deteste: "Le pillowfort et les parties de trois heures.", fetiche: "Sword of Feast and Famine",
    said: { W: .85, U: .1, B: .2, R: .9, G: .3, C: .45 }, rev: { W: .8, U: .2, B: .1, R: .85, G: .35, C: .5 },
    styles: [["Aggro", 94, "Craterhoof Behemoth"], ["Voltron", 82, "Sword of Feast and Famine"], ["Jetons", 61, "Anointed Procession"], ["Artefacts", 52, "Sol Ring"], ["Contrôle", 18, "Cyclonic Rift"], ["Combo", 10, "Thassa's Oracle"]],
    cmdrs: [["Winota, Joiner of Forces", 79], ["Aurelia, the Warleader", 90], ["Wyleth, Soul of Steel", 74]], maj: "il y a 1 semaine" },
  clement: { titre: "Le nécromancien", id_c: "Golgari", avatar: "Meren of Clan Nel Toth", devise: "Les morts se relèvent à mon signal", psy: "Johnny",
    qui: "Son cimetière est une deuxième main. Il aime les longues chaînes de déclencheurs et sacrifier ses créatures pour mieux les ramener.",
    citation: "Merci pour le wipe, je reviens plus fort.", deteste: "La hate de cimetière permanente.", fetiche: "Living Death",
    said: { W: .1, U: .2, B: .95, R: .2, G: .75, C: .2 }, rev: { W: .15, U: .3, B: .9, R: .15, G: .7, C: .2 },
    styles: [["Cimetière", 95, "Animate Dead"], ["Aristocrates", 88, "Blood Artist"], ["Combo", 50, "Thassa's Oracle"], ["Jetons", 44, "Anointed Procession"], ["Contrôle", 30, "Cyclonic Rift"], ["Aggro", 20, "Craterhoof Behemoth"]],
    cmdrs: [["Karador, Ghost Chieftain", 77], ["Meren of Clan Nel Toth", 94], ["Muldrotha, the Gravetide", 85]], maj: "il y a 2 jours" },
  filipe: { titre: "Le savant fou", id_c: "Mono-bleu", avatar: "Urza, Lord High Artificer", devise: "Inventions et expériences ratées", psy: "Mel",
    qui: "Il adore les artefacts, les machines et les cartes au texte étrange. Planifier trois tours à l’avance est son plaisir.",
    citation: "Ça n’a pas marché, mais la mécanique était magnifique.", deteste: "Les wipes d’artefacts et le chaos aléatoire.", fetiche: "Sol Ring",
    said: { W: .3, U: .9, B: .25, R: .45, G: .1, C: .85 }, rev: { W: .25, U: .85, B: .2, R: .5, G: .1, C: .95 },
    styles: [["Artefacts", 96, "Sol Ring"], ["Combo", 75, "Thassa's Oracle"], ["Contrôle", 66, "Cyclonic Rift"], ["Spellslinger", 48, "Brainstorm"], ["Vol & clones", 30, "Agent of Treachery"], ["Chaos", 10, "Possibility Storm"]],
    cmdrs: [["Breya, Etherium Shaper", 78], ["Urza, Lord High Artificer", 93], ["Jhoira, Weatherlight Captain", 80]], maj: "hier" }
};

/* ---------- Simulation des comptes (navigateur uniquement) ---------- */
const ST = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } }
};
const MODE = ST.get("mq-mode", "vide");
const CLAIMS = ST.get("mq-claims", {});
const ME = ST.get("mq-me", null);
function players() {
  return [...BASE, ...ST.get("mq-custom", [])].map(p => {
    const ex = MODE === "exemple" && DEMO[p.id];
    return Object.assign({ g: "il", said: ZERO, rev: ZERO, styles: [], cmdrs: [], avatar: null }, p, ex || {},
      { done: !!ex, claimed: !!ex || !!CLAIMS[p.id] });
  });
}
const FRIENDS = players();
const FBYID = Object.fromEntries(FRIENDS.map(f => [f.id, f]));
const DONE = FRIENDS.filter(f => f.done);

function dominant(f) { if (!f.done) return "none"; return CORDER.slice().sort((a, b) => (f.said[b] + f.rev[b]) - (f.said[a] + f.rev[a]))[0]; }
function applyTint(f) { const [a, d] = TINT[dominant(f)]; document.documentElement.style.setProperty("--accent", a); document.documentElement.style.setProperty("--accent-deep", d); }
function statusOf(f) { return f.done ? f.titre + " · " + f.id_c : f.claimed ? "Quiz pas encore fait" : "Profil libre"; }
/* Avatar : illustration choisie, sinon l'initiale */
function avAttrs(f) { return f.avatar ? `data-art="${f.avatar}"` : `data-ini="${f.nom[0]}"`; }

/* ---------- Scryfall : requêtes espacées de 100 ms, mises en cache ---------- */
const SCRY = {}; let scryQ = Promise.resolve();
function scry(name) {
  if (SCRY[name]) return SCRY[name];
  return SCRY[name] = scryQ = scryQ.then(() => new Promise(r => setTimeout(r, 100))).then(() =>
    fetch("https://api.scryfall.com/cards/named?exact=" + encodeURIComponent(name)).then(r => r.json()).then(c => {
      const f = c.image_uris ? c : (c.card_faces || [])[0] || {};
      return { art: (f.image_uris || {}).art_crop, img: (f.image_uris || {}).normal, artist: c.artist };
    }).catch(() => ({})));
}
function fillImages(root) {
  root = root || document;
  root.querySelectorAll("[data-ini]").forEach(el => { el.classList.add("ini"); el.textContent = el.dataset.ini; });
  root.querySelectorAll("[data-art],[data-card]").forEach(el => {
    const n = el.dataset.art || el.dataset.card;
    scry(n).then(c => {
      const url = el.dataset.art ? c.art : c.img; if (!url) return;
      if (el.tagName === "IMG") el.src = url; else el.style.backgroundImage = `url("${url}")`;
      const cr = el.dataset.creditTarget && document.getElementById(el.dataset.creditTarget);
      if (cr && c.artist) cr.textContent = "Illustration : " + c.artist;
    });
  });
}

/* ---------- Bord déchiré ---------- */
function tearPath(seed, fill) {
  let d = "M0,46 L0,30 ", x = 0;
  const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  while (x < 1000) { x += 6 + r() * 14; d += `L${x.toFixed(1)},${(14 + r() * 26).toFixed(1)} `; }
  return `<path d="${d}L1000,46 Z" fill="${fill}"/>`;
}
function tears() { document.querySelectorAll("svg.tear").forEach((s, i) => { s.setAttribute("viewBox", "0 0 1000 46"); s.setAttribute("preserveAspectRatio", "none"); s.innerHTML = tearPath(7 + i * 13, s.dataset.fill || "#F3EEEA"); }); }

/* ---------- Hexagone ---------- */
function hexPoly(vals) {
  const ang = i => (-90 + i * 60) * Math.PI / 180;
  return CORDER.map((c, i) => [120 + 82 * vals[c] * Math.cos(ang(i)), 120 + 82 * vals[c] * Math.sin(ang(i))].map(n => n.toFixed(1)).join(",")).join(" ");
}
function hexSVG(said, rev, opt) {
  opt = opt || {};
  const col = opt.color || "var(--accent)", grid = opt.grid || "#D8CFD6", ink = opt.ink || "#2A2230";
  const full = Object.fromEntries(CORDER.map(c => [c, 1]));
  const ang = i => (-90 + i * 60) * Math.PI / 180;
  let s = "";
  [1, .66, .33].forEach(k => s += `<polygon points="${hexPoly(Object.fromEntries(CORDER.map(c => [c, k])))}" fill="none" stroke="${grid}"/>`);
  CORDER.forEach((c, i) => s += `<line x1="120" y1="120" x2="${(120 + 82 * Math.cos(ang(i))).toFixed(1)}" y2="${(120 + 82 * Math.sin(ang(i))).toFixed(1)}" stroke="${grid}" stroke-opacity=".6"/>`);
  const empty = v => !v || CORDER.every(c => !v[c]);
  if (!empty(said)) s += `<polygon points="${hexPoly(said)}" fill="${col}" fill-opacity=".3" stroke="${col}" stroke-width="2"/>`;
  if (!empty(rev)) s += `<polygon points="${hexPoly(rev)}" fill="none" stroke="${ink}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  if (opt.question) s += `<text x="120" y="134" text-anchor="middle" font-family="Cinzel,serif" font-size="40" fill="${grid}">?</text>`;
  if (opt.labels) CORDER.forEach((c, i) => { const x = 120 + 98 * Math.cos(ang(i)), y = 120 + 98 * Math.sin(ang(i)); s += `<image href="https://svgs.scryfall.io/card-symbols/${c}.svg" x="${x - 12}" y="${y - 12}" width="24" height="24"/>`; });
  return `<svg viewBox="0 0 240 240" aria-hidden="true">${s}</svg>`;
}

/* ---------- Barre de navigation ---------- */
function nav(current) {
  const me = ME && FBYID[ME];
  const L = [["index.html", "Accueil"], ["groupe.html", "Le groupe"], [me ? "profil.html?j=" + me.id : "qui.html", "Mon profil"], ["quiz.html", "Le quiz"], ["devine.html", "Devine ton ami"]];
  const who = me ? `<a class="me" href="profil.html?j=${me.id}"><span ${avAttrs(me)}></span>${me.nom}</a>` : `<a class="me" href="qui.html">Entrer</a>`;
  return `<nav class="nav" id="mainnav"><a class="logo" href="index.html">Le grand quiz<small>COMMANDER</small></a><ul id="navlist">${L.map(([h, l, soon]) => `<li><a href="${h}"${l === current ? ' aria-current="page"' : ""}${soon ? ' class="soon" title="Maquette à venir"' : ""}>${l}</a></li>`).join("")}</ul>${who}
    <button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="navlist" onclick="const n=document.getElementById('mainnav');const o=n.classList.toggle('open');this.setAttribute('aria-expanded',o)"><i></i><i></i><i></i></button></nav>`;
}
function setMode(m) { ST.set("mq-mode", m); location.reload(); }
function resetMock() { ["mq-claims", "mq-me", "mq-custom"].forEach(k => ST.del(k)); location.reload(); }
document.addEventListener("DOMContentLoaded", () => {
  const n = document.getElementById("nav"); if (n) n.outerHTML = nav(n.dataset.current);
  tears();
  document.body.insertAdjacentHTML("beforeend", `<div class="note"><b>Maquette</b> · Données :
    <button onclick="setMode('vide')" aria-pressed="${MODE === "vide"}">vides</button>
    <button onclick="setMode('exemple')" aria-pressed="${MODE === "exemple"}">exemple</button>
    · <button onclick="resetMock()">réinitialiser les comptes</button></div>`);
  fillImages(document.querySelector(".nav"));
});
