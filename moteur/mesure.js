/* =====================================================================
   Le grand quiz Commander — moteur v4 : des réponses au profil (docs/moteur.md §3).

   QC.preparer(commandants)  → index des données (à appeler une fois après le chargement du catalogue)
   QC.mesurer(reponses, mode) → profil complet

   Format des réponses (clé = id de la question) :
     choix, dilemme : "id"   ·   multi, plans, paires : ["id", …]   ·   echelle : 1 à 5   ·   grille : {style: 0..3}
     couleurs : {W: 0..3, …, star: "U"}   ·   tribus : ["Elf", …]   ·   cartes : {"Nom": 1 | 0.5 | 0}
     aversions : {item: 0..3}   ·   collection : {commandants: [noms], decks: [{styles: {style: part}, ci: "BG"}]}
     texte (cartes) : [{n, ci, s?}]   ·   "?" = je ne sais pas (la question sort du calcul)
   ===================================================================== */
(function (QC) {
  "use strict";
  const R = () => QC.R;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ordC = ci => "WUBRG".split("").filter(c => (ci || "").includes(c)).join("");

  /* ---------- Données ---------- */
  QC.preparer = function (cards) {
    const D = { cards, byName: {}, typeColor: {} };
    const cnt = {};
    cards.forEach(c => {
      D.byName[c.n] = c;
      (c.k || []).forEach(k => {
        const t = cnt[k] = cnt[k] || { n: 0, W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
        t.n++;
        const o = ordC(c.ci);
        if (o) o.split("").forEach(x => t[x]++); else t.C++;
      });
    });
    // Quantiles de complexité : le réglage 1 à 5 du joueur vise les 10 %, 30 %, 50 %, 70 %, 90 % du catalogue
    const xs = cards.map(c => c.x || 2).sort((a, b) => a - b);
    D.complexiteCible = [.1, .3, .5, .7, .9].map(q => xs[Math.floor(q * (xs.length - 1))]);
    for (const k in cnt) { // part des commandants de ce type qui contiennent chaque couleur (≥ 3 commandants)
      if (cnt[k].n < 3) continue;
      D.typeColor[k] = Object.fromEntries(QC.COULEURS.map(c => [c, cnt[k][c] / cnt[k].n]));
    }
    QC.D = D;
    return D;
  };

  /* Accumulateur : pour chaque dimension, somme des poids et des positions pondérées */
  function Acc() { this.w = {}; this.wp = {}; this.n = {}; this.src = {}; }
  Acc.prototype.add = function (d, p, w, src) {
    if (!(w > 0) || isNaN(p)) return;
    this.w[d] = (this.w[d] || 0) + w;
    this.wp[d] = (this.wp[d] || 0) + w * clamp(p, 0, 1);
    this.n[d] = (this.n[d] || 0) + 1;
    if (src) (this.src[d] = this.src[d] || []).push([src, Math.round(w * 100) / 100, Math.round(p * 100) / 100]);
  };
  Acc.prototype.score = function (d, k) { // position moyenne, tirée vers 0,5 par la force du neutre k
    k = k === undefined ? R().neutre : k;
    return ((this.wp[d] || 0) + k * .5) / ((this.w[d] || 0) + k);
  };
  Acc.prototype.fiab = function (d, k) {
    k = k === undefined ? R().neutre : k;
    return (this.w[d] || 0) / ((this.w[d] || 0) + k);
  };

  /* Effets d'une question : pour chaque dimension, valeurs min et max parmi ses options */
  function etendue(q) {
    const dims = {};
    (q.options || []).forEach(o => { for (const d in o.e) dims[d] = 1; });
    const out = {};
    for (const d in dims) {
      const vals = q.options.map(o => o.e[d] || 0);
      out[d] = [Math.min(...vals), Math.max(...vals)];
    }
    return out;
  }

  QC.mesurer = function (A, mode) {
    mode = mode === "confirme" ? "confirme" : "commun";
    const D = QC.D || { byName: {}, typeColor: {} };
    const acc = new Acc();               // styles (a.*), couleurs révélées (c.*), psychologie (p.*)
    const choisi = new Acc();            // couleurs « choisies » (coup d'œil, cartes, decks)
    const P = {
      mode, set: {}, theme: { fant: {}, kinds: {}, plans: [] }, aversions: {}, jamais: [], possedes: [], aimes: [], rejetes: [],
      reve: [], deteste: [], repondues: 0, visibles: 0, idk: 0, decksStyles: {}
    };
    const qs = QC.questionsDuMode(mode);
    let grillesVues = false;

    qs.forEach(q => {
      P.visibles++;
      const a = A[q.id];
      if (a === undefined || a === null || (Array.isArray(a) && !a.length) || (typeof a === "object" && !Array.isArray(a) && !Object.keys(a).length)) return;
      P.repondues++;
      if (a === "?") { P.idk++; return; }
      const f = q.fiab === undefined ? 1 : q.fiab;
      const src = q.id;

      if (q.type === "choix" || q.type === "dilemme") {
        const o = q.options.find(x => x.id === a); if (!o) return;
        const et = etendue(q);
        for (const d in et) { const [mn, mx] = et[d]; if (mx > mn) acc.add(d, ((o.e[d] || 0) - mn) / (mx - mn), f * (mx - mn), src); }
        if (o.set) Object.assign(P.set, o.set);
        if (q.id === "bracket") P.set.bracketExplicite = true;
      }
      else if (q.type === "multi" || q.type === "plans") {
        const chosen = new Set(a);
        q.options.forEach(o => {
          const on = chosen.has(o.id);
          for (const d in o.e) {
            const e = o.e[d]; if (!e) continue;
            const p = e > 0 ? (on ? 1 : 0) : (on ? 0 : 1);
            acc.add(d, p, f * Math.abs(e) * (on ? 1 : R().multiNonCoche), src);
          }
          if (on && o.fant) P.theme.fant[o.fant] = (P.theme.fant[o.fant] || 0) + 1;
          if (on && o.kind) P.theme.kinds[o.kind] = Math.max(P.theme.kinds[o.kind] || 0, .6);
          if (on && q.type === "plans") P.theme.plans.push(o.id);
        });
      }
      else if (q.type === "echelle") {
        const v = clamp(+a, 1, 5);
        for (const d in q.e) { const e = q.e[d]; acc.add(d, e > 0 ? (v - 1) / 4 : (5 - v) / 4, f * Math.abs(e), src); }
        if (q.set) P.set[q.set] = v;
      }
      else if (q.type === "grille") {
        grillesVues = true;
        const lv = R().grilleNiveaux;
        const items = q.items.filter(k => a[k] !== undefined && a[k] !== "?");
        const ps = items.map(k => lv[a[k]]);
        const m = ps.length ? ps.reduce((s, x) => s + x, 0) / ps.length : .5;
        items.forEach((k, i) => {
          const p = clamp(ps[i] - R().grilleCentrage * (m - .5), 0, 1);
          acc.add("a." + k, p, R().grilleStyle, src);
          if (+a[k] === 0) P.set["jamais_" + k] = true; // « Jamais » sur un style : aversion explicite
        });
      }
      else if (q.type === "tribus") {
        const types = a.slice(0, q.max || 6);
        types.forEach((t, i) => {
          P.theme.kinds[t] = 1;
          if (i < 3) acc.add("a.kindred", 1, R().tribuStyle, src);
          const tc = D.typeColor[t];
          if (tc) QC.COULEURS.forEach(c => acc.add("c." + c, tc[c], R().tribuCouleur / types.length * 1.5, src + ":" + t));
        });
      }
      else if (q.type === "cartes") {
        for (const n in a) {
          const r = +a[n]; const c = D.byName[n]; if (!c) continue;
          if (r >= 1) P.aimes.push(n); if (r <= 0) P.rejetes.push(n);
          for (const k in (c.s || {})) {
            const s = c.s[k]; if (s < R().coupDoeilSeuil) continue;
            acc.add("a." + k, r, R().coupDoeilPoids * s, "oeil:" + n);
          }
          const cols = ordC(c.ci) || "C";
          QC.COULEURS.forEach(x => { if (cols.includes(x)) choisi.add(x, r, 1, "oeil:" + n); });
          if (r >= 1) {
            (c.f || []).forEach(fa => P.theme.fant[fa] = (P.theme.fant[fa] || 0) + .5);
            (c.k || []).forEach(k => P.theme.kinds[k] = Math.max(P.theme.kinds[k] || 0, .35));
          }
          if (r >= 1) acc.add("p.timmy", (c.s && Math.max(c.s.big || 0, c.s.voltron || 0)) || 0, .3, "oeil:" + n);
        }
      }
      else if (q.type === "aversions") {
        for (const k in a) if (a[k] !== "?") P.aversions[k] = +a[k];
      }
      else if (q.type === "couleurs" || q.type === "paires") {
        // traité plus bas (couche « dit »)
      }
      else if (q.type === "collection") {
        (a.commandants || []).forEach(n => P.possedes.push(n));
        (a.decks || []).forEach(dk => {
          for (const k in (dk.styles || {})) { acc.add("a." + k, clamp(.5 + dk.styles[k] * 2, 0, 1), R().deckStyle * Math.min(1, dk.styles[k] * 4), "deck"); P.decksStyles[k] = Math.max(P.decksStyles[k] || 0, dk.styles[k]); }
          const cols = ordC(dk.ci) || "C";
          QC.COULEURS.forEach(x => choisi.add(x, cols.includes(x) ? 1 : 0, R().deckCouleur * (cols.includes(x) ? 1 : .3), "deck"));
          (dk.cmdrs || []).forEach(n => P.possedes.push(n));
        });
      }
      else if (q.type === "texte") {
        const list = Array.isArray(a) ? a : [];
        if (q.id === "favcards") list.forEach(c => {
          const cols = ordC(c.ci) || "C";
          QC.COULEURS.forEach(x => { if (cols.includes(x) || cols === "C") choisi.add(x, cols.includes(x) ? 1 : .5, R().carteFavCouleur, "fav:" + c.n); });
          for (const k in (c.s || {})) if (c.s[k] >= .4) acc.add("a." + k, 1, .5 * c.s[k], "fav:" + c.n);
        });
        if (q.id === "deteste") list.forEach(c => P.deteste.push(c.n));
        if (q.id === "reve") list.forEach(c => P.reve.push(c.n || c));
      }
    });

    /* ---------- Styles ---------- */
    P.styles = {}; P.stylesFiab = {};
    QC.STYLES.forEach(k => { P.styles[k] = 2 * acc.score("a." + k) - 1; P.stylesFiab[k] = acc.fiab("a." + k); });
    P.stylesRejetes = QC.STYLES.filter(k => P.styles[k] <= R().aversionStyle || P.set["jamais_" + k]);

    /* ---------- Psychologie ---------- */
    P.psy = {}; P.psyFiab = {};
    QC.PSY.forEach(k => { P.psy[k] = acc.score("p." + k); P.psyFiab[k] = acc.fiab("p." + k); });
    const mot = ["timmy", "johnny", "spike"], ms = mot.map(k => Math.max(.01, P.psy[k] - .25));
    const sm = ms.reduce((s, x) => s + x, 0);
    P.motivation = Object.fromEntries(mot.map((k, i) => [k, ms[i] / sm]));

    /* ---------- Couleurs : trois couches (§3.5) ---------- */
    const C = { dit: {}, revele: {}, choisi: {}, final: {}, fiab: {} };
    // Dit
    const g = A.couleurs && typeof A.couleurs === "object" ? A.couleurs : null;
    const pairs = Array.isArray(A.paires) && mode === "confirme" ? A.paires : [];
    let ditFiab = 0;
    if (g) {
      QC.COULEURS.forEach(c => {
        let v = g[c] === undefined || g[c] === "?" ? .4 : R().ditNiveaux[g[c]];
        if (g.star === c) v = R().ditNiveaux.star;
        const pv = pairs.length ? pairs.filter(p => p.includes(c)).length / pairs.length : null;
        C.dit[c] = pv === null ? v : R().ditGrille * v + R().ditPaires * Math.min(1, pv * 1.5);
        if (+g[c] === 0) P.jamais.push(c);
        if (+g[c] === 1 && g.star !== c) (P.bof = P.bof || []).push(c);
      });
      ditFiab = QC.COULEURS.filter(c => g[c] !== undefined && g[c] !== "?").length / 6;
    }
    // Révélé : questions indirectes + styles aimés (normalisé par couleur)
    const wc = {}, raw = {};
    QC.COULEURS.forEach(c => { wc[c] = 0; raw[c] = 0; });
    QC.STYLES.forEach(k => {
      const u = (P.styles[k] + 1) / 2, col = QC.STYLE_COULEUR[k] || {};
      for (const c in col) { wc[c] += col[c]; raw[c] += col[c] * u; }
    });
    let revFiab = 0;
    QC.COULEURS.forEach(c => {
      const viaStyles = wc[c] ? raw[c] / wc[c] : .5;
      const viaQ = acc.score("c." + c), fq = acc.fiab("c." + c);
      C.revele[c] = (1 - R().reveleStyles) * viaQ + R().reveleStyles * (.5 + (viaStyles - .5) * 1.6);
      C.revele[c] = clamp(C.revele[c], 0, 1);
      revFiab += fq / 6;
    });
    revFiab = clamp(revFiab + .2, 0, 1);
    // Choisi
    let choFiab = 0;
    QC.COULEURS.forEach(c => { C.choisi[c] = choisi.score(c, 1); choFiab += choisi.fiab(c, 1) / 6; });
    // Final : pondération des couches par leur poids et leur fiabilité
    const L = R().couches;
    const lw = { dit: L.dit * ditFiab, revele: L.revele * revFiab, choisi: L.choisi * choFiab };
    const sw = lw.dit + lw.revele + lw.choisi || 1;
    QC.COULEURS.forEach(c => {
      C.final[c] = (lw.dit * (C.dit[c] === undefined ? .5 : C.dit[c]) + lw.revele * C.revele[c] + lw.choisi * C.choisi[c]) / sw;
    });
    C.fiab = { dit: ditFiab, revele: revFiab, choisi: choFiab, total: clamp((lw.dit + lw.revele + lw.choisi) / (L.dit + L.revele + L.choisi), 0, 1) };
    // « Ce que tu dis » et « ce que tes réponses révèlent » (deuxième couche de l'hexagone = révélé + choisi)
    C.afficheRevele = {};
    const w2 = lw.revele + lw.choisi || 1;
    QC.COULEURS.forEach(c => { C.afficheRevele[c] = (lw.revele * C.revele[c] + lw.choisi * C.choisi[c]) / w2; });
    P.couleurs = C;
    P.ordreCouleurs = QC.COULEURS.slice().sort((a, b) => C.final[b] - C.final[a]);

    /* ---------- Thème, réglages, fiabilités globales ---------- */
    if (P.set.bracket === undefined) P.set.bracket = mode === "confirme" ? 3 : 2.5;
    if (P.set.complexite === undefined && mode === "commun") P.set.complexite = 2;
    const topStyles = QC.STYLES.slice().sort((a, b) => P.styles[b] - P.styles[a]);
    P.topStyles = topStyles;
    P.fiab = {
      style: topStyles.slice(0, 4).reduce((s, k) => s + P.stylesFiab[k], 0) / 4,
      couleur: C.fiab.total,
      theme: clamp((Object.keys(P.theme.fant).length + Object.keys(P.theme.kinds).length) / 3, .25, 1),
      psy: (P.psyFiab.timmy + P.psyFiab.johnny + P.psyFiab.spike) / 3
    };
    P.contradictions = contradictions(P);
    P.sources = acc.src;
    return P;
  };

  /* Écart notable entre ce que le joueur dit et ce que ses réponses révèlent */
  function contradictions(P) {
    const out = [], C = P.couleurs;
    if (!Object.keys(C.dit).length) return out;
    QC.COULEURS.forEach(c => {
      const d = C.dit[c] - C.afficheRevele[c];
      if (d > .35) out.push({ type: "couleur-dite", c, ecart: d });
      if (d < -.35) out.push({ type: "couleur-revelee", c, ecart: -d });
    });
    return out;
  }
})(typeof module !== "undefined" ? (globalThis.QC = globalThis.QC || {}) : (window.QC = window.QC || {}));
