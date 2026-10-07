/* =====================================================================
   Le grand quiz Commander — outils communs à toutes les pages.
   Dépend de : moteur/*.js, site/config.js, site/stockage.js
   ===================================================================== */
(function () {
  "use strict";
  const QC = window.QC, ST = window.QCStock, I = window.I18N, t = I.T;
  const SITE = window.SITE = {};
  SITE.T = t;

  /* ---------- langue : textes du moteur traduits une fois pour toutes (le calcul ne dépend que des identifiants) ---------- */
  I.donnees(QC.CHAPITRES, ["titre", "intro"]);
  I.donnees(QC.QUESTIONS, ["q", "help", "gauche", "droite", "l", "d"]);
  [QC.PERSONNAGES, QC.NOMS_STYLES, QC.NOMS_COULEURS].forEach(I.table);
  I.donnees(QC.AVERSIONS, ["l"]);
  /* Nom d'une carte à afficher : le nom français s'il existe (en français), le nom anglais sinon */
  SITE.nomCarte = c => (!I.EN && c.fr) || c.n;
  /* Pluriel : en français à partir de 2 (0 et 1 au singulier), en anglais dès que ce n'est pas 1 */
  SITE.pluriel = n => I.EN ? n !== 1 : n > 1;
  SITE.guillemets = s => I.EN ? "“" + s + "”" : "« " + s + " »";

  /* ---------- petits outils ---------- */
  const esc = SITE.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ord = SITE.ord = ci => "WUBRG".split("").filter(c => (ci || "").includes(c)).join("");
  SITE.$ = id => document.getElementById(id);
  SITE.param = k => new URLSearchParams(location.search).get(k);
  SITE.depuis = d => {
    if (!d) return "";
    const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return t("à l'instant"); if (m < 60) return t("il y a {n} min", { n: m }); if (m < 1440) return t("il y a {n} h", { n: Math.round(m / 60) });
    const j = Math.round(m / 1440); if (j === 1) return t("hier"); if (j < 30) return t("il y a {n} jours", { n: j });
    return t("le {d}", { d: SITE.dateLongue(d) });
  };
  SITE.dateLongue = d => new Date(d).toLocaleDateString(I.locale, { day: "numeric", month: "long", year: "numeric" });

  /* ---------- données ---------- */
  let catalogue = null;
  SITE.charger = async function () {
    if (catalogue) return catalogue;
    const r = await fetch("data/commanders.json");
    if (!r.ok) throw new Error(t("Données introuvables (data/commanders.json)."));
    catalogue = await r.json();
    QC.preparer(catalogue.cards);
    return catalogue;
  };
  SITE.carte = n => QC.D && QC.D.byName[n];

  /* ---------- textes du profil ---------- */
  const GUILDES = { W: "Mono-blanc", U: "Mono-bleu", B: "Mono-noir", R: "Mono-rouge", G: "Mono-vert", "": "Incolore",
    WU: "Azorius", UB: "Dimir", BR: "Rakdos", RG: "Gruul", WG: "Selesnya", WB: "Orzhov", UR: "Izzet", BG: "Golgari", WR: "Boros", UG: "Simic",
    WUB: "Esper", UBR: "Grixis", BRG: "Jund", WRG: "Naya", WUG: "Bant", WBG: "Abzan", WUR: "Jeskai", UBG: "Sultai", WBR: "Mardu", URG: "Temur",
    UBRG: "Quatre couleurs sans blanc", WBRG: "Quatre couleurs sans bleu", WURG: "Quatre couleurs sans noir", WUBG: "Quatre couleurs sans rouge", WUBR: "Quatre couleurs sans vert", WUBRG: "Cinq couleurs" };
  SITE.GUILDES = I.table(GUILDES);
  const TITRES_STYLE = { aggro: "Le chef de guerre", voltron: "Le champion", tokens: "Le souverain bâtisseur", aristo: "Le maître des sacrifices",
    counters: "Le jardinier", kindred: "Le chef de clan", big: "Le dompteur de colosses", lands: "Le druide", blink: "L'illusionniste",
    life: "L'ange gardien", gy: "Le nécromancien", artifacts: "Le savant fou", ench: "L'enchanteur", spells: "L'archimage", control: "Le stratège",
    stax: "Le geôlier", pillow: "Le bâtisseur de forteresses", combo: "L'horloger", hug: "Le diplomate", slug: "Le bourreau", goad: "Le manipulateur",
    theft: "L'escroc", mill: "L'archiviste", chaos: "L'agent du chaos", walkers: "Le maître des arpenteurs", punish: "Le vengeur" };
  I.table(TITRES_STYLE);
  const PSY_TXT = { timmy: ["Timmy", "les grands moments, les gros sorts, les attaques dont on se souvient"],
    johnny: ["Johnny", "faire marcher une idée qui n'appartient qu'à soi, la combinaison que personne n'a vue venir"],
    spike: ["Spike", "bien jouer, optimiser, gagner proprement"] };
  for (const k in PSY_TXT) PSY_TXT[k][1] = t(PSY_TXT[k][1]);
  const STYLE_ART = { aggro: "Craterhoof Behemoth", voltron: "Sword of Feast and Famine", tokens: "Anointed Procession", aristo: "Blood Artist",
    counters: "Hardened Scales", kindred: "Kindred Discovery", big: "Worldspine Wurm", lands: "Field of the Dead", blink: "Ephemerate", life: "Soul Warden",
    gy: "Animate Dead", artifacts: "Sol Ring", ench: "Enchantress's Presence", spells: "Brainstorm", control: "Cyclonic Rift", stax: "Winter Orb",
    pillow: "Ghostly Prison", combo: "Thassa's Oracle", hug: "Howling Mine", slug: "Purphoros, God of the Forge", goad: "Disrupt Decorum",
    theft: "Agent of Treachery", mill: "Maddening Cacophony", chaos: "Possibility Storm", walkers: "Doubling Season", punish: "Comeuppance" };
  SITE.STYLE_ART = STYLE_ART;
  const NOM_STYLE_COURT = { aggro: "Attaque", voltron: "Voltron", tokens: "Jetons", aristo: "Aristocrates", counters: "Compteurs +1/+1", kindred: "Tribal",
    big: "Rampe & gros sorts", lands: "Terrains", blink: "Blink", life: "Gain de vie", gy: "Cimetière", artifacts: "Artefacts", ench: "Enchantements",
    spells: "Spellslinger", control: "Contrôle", stax: "Stax", pillow: "Pillowfort", combo: "Combo", hug: "Group hug", slug: "Group slug", goad: "Goad",
    theft: "Vol & clones", mill: "Meule", chaos: "Chaos", walkers: "Superfriends", punish: "Punition" };
  SITE.NOM_STYLE_COURT = I.table(NOM_STYLE_COURT);

  SITE.identite = function (P) {
    const F = P.couleurs.final, cols = "WUBRG".split("").sort((a, b) => F[b] - F[a]);
    if (F.C > F[cols[0]] + .05) return "";
    let n = P.set.ncol && P.set.ncol !== 4 ? P.set.ncol : cols.filter(c => F[c] >= Math.max(.5, F[cols[0]] * .8)).length || 1;
    n = Math.max(1, Math.min(P.set.ncol === 4 ? 4 : 3, n));
    return ord(cols.slice(0, n).join(""));
  };
  SITE.titre = function (P) {
    const f = Object.entries(P.theme.fant).sort((a, b) => b[1] - a[1])[0];
    if (f && f[1] >= 1) return QC.PERSONNAGES[f[0]];
    return TITRES_STYLE[P.topStyles[0]] || t("L'explorateur");
  };
  SITE.psyPrincipale = P => Object.entries(P.motivation).sort((a, b) => b[1] - a[1])[0][0];
  SITE.texteQui = function (P) {
    const k = SITE.psyPrincipale(P), [nom, d] = PSY_TXT[k];
    const st = P.topStyles.filter(s => P.styles[s] > .2).slice(0, 2).map(s => QC.NOMS_STYLES[s]);
    let x = t("{nom} avant tout : {d}.", { nom, d });
    if (st.length) x += t(" Aime surtout {s}.", { s: st.join(t(" et ")) });
    if (P.psy.vorthos > .62) x += t(" Le thème compte autant que l'efficacité.");
    else if (P.psy.mel > .62) x += t(" Sensible à la beauté d'une mécanique bien huilée.");
    const pol = P.set.politique;
    if (pol >= 4) x += t(" Adore négocier à table."); else if (pol && pol <= 2) x += t(" Préfère jouer que négocier.");
    return x;
  };
  SITE.contradiction = function (P) {
    const c = P.contradictions.find(x => x.type === "couleur-dite"), d = P.contradictions.find(x => x.type === "couleur-revelee");
    if (c && d) return t("Se dit attiré par {a}, mais ses réponses penchent vers {b}.", { a: QC.NOMS_COULEURS[c.c], b: QC.NOMS_COULEURS[d.c] });
    return null;
  };
  SITE.devise = function (P) {
    const top = P.topStyles[0];
    const D = { aggro: "Tout le monde à l'attaque, maintenant", voltron: "Un seul champion suffit", tokens: "Plus on est nombreux, mieux c'est",
      aristo: "Chaque sacrifice rapporte", counters: "Grandir un peu plus chaque tour", kindred: "Une famille, une armée", big: "Plus c'est gros, mieux c'est",
      lands: "Chaque terrain compte", blink: "Ce qui part revient", life: "Protéger, guérir, veiller", gy: "Les morts se relèvent à mon signal",
      artifacts: "Inventions et machines", ench: "La magie qui dure", spells: "Un sort de plus", control: "Rien ne se passe sans mon accord",
      stax: "Les règles, c'est moi", pillow: "Qui s'y frotte s'y pique", combo: "L'ombre qui gagne au dernier tour", hug: "Tout le monde y gagne",
      slug: "Un peu de mal à tout le monde", goad: "Laissez-les s'entretuer", theft: "Ce qui est à toi est à moi", mill: "Plus une seule carte",
      chaos: "Personne ne sait ce qui va arriver", walkers: "Une équipe d'arpenteurs", punish: "Chaque coup se paie" };
    return t(D[top] || "Un joueur à découvrir");
  };
  SITE.citation = function (A) {
    const q = QC.QUESTIONS.find(x => x.id === "moment"), o = q && q.options.find(x => x.id === A.moment);
    // « I » reste en majuscule en anglais ; en français, la phrase continue en minuscule
    return o ? t("Ma meilleure partie ? Celle où {x}.", { x: /^I\b/.test(o.l) ? o.l : o.l.charAt(0).toLowerCase() + o.l.slice(1) }) : null;
  };
  SITE.deteste = function (A, P) {
    const l = Object.entries(P.aversions).filter(([, v]) => v === 0).map(([k]) => (QC.AVERSIONS[k] || {}).l).filter(Boolean);
    const d = (A.deteste || []).map(c => c.n || c);
    return [...l.slice(0, 3).map(s => s.toLowerCase()), ...d].join(", ");
  };

  /* Profil d'un joueur à partir de sa dernière version.
     La mesure (P) est quasi gratuite ; les commandants proposés (res) coûtent cher (≈ 3 500 commandants notés) :
     ils ne sont calculés qu'à la demande (pr.res), et gardés dans le navigateur par version et par date des données. */
  const cacheProfils = {}, CACHE_RES = "qc-propositions";
  let resDisque = null;
  const lireRes = () => { if (!resDisque) { try { resDisque = JSON.parse(localStorage.getItem(CACHE_RES) || "{}"); } catch (e) { resDisque = {}; } } return resDisque; };
  const compacter = x => ({ n: x.c.n, note: x.note, pct: x.pct, rang: x.rang, parts: x.parts, pourquoi: x.pourquoi, attention: x.attention, drapeaux: x.drapeaux });
  const regonfler = l => l.map(x => Object.assign({}, x, { c: SITE.carte(x.n) })).filter(x => x.c);
  function propositions(j, P) {
    const cle = j.id + ":" + j.maj + ":" + ((catalogue && catalogue.meta && catalogue.meta.built) || "") + ":" + QC.R.diversite + ":" + I.LANG; // les explications dépendent de la langue
    const d = lireRes();
    if (d[cle]) {
      const r = d[cle];
      return { classement: regonfler(r.classement), familles: { sur: regonfler(r.sur), surprise: regonfler(r.surprise), horsZone: regonfler(r.horsZone) } };
    }
    const res = QC.proposer(P, { n: 12 });
    // on ne garde que les versions actuelles des joueurs (le cache ne grossit pas indéfiniment)
    for (const k in d) if (k.split(":")[0] === j.id) delete d[k];
    d[cle] = { classement: res.classement.map(compacter), sur: res.familles.sur.map(compacter), surprise: res.familles.surprise.map(compacter), horsZone: res.familles.horsZone.map(compacter) };
    try { localStorage.setItem(CACHE_RES, JSON.stringify(d)); } catch (e) { }
    return { classement: res.classement, familles: res.familles };
  }
  SITE.profil = function (j) {
    if (!j || !j.reponses) return null;
    const k = j.id + ":" + j.maj;
    if (cacheProfils[k]) return cacheProfils[k];
    const P = QC.mesurer(j.reponses, j.mode);
    const pr = { P, A: j.reponses, ident: SITE.identite(P), titre: SITE.titre(P) };
    let res = null;
    Object.defineProperty(pr, "res", { get: () => res || (res = propositions(j, P)) });
    return cacheProfils[k] = pr;
  };
  SITE.avatarDe = function (j) {
    if (j.avatar) return j.avatar;
    const pr = SITE.profil(j);
    return pr && pr.res.familles.sur[0] ? pr.res.familles.sur[0].c.n : null;
  };
  SITE.statut = function (j) {
    const pr = SITE.profil(j);
    if (pr) return pr.titre + " · " + (GUILDES[pr.ident] || pr.ident);
    return t(j.reclame ? "Quiz pas encore fait" : "Profil libre");
  };
  SITE.avAttrs = j => { const a = SITE.avatarDe(j); return a ? `data-art="${esc(a)}"` : `data-ini="${esc(j.pseudo[0])}"`; };

  /* ---------- groupe (avec cache de page) ---------- */
  let groupe = null;
  /* La communauté : tous les joueurs (tous visibles par tous) et les groupes de jeu (cercles) à l'intérieur */
  SITE.groupe = async function (force) {
    if (groupe && !force) return groupe;
    const [js, cs] = await Promise.all([ST.joueurs(), ST.cercles().catch(() => [])]);
    groupe = { joueurs: js, parId: Object.fromEntries(js.map(j => [j.id, j])), cercles: cs || [], parCercle: Object.fromEntries((cs || []).map(c => [c.id, c])) };
    return groupe;
  };
  SITE.moi = () => groupe && groupe.parId[ST.moi()] || null;
  SITE.membresDe = c => (c.membres || []).map(id => groupe.parId[id]).filter(Boolean);
  SITE.cerclesDe = j => (j && j.cercles || []).map(id => groupe.parCercle[id]).filter(Boolean);
  SITE.mesCercles = () => SITE.cerclesDe(SITE.moi());
  /* Moyenne des hexagones d'une liste de joueurs (null si aucun profil publié) */
  SITE.hexMoyen = joueurs => {
    const P = joueurs.map(j => SITE.profil(j)).filter(Boolean).map(x => x.P.couleurs.final);
    return P.length ? Object.fromEntries(QC.COULEURS.map(c => [c, P.reduce((s, f) => s + f[c], 0) / P.length])) : null;
  };
  /* Carte d'un groupe : mosaïque d'avatars, nombre de joueurs, mini-hexagone moyen */
  SITE.carteCercle = function (c, opt) {
    const mb = SITE.membresDe(c), moy = SITE.hexMoyen(mb), moi = SITE.moi(), dedans = c.id !== "tous" && moi && (c.membres || []).includes(moi.id);
    const faits = mb.filter(j => j.reponses).length;
    return `<a class="gc${dedans ? " mien" : ""}" href="groupe.html?g=${c.id}">
      <div class="gc-mos">${mb.slice(0, 4).map(j => `<span ${SITE.avAttrs(j)}></span>`).join("")}${mb.length > 4 ? `<span class="plus">+${mb.length - 4}</span>` : ""}${!mb.length ? `<span class="ini">?</span>` : ""}</div>
      <div class="gc-txt"><b>${esc(c.nom)}</b><small>${t(SITE.pluriel(mb.length) ? "{n} joueurs" : "{n} joueur", { n: mb.length })} · ${t(SITE.pluriel(faits) ? "{n} profils publiés" : "{n} profil publié", { n: faits })}${dedans ? " · " + t("ton groupe") : ""}</small></div>
      <div class="gc-hex">${SITE.hex(moy, null, { color: "#6B4A70", question: !moy, aria: t("Hexagone du groupe {g}", { g: c.nom }) })}</div></a>`;
  };

  /* ---------- teinte (couleur dominante) ---------- */
  const TINT = { W: ["#B08A35", "#3A3220"], U: ["#3B5BA8", "#141B33"], B: ["#6A3F6E", "#1A1418"], R: ["#B3361F", "#3A1210"], G: ["#2F8A50", "#0F2A1A"], C: ["#7A7A86", "#24242A"], none: ["#6B4A70", "#1F1424"] };
  SITE.TINT = TINT;
  SITE.dominante = P => !P ? "none" : QC.COULEURS.slice().sort((a, b) => P.couleurs.final[b] - P.couleurs.final[a])[0];
  SITE.teinter = P => { const [a, d] = TINT[SITE.dominante(P)]; document.documentElement.style.setProperty("--accent", a); document.documentElement.style.setProperty("--accent-deep", d); };

  /* ---------- images : catalogue local d'abord, puis Scryfall (avec cache) ---------- */
  const IMG_KEY = "qc-images";
  let imgCache = {}; try { imgCache = JSON.parse(localStorage.getItem(IMG_KEY) || "{}"); } catch (e) { }
  let file = Promise.resolve();
  /* Appel Scryfall avec nouvel essai si Scryfall demande de ralentir : jusqu'à 3 essais, pauses croissantes.
     Attention : la réponse 429 de Scryfall n'a pas d'en-tête CORS, le navigateur la présente donc comme une
     ERREUR RÉSEAU (fetch échoue) et non comme un statut 429 : les deux cas déclenchent un nouvel essai. */
  async function scryNamed(name) {
    for (let essai = 0; essai < 3; essai++) {
      try {
        const r = await fetch("https://api.scryfall.com/cards/named?exact=" + encodeURIComponent(name));
        if (r.status === 404) return {};
        if (r.ok) return r.json();
      } catch (e) { /* limite de débit ou coupure réseau : on réessaie */ }
      await new Promise(ok => setTimeout(ok, 1000 * (essai + 1)));
    }
    return {};
  }  SITE.image = function (name) {
    const c = SITE.carte(name);
    if (c && c.art) return Promise.resolve({ art: c.art, img: c.img, artist: null });
    if (imgCache[name]) return Promise.resolve(imgCache[name]);
    return file = file.then(() => new Promise(r => setTimeout(r, 110))).then(() =>
      scryNamed(name).then(c => {
        const f = c.image_uris ? c : (c.card_faces || [])[0] || {};
        const v = { art: (f.image_uris || {}).art_crop, img: (f.image_uris || {}).normal, artist: c.artist };
        if (v.art) { imgCache[name] = v; try { localStorage.setItem(IMG_KEY, JSON.stringify(imgCache)); } catch (e) { } }
        return v;
      }).catch(() => ({})));
  };
  SITE.artiste = function (name) { // l'illustrateur n'est pas dans le catalogue : on le demande à Scryfall
    if (imgCache[name] && imgCache[name].artist) return Promise.resolve(imgCache[name].artist);
    return file = file.then(() => new Promise(r => setTimeout(r, 110))).then(() =>
      scryNamed(name).then(c => {
        const f = c.image_uris ? c : (c.card_faces || [])[0] || {};
        imgCache[name] = { art: (f.image_uris || {}).art_crop, img: (f.image_uris || {}).normal, artist: c.artist };
        try { localStorage.setItem(IMG_KEY, JSON.stringify(imgCache)); } catch (e) { }
        return c.artist;
      }).catch(() => null));
  };
  SITE.images = function (root) {
    root = root || document;
    root.querySelectorAll("[data-ini]").forEach(el => { el.classList.add("ini"); if (!el.children.length) el.textContent = el.dataset.ini; });
    root.querySelectorAll("[data-art],[data-card]").forEach(el => {
      const n = el.dataset.art || el.dataset.card;
      SITE.image(n).then(v => {
        const url = el.dataset.art ? v.art : v.img; if (!url) return;
        if (el.tagName === "IMG") el.src = url; else el.style.backgroundImage = `url("${url}")`;
        if (el.dataset.credit) SITE.artiste(n).then(a => { const cr = document.getElementById(el.dataset.credit); if (cr && a) cr.textContent = t("Illustration : {a}", { a }); });
      });
    });
  };

  /* ---------- dessins ---------- */
  SITE.dechirures = () => document.querySelectorAll("svg.tear").forEach((s, i) => {
    let seed = 7 + i * 13, d = "M0,46 L0,30 ", x = 0;
    const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    while (x < 1000) { x += 6 + r() * 14; d += `L${x.toFixed(1)},${(14 + r() * 26).toFixed(1)} `; }
    s.setAttribute("viewBox", "0 0 1000 46"); s.setAttribute("preserveAspectRatio", "none");
    s.innerHTML = `<path d="${d}L1000,46 Z" fill="${s.dataset.fill || "#F3EEEA"}"/>`;
  });
  const ang = i => (-90 + i * 60) * Math.PI / 180;
  SITE.hexPoly = vals => QC.COULEURS.map((c, i) => [120 + 82 * (vals[c] || 0) * Math.cos(ang(i)), 120 + 82 * (vals[c] || 0) * Math.sin(ang(i))].map(n => n.toFixed(1)).join(",")).join(" ");
  SITE.hex = function (dit, revele, opt) {
    opt = opt || {};
    const col = opt.color || "var(--accent)", grid = opt.grid || "#D8CFD6", ink = opt.ink || "#2A2230";
    let s = "";
    [1, .66, .33].forEach(k => s += `<polygon points="${SITE.hexPoly(Object.fromEntries(QC.COULEURS.map(c => [c, k])))}" fill="none" stroke="${grid}"/>`);
    QC.COULEURS.forEach((c, i) => s += `<line x1="120" y1="120" x2="${(120 + 82 * Math.cos(ang(i))).toFixed(1)}" y2="${(120 + 82 * Math.sin(ang(i))).toFixed(1)}" stroke="${grid}" stroke-opacity=".6"/>`);
    const vide = v => !v || QC.COULEURS.every(c => !v[c]);
    if (!vide(dit)) s += `<polygon points="${SITE.hexPoly(dit)}" fill="${col}" fill-opacity=".3" stroke="${col}" stroke-width="2"/>`;
    if (!vide(revele)) s += `<polygon points="${SITE.hexPoly(revele)}" fill="none" stroke="${ink}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    if (opt.question) s += `<text x="120" y="134" text-anchor="middle" font-family="Cinzel,serif" font-size="40" fill="${grid}">?</text>`;
    if (opt.labels) QC.COULEURS.forEach((c, i) => { const x = 120 + 98 * Math.cos(ang(i)), y = 120 + 98 * Math.sin(ang(i)); s += `<image href="https://svgs.scryfall.io/card-symbols/${c}.svg" x="${x - 12}" y="${y - 12}" width="24" height="24"><title>${QC.NOMS_COULEURS[c]}</title></image>`; });
    if (opt.extra) s += opt.extra;
    return `<svg viewBox="0 0 240 240" role="img" aria-label="${esc(opt.aria || t("Hexagone des couleurs"))}">${s}</svg>`;
  };
  SITE.pips = (ci, size) => (ord(ci) || "C").split("").map(c => `<img src="https://svgs.scryfall.io/card-symbols/${c}.svg" alt="${QC.NOMS_COULEURS[c]}" style="width:${size || 16}px;height:${size || 16}px;vertical-align:-3px;margin-right:2px">`).join("");

  /* ---------- navigation ---------- */
  SITE.nav = function (courant) {
    const moi = SITE.moi();
    const L = [["index.html", "Accueil"], ["groupe.html", "Les groupes"], ["joueurs.html", "Les joueurs"], [moi ? "profil.html?j=" + moi.id : "qui.html", "Mon profil"], ["quiz.html", "Le quiz"], ["devine.html", "Devine ton ami"]];
    const who = moi ? `<a class="me" href="profil.html?j=${moi.id}" translate="no"><span ${SITE.avAttrs(moi)}></span>${esc(moi.pseudo)}</a>` : `<a class="me" href="qui.html">${t("Entrer")}</a>`;
    const autre = I.EN ? "fr" : "en", langue = `<button class="lang" id="lang" lang="${autre}" title="${I.EN ? "Passer en français" : "Switch to English"}" aria-label="${I.EN ? "Passer en français" : "Switch to English"}">${autre.toUpperCase()}</button>`;
    const el = document.getElementById("nav");
    if (!el) return;
    el.outerHTML = `<nav class="nav" id="mainnav"><a class="logo" href="index.html">Le grand quiz<small>COMMANDER</small></a><ul id="navlist">${L.map(([h, l]) => `<li><a href="${h}"${l === courant ? ' aria-current="page"' : ""}>${t(l)}</a></li>`).join("")}</ul>${langue}${who}
      <button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="navlist"><i></i><i></i><i></i></button></nav>`;
    const n = document.getElementById("mainnav");
    n.querySelector("#lang").onclick = () => I.choisir(autre);
    n.querySelector(".burger").onclick = function () { const o = n.classList.toggle("open"); this.setAttribute("aria-expanded", o); };
    SITE.images(n);
  };
  SITE.bandeauLocal = function () {
    if (ST.mode !== "local") return;
    document.body.insertAdjacentHTML("beforeend", `<div class="note" role="note"><b>Mode local</b> · les profils restent dans ce navigateur (voir LISEZ-MOI pour les partager) · <button id="resetLocal">tout effacer</button></div>`);
    document.getElementById("resetLocal").onclick = () => { if (confirm(t("Effacer tous les profils et réponses enregistrés dans ce navigateur ?"))) { ST.reinitialiserLocal(); localStorage.removeItem("qc-brouillon"); location.reload(); } };
  };

  /* Démarrage commun : données, groupe, navigation. Redirige vers « qui.html » si aucun groupe n'est choisi (mode Supabase). */
  SITE.demarrer = async function (courant, opts) {
    opts = opts || {};
    if (!ST.code() && !opts.sansGroupe) { location.href = "qui.html"; return false; }
    try {
      await Promise.all([SITE.charger(), ST.code() ? SITE.groupe() : null]); // en parallèle : catalogue et groupe
    } catch (e) {
      document.body.insertAdjacentHTML("afterbegin", `<div class="alerte">${esc(e.message)}</div>`);
      if (e.code === "CODE_GROUPE") { ST.oublierGroupe(); location.href = "qui.html"; }
      return false;
    }
    SITE.nav(courant);
    SITE.dechirures();
    SITE.bandeauLocal();
    return true;
  };

  I.traduirePage(); // textes fixes de la page, puis tout ce que les scripts ajouteront
})();
