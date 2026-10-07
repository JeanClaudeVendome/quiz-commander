"use strict";
/* =====================================================================
   Le grand quiz Commander — v3 (site statique, GitHub Pages)
   Données de cartes : Scryfall. Contenu de fan non officiel.
   ===================================================================== */

/* ===================== DONNÉES CHARGÉES ===================== */
let CMDRS = [], CBYN = {}, RULES = null, META = {};
const TYPEDATA = { types: [], tc: {} };
const KEY = "grand-quiz-commander-v3";
let S = { v: VERSION, mode: null, vet: false, seed: Math.floor(Math.random() * 1e9), answers: {}, screen: "intro", name: "" };
let VIEW = null; // profil partagé ouvert en lecture seule

async function getJSON(url) { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw new Error(url + " : " + r.status); return r.json(); }
async function loadData() {
  const [c, r, t] = await Promise.all([getJSON("data/commanders.json"), getJSON("data/rules.json"), getJSON("data/types.json").catch(() => [])]);
  META = c.meta || {}; CMDRS = c.cards || []; CMDRS.forEach(x => { CBYN[x.n] = x; x.k = x.k || []; x.f = x.f || []; x.t = x.t || []; x.fl = x.fl || ""; });
  RULES = compileRules(r);
  TYPEDATA.types = (t && t.length) ? t : [...new Set(CMDRS.flatMap(x => x.k))].sort();
  const idx = {};
  CMDRS.forEach(c => c.k.forEach(k => { (idx[k] = idx[k] || []).push(c); }));
  for (const k in idx) {
    idx[k].sort((a, b) => ((b.t[0] === "kindred") - (a.t[0] === "kindred")) || ((a.auto ? 1 : 0) - (b.auto ? 1 : 0)) || ((a.r || 1e9) - (b.r || 1e9)));
    TYPEDATA.tc[k] = idx[k].slice(0, 7).map(c => [c.n, c.ci]);
  }
}
function compileRules(r) {
  const tags = {}; for (const k in r.tags) tags[k] = r.tags[k].map(([p, w]) => [new RegExp(p), w]);
  return { tags, kindred: r.kindred_words || [] };
}
function tagText(text, name) {
  let t = String(text || "").toLowerCase().split(String(name || "").toLowerCase()).join("~");
  t = t.replace(/\([^)]*\)/g, "").split("that target ~").join("");
  const out = {}; for (const k in RULES.tags) { let s = 0; RULES.tags[k].forEach(([rx, w]) => { if (rx.test(t)) s += w; }); if (s) out[k] = s; }
  return out;
}

/* ===================== ÉTAT ===================== */
function load() { try { const r = localStorage.getItem(KEY); if (r) { const o = JSON.parse(r); if (o && o.v === VERSION && o.answers) S = Object.assign(S, o); } } catch (e) { } }
function save() { if (VIEW) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
const QMAP = {}, QSEC = {}; SECTIONS.forEach(s => s.qs.forEach(q => { QMAP[q.id] = q; QSEC[q.id] = s; }));
const ANS = () => VIEW ? VIEW.a : S.answers;

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function strip(s) { return String(s).replace(/<br>/g, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); }
function ord(s) { return "WUBRG".split("").filter(c => (s || "").includes(c)).join(""); }
function pip(c) { return `<span class="pip ${c}" aria-label="${CNAME[c]}">${c}</span>`; }
function pips(ci) { const o = ord(ci || ""); return o ? o.split("").map(pip).join("") : pip("C"); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "'").trim(); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function imgUrl(c, ver) { const own = ver === "art_crop" ? c.art : c.img; return own || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(c.n)}&format=image&version=${ver}`; }
function edhrecUrl(n) { return "https://edhrec.com/commanders/" + norm(n.split(" // ")[0]).replace(/[^a-z0-9 -]/g, "").trim().replace(/\s+/g, "-"); }

function curMode() { return VIEW ? (VIEW.m || "c") : (S.mode || "c"); }
function qVisible(q) { const m = q.mode || QSEC[q.id].mode || "b"; return m === "b" || m === curMode(); }
function visSections() { return SECTIONS.map((s, i) => ({ s, i })).filter(({ s }) => s.qs.some(qVisible)); }
function visQs(s) { return s.qs.filter(qVisible); }

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffled(q) { if (q.ordered) return q.opts.slice(); const r = rng(hash(S.seed + ":" + q.id)); const a = q.opts.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function optById(q, id) { return (q.opts || []).find(o => o.id === id); }

function isAnswered(q) {
  const A = ANS();
  if (q.type === "swipe") return (A.swipeOrder || []).length > 0;
  if (q.type === "collection") return (A.ownedC || []).length > 0 || (A.decks || []).length > 0 || A.collNone === true;
  const a = A[q.id]; if (a === undefined || a === null) return false;
  if (Array.isArray(a)) return a.length > 0;
  if (typeof a === "object") { if (q.type === "tribes") return (a.sel || []).length > 0; return Object.keys(a).length > 0; }
  if (typeof a === "string") return a.trim().length > 0;
  return true;
}

/* ===================== CALCUL DU PROFIL ===================== */
const WANTMAP = { 3: 1, 2: .45, 1: 0, 0: -1.5 };
const COLORPTS = { 3: 4, 2: 1.5, 1: 0, 0: -8 };
const WC = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }; Object.values(ARCH).forEach(a => { for (const c in a.col) WC[c] += a.col[c]; });
let MAXCACHE = {};
function computeMax() {
  const m = curMode(); if (MAXCACHE[m]) return MAXCACHE[m];
  const A = {}, P = {}; const add = (t, k, v) => { t[k] = (t[k] || 0) + v; };
  const perOpts = (opts, take) => {
    const per = {}; opts.forEach(o => { for (const k in (o.fx || {})) { const v = o.fx[k]; if (v > 0) (per[k] = per[k] || []).push(v); } });
    for (const k in per) { const sum = per[k].sort((x, y) => y - x).slice(0, take).reduce((s, x) => s + x, 0); const [ns, key] = k.split("."); if (ns === "a") add(A, key, sum); if (ns === "p") add(P, key, sum); }
  };
  SECTIONS.forEach(s => s.qs.forEach(q => {
    if (!qVisible(q)) return;
    if (q.type === "single") perOpts(q.opts, 1); else if (q.type === "multi") perOpts(q.opts, q.max);
    else if (q.type === "pair") perOpts([q.a, q.b], 1);
    else if (q.type === "scale") { for (const k in (q.fx || {})) { const [ns, key] = k.split("."); const v = Math.abs(q.fx[k]) * 2; if (ns === "a") add(A, key, v); if (ns === "p") add(P, key, v); } }
    else if (q.type === "tribes") add(A, "kindred", .5 * q.max);
  }));
  return MAXCACHE[m] = { A, P };
}
function ownedSet() { const A = ANS(); const s = new Set(A.ownedC || []); (A.decks || []).forEach(d => (d.cmdrs || []).forEach(n => s.add(n))); return s; }

function compute() {
  const A = ANS();
  const R = { A: {}, G: {}, B: {}, Bsw: {}, Bdk: {}, Catt: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, Cplay: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, C: {}, P: { timmy: 0, johnny: 0, spike: 0, vorthos: 0, mel: 0 }, S: {}, SET: {},
    excluded: new Set(), kinds: new Set(), fant: [], fantW: {}, kindW: {}, face: {}, worst: new Set(), accept: new Set(), own: new Set(), likes: new Set(), nopes: new Set(), pod: new Set(),
    idk: 0, answered: 0, visible: 0, gridAnswered: false, swipeN: 0, deckN: 0 };
  Object.keys(ARCH).forEach(k => { R.G[k] = 0; R.B[k] = 0; R.Bsw[k] = 0; R.Bdk[k] = 0; });
  const apply = (fx, m) => { if (!fx) return; for (const k in fx) { const [ns, key] = k.split("."); const v = fx[k] * m; if (ns === "a") R.B[key] = (R.B[key] || 0) + v; else if (ns === "c") R.Catt[key] += v; else if (ns === "p") R.P[key] += v; else if (ns === "s") R.S[key] = (R.S[key] || 0) + v; } };
  const takeOpt = (q, o) => {
    if (!o) return; apply(o.fx, 1); if (o.set) Object.assign(R.SET, o.set); if (o.fant) R.fant.push(o.fant); if (o.kind) R.kinds.add(o.kind);
    if (o.face) o.face.forEach(k => { if (q.id === "worst") R.worst.add(k); else R.face[k] = 0; });
    if (o.own) R.own.add(o.own); if (q.id === "accept") R.accept.add(o.id); if (q.id === "pod") R.pod.add(o.id);
  };
  const gridVals = [];
  SECTIONS.forEach(s => s.qs.forEach(q => {
    if (!qVisible(q)) return; R.visible++;
    if (!isAnswered(q)) return; R.answered++;
    if (q.type === "swipe" || q.type === "collection") return;
    const a = A[q.id];
    if (a === "?" || (Array.isArray(a) && a[0] === "?")) { R.idk++; return; }
    if (Array.isArray(a) && a[0] === "none") return;
    if (q.type === "single") takeOpt(q, optById(q, a));
    else if (q.type === "multi") a.forEach(id => takeOpt(q, optById(q, id)));
    else if (q.type === "pair") { const o = q[a]; if (o) apply(o.fx, 1); }
    else if (q.type === "scale") { apply(q.fx, a - 3); if (q.set) R.SET[q.set] = a; }
    else if (q.type === "tribes") (a.sel || []).forEach(t => { R.kinds.add(t); R.B.kindred += .5; });
    else if (q.type === "grid") {
      let qn = 0, n = 0;
      for (const k in a) {
        n++; const v = a[k]; if (v === "?") { qn++; continue; }
        if (q.scale === "want") { R.G[k] = WANTMAP[v]; R.gridAnswered = true; if (v >= 1) gridVals.push(WANTMAP[v]); }
        else if (q.scale === "face") R.face[k] = v;
        else if (q.scale === "color") { R.Catt[k] += COLORPTS[v]; if (v === 0) R.excluded.add(k); }
      }
      if (n && qn / n > .5) R.idk += qn / n;
    }
  }));
  if (S.vet && !VIEW && R.SET.obscure === undefined) R.SET.obscure = 4;
  if (VIEW && VIEW.vet && R.SET.obscure === undefined) R.SET.obscure = 4;
  // Coup d'œil : préférences révélées sur de vraies cartes
  const sw = A.swipe || {};
  for (const n in sw) {
    const c = CBYN[n]; if (!c) continue; const r = sw[n]; R.swipeN++;
    if (r > 0) R.likes.add(n); if (r < 0) R.nopes.add(n);
    c.t.forEach((t, i) => { R.Bsw[t] = (R.Bsw[t] || 0) + r * ([1, .6, .4][i] || .3); });
    const cols = ord(c.ci); if (cols) cols.split("").forEach(x => { R.Catt[x] += r * .6; }); else R.Catt.C += r * .6;
    if (r > 0) { c.f.forEach(f => R.fantW[f] = (R.fantW[f] || 0) + 1); c.k.forEach(k => R.kindW[k] = (R.kindW[k] || 0) + 1); }
  }
  for (const k in R.kindW) if (R.kindW[k] >= 2) R.kinds.add(k);
  // Decks importés : ce que tu joues vraiment
  (A.decks || []).forEach(d => {
    R.deckN++;
    for (const t in (d.tags || {})) R.Bdk[t] = Math.max(R.Bdk[t] || 0, d.tags[t]);
    ord(d.ci || "").split("").filter(Boolean).forEach(x => { R.Cplay[x] += 1.5; });
    for (const k in (d.types || {})) if (d.types[k] >= 8) R.kinds.add(k);
  });
  // Archétypes : grilles (centrées), questions (normalisées), cartes, decks
  const mean = gridVals.length ? gridVals.reduce((s, x) => s + x, 0) / gridVals.length : 0;
  const mx = computeMax().A; const gridW = R.gridAnswered ? 5 : 0; R.Aref = R.gridAnswered ? 6 : 3;
  Object.keys(ARCH).forEach(k => {
    const g = R.G[k] >= 0 ? R.G[k] - .4 * mean : R.G[k];
    const bn = clamp((R.B[k] || 0) / Math.max(mx[k] || 0, 5), -1, 1);
    const bs = clamp((R.Bsw[k] || 0) / 3, -1, 1);
    const bd = clamp((R.Bdk[k] || 0) / .25, 0, 1);
    R.A[k] = gridW * g + 3 * bn + 2.5 * bs + 2.5 * bd;
  });
  // Couleurs : attirance + ce que ton jeu demande (normalisé par couleur)
  const extra = Object.assign({}, R.Cplay);
  let pmax = 0;
  for (const c in R.Cplay) { let raw = 0; for (const k in ARCH) { const w = ARCH[k].col[c] || 0; if (w) raw += Math.max(0, R.A[k]) * w; } R.Cplay[c] = WC[c] ? raw / WC[c] : 0; pmax = Math.max(pmax, R.Cplay[c]); }
  for (const c in R.Cplay) { R.Cplay[c] = (pmax > 0 ? R.Cplay[c] / pmax * 5 : 0) + extra[c]; R.C[c] = R.Catt[c] + .7 * R.Cplay[c]; }
  return R;
}
function motivation(R) { const pm = computeMax().P; const mot = ["timmy", "johnny", "spike"]; const rel = mot.map(k => [k, pm[k] ? Math.max(0, R.P[k]) / pm[k] : 0]); const sum = rel.reduce((s, x) => s + x[1], 0); return rel.map(([k, v]) => [k, sum ? Math.round(v / sum * 100) : 0]).sort((a, b) => b[1] - a[1]); }
function idSuggest(R) {
  const pos = "WUBRG".split("").filter(c => !R.excluded.has(c)).map(c => [c, R.C[c]]).sort((a, b) => b[1] - a[1]);
  if (!pos.length) return null; const n = R.SET.ncol || 0; let pick;
  if (n >= 1) pick = pos.slice(0, n === 4 ? 4 : n);
  else { const mx = pos[0][1]; pick = pos.filter(([c, v], i) => i < 3 && v > 0 && v >= mx * .6); if (!pick.length) pick = [pos[0]]; }
  return ord(pick.map(p => p[0]).join(""));
}
function wantLevels() { return Object.assign({}, ANS().wantE || {}, ANS().wantP || {}); }
function cxPref(R) { const c = R.SET.complexity; if (c === undefined) return curMode() === "d" ? 1.5 : null; return c <= 2 ? 1 : c === 3 ? 2 : 3; }
function priceOf(c) { return c.usd != null ? c.usd : (c.eur != null ? c.eur * 1.1 : null); }

function scoreCmdr(c, R, want, owned) {
  const votes = ANS().votes || {};
  if (owned.has(c.n) || R.nopes.has(c.n) || votes[c.n] === -1) return null;
  const cols = ord(c.ci).split("").filter(Boolean);
  if (cols.some(x => R.excluded.has(x))) return null;
  if (!cols.length && R.excluded.has("C")) return null;
  const ub = R.SET.ub; if (c.ub && ub === -1) return null;
  const why = [], warn = [];
  const w = [1, .6, .4]; let af = 0, ws = 0;
  c.t.forEach((t, i) => { const wi = w[i] || .3; ws += wi; af += wi * clamp((R.A[t] || 0) / R.Aref, -1.5, 1); if (want[t] === 0) af -= wi * 1.2; });
  af = ws ? af / ws : 0; if (c.auto) af *= .9;
  const topT = c.t.filter(t => (R.A[t] || 0) / R.Aref > .35).map(t => ARCH[t].l);
  if (topT.length) why.push("colle à ton goût pour " + topT.slice(0, 2).map(s => s.toLowerCase()).join(" et "));
  const pool = "WUBRG".split("").filter(x => !R.excluded.has(x)).map(x => R.C[x]).sort((a, b) => b - a);
  let cf; let ctx = 0;
  if (cols.length) {
    const k = cols.length; const best = pool.slice(0, k).reduce((s, x) => s + x, 0) / Math.min(k, pool.length || 1);
    const mean = cols.reduce((s, x) => s + R.C[x], 0) / k; const spread = (pool[0] - (pool[pool.length - 1] || 0)) + 1;
    cf = clamp(1 - (best - mean) / spread, 0, 1); if (cf > .8) why.push("dans tes couleurs");
    const cg = ANS().colors || {}; cols.forEach(x => { if (cg[x] === 1) ctx -= .06; });
  } else cf = clamp(.45 + (R.C.C || 0) / 10, 0, 1);
  const n = R.SET.ncol; if (n) { const L = cols.length; const ok = (n === 4 ? L >= 4 : L === n); if (ok) ctx += .08; else if (Math.abs((n === 4 ? 4 : n) - L) >= 2) ctx -= .12; }
  let tf = 0; const fm = c.f.filter(f => R.fant.includes(f)); if (fm.length) { tf += .7; why.push("incarne " + FANTASIES[fm[0]].l.toLowerCase()); }
  else if (c.f.some(f => (R.fantW[f] || 0) >= 2)) tf += .35;
  const km = c.k.filter(k => R.kinds.has(k)); if (km.length) { tf += .7; why.push("tribu " + (TRIBE_FR[km[0]] || km[0]).toLowerCase()); }
  tf = Math.min(1, tf);
  const br = R.SET.bracket;
  if (br) { if (br <= 2 && c.pw === 3) { ctx -= .18; warn.push("plutôt puissant pour un bracket " + br); } if (br >= 4 && c.pw === 1) ctx -= .12; if (br >= 4 && c.pw === 3) ctx += .05; }
  if (c.gc && br && br <= 2) { ctx -= .3; warn.push("c’est un Game Changer, prévu pour les brackets 3 et plus"); }
  const bud = R.SET.budget, prox = R.SET.proxy || 0, p = priceOf(c);
  if (bud === 1 && c.pw === 3 && prox < 2) ctx -= .08;
  if (p != null && prox < 2) { if (bud === 1 && p > 15) { ctx -= .1; warn.push(`le commandant seul coûte environ ${Math.round(p)} $`); } else if (bud === 2 && p > 40) { ctx -= .06; warn.push(`le commandant seul coûte environ ${Math.round(p)} $`); } }
  const cxp = cxPref(R); if (cxp !== null) ctx -= .06 * Math.abs(c.cx - cxp);
  const ob = R.SET.obscure; if (ob !== undefined) { if (ob >= 4 && c.pop === 3) ctx -= .08; if (ob >= 4 && c.pop === 1) ctx += .05; if (ob <= 2 && c.pop === 1) ctx -= .04; }
  if (!(ob >= 4)) ctx += (c.pop - 2) * .04;
  const ct = R.SET.cmdtype; if (ct === "duo" && /[pb]/.test(c.fl)) ctx += .08; if (ct === "odd" && c.fl.includes("a")) ctx += .08; if (ct === "crea" && c.fl.includes("a")) ctx -= .1;
  if (c.ub) { if (ub === 2) ctx += .08; if (ub === 0) ctx -= .15; }
  if (R.SET.start === "precon" && c.cx === 3) ctx -= .05;
  const nd = R.SET.nextdeck; if (nd === "new" && R.own.has(c.t[0])) ctx -= .15; if (nd === "deeper" && R.own.has(c.t[0])) ctx += .06;
  if (R.likes.has(c.n)) { ctx += .12; why.unshift("tu as aimé sa carte"); }
  if (votes[c.n] === 1) ctx += .1;
  FACE.forEach(f => { if (f.a && c.t.slice(0, 2).includes(f.a) && R.face[f.k] !== undefined && R.face[f.k] <= 1) { warn.push("fait subir aux autres « " + f.l.toLowerCase() + " », que tu n’aimes pas affronter"); ctx -= .04; } });
  if (c.fl.includes("s")) warn.push("réputé frustrant à affronter : annonce-le avant la partie");
  const sc = .42 * af + .38 * cf + .14 * tf + ctx;
  return { c, sc, pct: Math.round(clamp(sc / .95, 0, .99) * 100), why: [...new Set(why)], warn: [...new Set(warn)].slice(0, 2) };
}
function applyDuels(list) {
  const d = ANS().duels || []; list.forEach(x => { x.rating = x.sc * 1000; }); if (!d.length) return list;
  const rt = {}; list.forEach(x => rt[x.c.n] = x.rating);
  d.forEach(([a, b, w]) => {
    if (rt[a] === undefined || rt[b] === undefined) return;
    if (w === "none") { rt[a] -= 20; rt[b] -= 20; return; }
    const ea = 1 / (1 + Math.pow(10, (rt[b] - rt[a]) / 400)); const sa = w === "a" ? 1 : 0;
    rt[a] += 64 * (sa - ea); rt[b] += 64 * ((1 - sa) - (1 - ea));
  });
  list.forEach(x => { x.rating = rt[x.c.n]; }); return list.sort((p, q) => q.rating - p.rating);
}
function suggestions(R, limit, noDuels) {
  const want = wantLevels(), owned = ownedSet();
  const sc = []; for (const c of CMDRS) { const x = scoreCmdr(c, R, want, owned); if (x) sc.push(x); }
  sc.sort((a, b) => b.sc - a.sc);
  const used = {}, out = []; const L = Math.max(limit || 9, 9);
  for (const x of sc) { const p = x.c.t[0] || "-"; if ((used[p] || 0) >= 2) continue; used[p] = (used[p] || 0) + 1; out.push(x); if (out.length >= L) break; }
  return (noDuels ? out : applyDuels(out)).slice(0, limit || 9);
}

/* ===================== PENTAGONE ===================== */
function pentSVG(R) {
  const order = ["W", "U", "B", "R", "G"], ang = [-90, -18, 54, 126, 198], cx = 110, cy = 110, Rm = 72;
  const att = order.map(c => Math.max(0, R.Catt[c] || 0)), ply = order.map(c => Math.max(0, R.Cplay[c] || 0));
  const mx = Math.max(6, ...att, ...ply);
  const pt = (a, r) => { const t = a * Math.PI / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; }; const f = n => n.toFixed(1);
  const poly = vals => ang.map((a, i) => pt(a, 5 + (Rm - 5) * vals[i] / mx).map(f).join(",")).join(" ");
  let s = `<svg viewBox="0 0 220 220" role="img" aria-label="Couleurs. Attirance : ${order.map((c, i) => CNAME[c] + " " + Math.round(att[i])).join(", ")}. Jeu : ${order.map((c, i) => CNAME[c] + " " + Math.round(ply[i])).join(", ")}">`;
  [1 / 3, 2 / 3, 1].forEach(k => { s += `<polygon points="${ang.map(a => pt(a, Rm * k).map(f).join(",")).join(" ")}" class="pg-ring"/>`; });
  ang.forEach(a => { const [x, y] = pt(a, Rm); s += `<line x1="${cx}" y1="${cy}" x2="${f(x)}" y2="${f(y)}" class="pg-ring"/>`; });
  s += `<polygon points="${poly(att)}" class="pg-att"/><polygon points="${poly(ply)}" class="pg-play"/>`;
  ang.forEach((a, i) => { const c = order[i]; const [x, y] = pt(a, Rm + 21); const ex = R.excluded.has(c); s += `<g opacity="${ex ? .35 : 1}"><circle cx="${f(x)}" cy="${f(y)}" r="13" class="pc ${c}" stroke-width="1"/><text x="${f(x)}" y="${f(y)}" dy=".36em" text-anchor="middle" class="pt ${c}">${c}</text>${ex ? `<line x1="${f(x - 10)}" y1="${f(y + 10)}" x2="${f(x + 10)}" y2="${f(y - 10)}" class="pg-x"/>` : ""}</g>`; });
  return s + "</svg>";
}

/* ===================== RENDU DES QUESTIONS ===================== */
const main = document.getElementById("main");
function rg(label, inner) { return `<div role="radiogroup" aria-label="${esc(strip(label))}">${inner}</div>`; }
function renderQ(q) {
  const A = ANS(), a = A[q.id], lid = "lg-" + q.id; let body = "";
  if (q.type === "single") {
    body = rg(q.q, `<div class="opts${q.chips ? " chips" : ""}">` + shuffled(q).map(o => `<button type="button" class="opt" role="radio" data-act="single" data-q="${q.id}" data-o="${o.id}" aria-checked="${a === o.id}"><span class="mark" aria-hidden="true"></span><span>${o.l}</span></button>`).join("") +
      `<button type="button" class="opt idk" role="radio" data-act="single" data-q="${q.id}" data-o="?" aria-checked="${a === "?"}"><span class="mark" aria-hidden="true"></span><span>Je ne sais pas</span></button></div>`);
  } else if (q.type === "multi") {
    const sel = Array.isArray(a) ? a : []; const tok = q.none ? "none" : "?";
    body = `<div class="opts${q.chips ? " chips" : ""}" role="group" aria-labelledby="${lid}">` + shuffled(q).map(o => `<button type="button" class="opt multi" data-act="multi" data-q="${q.id}" data-o="${o.id}" aria-pressed="${sel.includes(o.id)}"><span class="mark" aria-hidden="true"></span><span>${o.l}</span></button>`).join("") +
      `<button type="button" class="opt multi idk" data-act="multi" data-q="${q.id}" data-o="${tok}" aria-pressed="${sel[0] === tok}"><span class="mark" aria-hidden="true"></span><span>${q.none || "Aucun / je ne sais pas"}</span></button></div>
      <p class="count" id="cnt-${q.id}" aria-live="polite">${(sel[0] === "?" || sel[0] === "none") ? "" : `${sel.length} sur ${q.max} choisi${sel.length > 1 ? "s" : ""}`}</p>`;
    if (q.other) body += `<div class="other"><label for="oth-${q.id}">Autre :</label><input type="text" id="oth-${q.id}" data-other="${q.id}" value="${esc(A[q.id + "__other"] || "")}" placeholder="précise ici"></div>`;
  } else if (q.type === "scale") {
    body = rg(q.q, `<div class="scale"><span class="pole">${q.left}</span><div class="dots">` + [1, 2, 3, 4, 5].map(v => `<button type="button" class="dot" role="radio" data-act="scale" data-q="${q.id}" data-v="${v}" aria-checked="${a === v}" aria-label="${v} sur 5">${v}</button>`).join("") + `</div><span class="pole right">${q.right}</span></div>
      <div class="idkline"><button type="button" class="mini-idk" role="radio" data-act="scale" data-q="${q.id}" data-v="?" aria-checked="${a === "?"}">Je ne sais pas</button></div>`);
  } else if (q.type === "pair") {
    body = rg(q.q, `<div class="pair">` + ["a", "b"].map(k => `<button type="button" class="opt" role="radio" data-act="pair" data-q="${q.id}" data-o="${k}" aria-checked="${a === k}"><span class="mark" aria-hidden="true"></span><span>${q[k].l}</span></button>`).join("") + `</div>
      <div class="idkline"><button type="button" class="mini-idk" role="radio" data-act="pair" data-q="${q.id}" data-o="?" aria-checked="${a === "?"}">Je ne sais pas</button></div>`);
  } else if (q.type === "grid") {
    const lv = q.scale === "want" ? WANT_LV : q.scale === "face" ? FACE_LV : COLOR_LV; const g = a || {};
    body = `<div class="grid g-${q.scale}"><div class="ghead" aria-hidden="true"><span></span><span class="cols">${lv.map(L => `<span>${L.l}</span>`).join("")}<span class="q">?</span></span></div>` +
      q.items.map(it => `<div class="row"><div class="row-txt">${q.scale === "color" ? pip(it.k) : ""}<div><strong>${it.l}</strong><span class="d">${it.d}</span></div></div>` +
        rg(it.l, `<div class="lv">` + lv.map(L => `<button type="button" class="lvb v${L.v}" role="radio" data-act="grid" data-q="${q.id}" data-k="${it.k}" data-v="${L.v}" aria-checked="${g[it.k] === L.v}" aria-label="${esc(it.l)} : ${esc(L.l)}"><span class="t">${L.l}</span></button>`).join("") +
          `<button type="button" class="lvb vq" role="radio" data-act="grid" data-q="${q.id}" data-k="${it.k}" data-v="?" aria-checked="${g[it.k] === "?"}" aria-label="${esc(it.l)} : je ne sais pas"><span class="t">?</span></button></div>`) + `</div>`).join("") + `</div>`;
  } else if (q.type === "tribes") {
    const sel = (a && a.sel) || []; const none = a === "?"; const chipTypes = TRIBE_CHIPS.map(x => x[1]);
    body = `<div class="opts chips" role="group" aria-labelledby="${lid}">` + TRIBE_CHIPS.map(([fr, en]) => `<button type="button" class="opt multi" data-act="tribe" data-t="${en}" aria-pressed="${sel.includes(en)}"><span class="mark" aria-hidden="true"></span><span>${fr}</span></button>`).join("") +
      `<button type="button" class="opt multi idk" data-act="tribe" data-t="?" aria-pressed="${none}"><span class="mark" aria-hidden="true"></span><span>Aucun en particulier</span></button></div>
      <div class="tsearch"><input type="text" id="tsearch" list="typelist" placeholder="Autre type, en français ou en anglais : Kraken, Hydre…" aria-label="Chercher un type de créature"><button type="button" class="btn ghost" data-act="tribeadd">Ajouter</button></div>
      <datalist id="typelist">${TRIBE_CHIPS.map(([fr]) => `<option value="${esc(fr)}">`).join("")}${TYPEDATA.types.map(t => `<option value="${esc(t)}">`).join("")}</datalist>
      <div class="tsel">${sel.filter(t => !chipTypes.includes(t)).map(t => `<button type="button" class="tag-x" data-act="tribe" data-t="${esc(t)}" aria-label="Retirer ${esc(t)}">${esc(t)} ✕</button>`).join("")}</div>
      <p class="count" id="cnt-${q.id}" aria-live="polite">${sel.length} sur ${q.max} choisi${sel.length > 1 ? "s" : ""}</p>`;
  } else if (q.type === "text") {
    body = `<textarea data-q="${q.id}" rows="3" placeholder="${esc(q.ph || "")}" aria-labelledby="${lid}">${esc(a || "")}</textarea>`;
  } else if (q.type === "swipe") { body = renderSwipe(q); }
  else if (q.type === "collection") { body = renderCollection(q); }
  return `<fieldset class="q" id="q-${q.id}"><legend class="legend" id="${lid}">${q.q}</legend>${q.help ? `<p class="help">${q.help}</p>` : ""}${body}</fieldset>`;
}
function rovers(root) { (root || main).querySelectorAll('[role="radiogroup"]').forEach(g => { const rs = [...g.querySelectorAll('[role="radio"]')]; const on = rs.find(r => r.getAttribute("aria-checked") === "true") || rs[0]; rs.forEach(r => r.tabIndex = (r === on ? 0 : -1)); }); }
function rerenderQ(qid, focusSel) {
  const el = document.getElementById("q-" + qid); if (!el) return;
  const tmp = document.createElement("div"); tmp.innerHTML = renderQ(QMAP[qid]); const n = tmp.firstElementChild; el.replaceWith(n); rovers(n);
  if (qid === "swipe") wireSwipe();
  if (focusSel) { const f = n.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }
}
const cssEsc = s => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, "\\$&");
function selOf(b) { const d = b.dataset; let s = `[data-act="${d.act}"]`; ["q", "o", "k", "v", "t"].forEach(k => { if (d[k] !== undefined) s += `[data-${k}="${cssEsc(d[k])}"]`; }); return s; }

/* ===================== COUP D'ŒIL (cartes à juger) ===================== */
function swipeTarget() { return ((QMAP.swipe && QMAP.swipe.n) || 20) + (ANS().swipeExtra || 0); }
function swipePool() { const owned = ownedSet(); return CMDRS.filter(c => c.pop >= 2 && !owned.has(c.n)); }
function nextSwipe() {
  const A = ANS(), sw = A.swipe || {}, order = A.swipeOrder || [], n = order.length;
  const pool = swipePool().filter(c => sw[c.n] === undefined); if (!pool.length) return null;
  const r = rng(hash(S.seed + ":sw:" + n));
  if (n < 8 || n % 3 === 2) {
    const shownT = new Set(order.map(x => CBYN[x] && CBYN[x].t[0]).filter(Boolean)); const shownC = {};
    order.forEach(x => { const c = CBYN[x]; if (c) (c.ci || "C").split("").forEach(k => shownC[k] = (shownC[k] || 0) + 1); });
    let best = null, bs = -1;
    for (const c of pool) { const s = (shownT.has(c.t[0]) ? 0 : 2) + (c.ci || "C").split("").reduce((a, k) => a + (shownC[k] ? 0 : .7), 0) + (c.pop === 3 ? .4 : 0) + (c.auto ? 0 : .3) + r() * 1.2; if (s > bs) { bs = s; best = c; } }
    return best;
  }
  const R = compute(), want = wantLevels(), owned = ownedSet(); const last = order.slice(-2).map(x => CBYN[x] && CBYN[x].t[0]);
  let best = null, bs = -1e9;
  for (const c of pool) { const x = scoreCmdr(c, R, want, owned); if (!x) continue; const s = x.sc - (last.includes(c.t[0]) ? .15 : 0) + r() * .05; if (s > bs) { bs = s; best = c; } }
  return best || pool[0];
}
function renderSwipe(q) {
  const A = ANS(), sw = A.swipe || {}, order = A.swipeOrder || [], N = swipeTarget();
  if (VIEW) return `<p class="muted">${order.length} cartes jugées.</p>`;
  let cur = A.swipeCur && CBYN[A.swipeCur] && sw[A.swipeCur] === undefined ? CBYN[A.swipeCur] : null;
  if (order.length >= N || A.swipeDone) cur = null;
  else if (!cur) { cur = nextSwipe(); if (cur) { A.swipeCur = cur.n; save(); } }
  if (!cur) {
    const likes = order.filter(n => sw[n] > 0), nopes = order.filter(n => sw[n] < 0);
    return `<div class="sdone"><p><b>${order.length} cartes jugées.</b> ${likes.length} coups de cœur, ${nopes.length} refus.</p>
      <div class="thumbs">${likes.map(n => `<span class="l">${esc(n.split(",")[0])}</span>`).join("")}${nopes.map(n => `<span class="n">${esc(n.split(",")[0])}</span>`).join("")}</div>
      <div class="btnrow" style="justify-content:center"><button class="btn ghost" data-act="swmore">Juger 10 cartes de plus</button><button class="btn ghost" data-act="swundo">Annuler la dernière</button><button class="btn ghost" data-act="swreset">Recommencer</button></div></div>`;
  }
  const desc = cur.d || (cur.o ? "Texte officiel (anglais) : " + cur.o : "");
  return `<div class="swipe">
    <p class="sprog" aria-live="polite">Carte ${order.length + 1} sur ${N}</p>
    <div class="swipe-stage" id="swipeStage">
      <div class="scard" id="scard" data-n="${esc(cur.n)}">
        <img src="${esc(imgUrl(cur, "normal"))}" alt="${esc(cur.n)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
        <div class="fallback" hidden><b>${esc(cur.n)}</b><span class="pips">${pips(cur.ci)}</span><span class="muted">${esc(cur.tl || "")}</span><span>${esc(cur.o || cur.d || "")}</span></div>
        <span class="stamp like">J’aime</span><span class="stamp nope">Non</span>
      </div>
    </div>
    <div class="scap"><div class="nm">${esc(cur.n)} <span class="pips">${pips(cur.ci)}</span></div><div class="ds">${esc(desc)}</div></div>
    <div class="sbtns"><button class="btn nope" data-act="sw" data-v="-1">Pas pour moi</button><button class="btn meh" data-act="sw" data-v="0">Bof</button><button class="btn like" data-act="sw" data-v="1">J’aime</button></div>
    <div class="btnrow" style="justify-content:center;margin-top:0">${order.length ? `<button class="linkbtn" data-act="swundo">Annuler la dernière</button>` : ""}<button class="linkbtn" data-act="swdone">Terminer le coup d’œil</button></div>
    <p class="small muted">Clavier : flèche droite j’aime, flèche gauche pas pour moi, flèche bas bof. Sur téléphone, fais glisser la carte.</p>
  </div>`;
}
function swipeReact(v) {
  const A = ANS(); const n = A.swipeCur; if (!n) return;
  A.swipe = Object.assign({}, A.swipe || {}); A.swipe[n] = v; A.swipeOrder = [...(A.swipeOrder || []), n]; delete A.swipeCur;
  save(); rerenderQ("swipe"); updateRail();
  const nx = nextSwipe(); if (nx) { const im = new Image(); im.src = imgUrl(nx, "normal"); }
}
function wireSwipe() {
  const card = document.getElementById("scard"); if (!card) return;
  let x0 = null, y0 = 0, dx = 0, dy = 0; const like = card.querySelector(".stamp.like"), nope = card.querySelector(".stamp.nope");
  card.addEventListener("pointerdown", e => { x0 = e.clientX; y0 = e.clientY; dx = dy = 0; card.classList.add("dragging"); card.setPointerCapture(e.pointerId); });
  card.addEventListener("pointermove", e => { if (x0 === null) return; dx = e.clientX - x0; dy = e.clientY - y0; card.style.transform = `translate(${dx}px,${Math.max(0, dy) * .4}px) rotate(${dx / 18}deg)`; like.style.opacity = clamp(dx / 90, 0, 1); nope.style.opacity = clamp(-dx / 90, 0, 1); });
  const end = () => {
    if (x0 === null) return; x0 = null; card.classList.remove("dragging");
    if (dx > 90 || dx < -90) { card.style.transform = `translate(${dx > 0 ? 600 : -600}px,0) rotate(${dx / 6}deg)`; card.style.opacity = 0; setTimeout(() => swipeReact(dx > 0 ? 1 : -1), 180); }
    else if (dy > 110) { swipeReact(0); }
    else { card.style.transform = ""; like.style.opacity = 0; nope.style.opacity = 0; }
  };
  card.addEventListener("pointerup", end); card.addEventListener("pointercancel", end);
}

/* ===================== DECKS : commandants possédés et analyse de liste ===================== */
function ownedCandidates(text) {
  const lines = norm(text || "").split(/\n|;/).map(x => x.trim()).filter(x => x.length >= 3); const out = new Map();
  lines.forEach(line => {
    const exact = CMDRS.filter(c => { const nm = norm(c.n); return nm === line || nm.split(",")[0] === line || nm.split(" // ")[0] === line; });
    const part = CMDRS.filter(c => { const nm = norm(c.n); return !exact.includes(c) && (nm.startsWith(line) || nm.split(/[ ,]+/).some(w => w.length >= 4 && w === line)); }).slice(0, 6);
    const all = [...exact, ...part]; const sure = all.length === 1 && exact.length === 1;
    all.forEach(c => { if (!out.has(c.n)) out.set(c.n, sure); });
  });
  return [...out.entries()].map(([n, sure]) => ({ n, sure }));
}
function renderCands() {
  const A = ANS(); const cands = ownedCandidates(A.decksText); const own = new Set(A.ownedC || []);
  if (!cands.length) return (A.decksText || "").trim() ? `<p class="small muted">Aucun commandant reconnu pour l’instant : vérifie l’orthographe (nom anglais).</p>` : "";
  return `<p class="small muted" style="margin:6px 0 0">Coche ceux qui sont vraiment à toi :</p><div class="opts chips">` + cands.map(({ n }) => `<button type="button" class="opt multi" data-act="own" data-n="${esc(n)}" aria-pressed="${own.has(n)}"><span class="mark" aria-hidden="true"></span><span>${esc(n)}</span></button>`).join("") + `</div>`;
}
function renderCollection(q) {
  const A = ANS();
  if (VIEW) return `<p class="muted">${(A.ownedC || []).length} commandants possédés, ${(A.decks || []).length} deck(s) analysé(s).</p>${(A.decks || []).map(deckSummaryHTML).join("")}`;
  return `<label class="small muted" for="decksText">Tes commandants, un par ligne (nom anglais, même partiel) :</label>
    <textarea id="decksText" data-coll="names" rows="3" placeholder="Teysa Karlov&#10;Tovolar">${esc(A.decksText || "")}</textarea>
    <div id="cands">${renderCands()}</div>
    <h4>Analyser une liste de deck <span class="muted small">(facultatif)</span></h4>
    <label class="small muted" for="decklist">Colle la liste exportée depuis Moxfield, Archidekt ou MTG Arena :</label>
    <textarea id="decklist" rows="5" placeholder="Commander&#10;1 Teysa Karlov&#10;&#10;Deck&#10;1 Sol Ring&#10;1 Blood Artist&#10;…"></textarea>
    <div class="inline-input"><input type="text" id="deckname" placeholder="Nom du deck (facultatif)" aria-label="Nom du deck"><button type="button" class="btn" data-act="deckscan">Analyser avec Scryfall</button><span class="small muted" id="deckStatus" aria-live="polite"></span></div>
    ${(A.decks || []).map((d, i) => deckSummaryHTML(d, i)).join("")}
    <div class="idkline"><button type="button" class="mini-idk" role="checkbox" data-act="collnone" aria-checked="${A.collNone === true}">Je n’ai pas encore de deck</button></div>`;
}
function deckSummaryHTML(d, i) {
  const tags = Object.entries(d.tags || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, v]) => `${ARCH[t] ? ARCH[t].l : t} (${Math.round(v * 100)} %)`);
  const types = Object.entries(d.types || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${TRIBE_FR[k] || k} ×${v}`);
  const gcTxt = d.gc === 0 ? "aucun Game Changer : brackets 1 à 3 selon tes combos" : d.gc <= 3 ? `${d.gc} Game Changer${d.gc > 1 ? "s" : ""} : au moins bracket 3` : `${d.gc} Game Changers : bracket 4 ou plus`;
  return `<div class="deckres"><h4>${esc(d.label || "Deck analysé")} ${d.ci ? `<span class="pips">${pips(d.ci)}</span>` : ""}</h4>
    <div class="small">${d.cmdrs && d.cmdrs.length ? "Commandant : " + d.cmdrs.map(esc).join(" + ") + ". " : ""}${d.n} cartes reconnues, ${d.lands} terrains.</div>
    <div class="small">Ce qu’il fait le plus : ${tags.join(", ") || "rien de marquant"}.</div>
    ${types.length ? `<div class="small">Créatures : ${types.join(", ")}.</div>` : ""}
    <div class="small muted">D’après son nombre de Game Changers : ${gcTxt}.</div>
    ${d.nf && d.nf.length ? `<div class="small muted">Non trouvées : ${d.nf.map(esc).join(", ")}.</div>` : ""}
    ${i !== undefined && !VIEW ? `<button class="linkbtn small" data-act="deckdel" data-i="${i}">Retirer ce deck</button>` : ""}</div>`;
}
function parseDecklist(txt) {
  const names = [], cmdrs = []; let section = "";
  String(txt || "").split(/\r?\n/).forEach(raw => {
    let l = raw.trim(); if (!l) { if (section === "cmd") section = ""; return; }
    const low = l.toLowerCase().replace(/[:\[\]]/g, "").trim();
    if (/^(commander|commandant|commanders|commandants)$/.test(low)) { section = "cmd"; return; }
    if (/^(deck|mainboard|main|sideboard|maybeboard|companion|about|considering|tokens?)$/.test(low)) { section = /^(sideboard|maybeboard|considering|tokens?)$/.test(low) ? "skip" : ""; return; }
    if (/^name\s/.test(low) || l.startsWith("//") || l.startsWith("#")) return;
    if (section === "skip") return;
    const isC = section === "cmd" || /\*cmdr\*|\[commander[^\]]*\]|#commander/i.test(l);
    l = l.replace(/^\d+\s*x?\s+/i, "").replace(/\s*\*[^*]+\*\s*/g, " ").replace(/\s*\[[^\]]*\]\s*/g, " ").replace(/\s*\^[^^]*\^\s*/g, " ").replace(/\s+#.*$/, "")
      .replace(/\s+\([A-Za-z0-9]{2,6}\)(\s+[\w★-]+)?\s*$/, "").trim();
    if (l.includes(" / ") && !l.includes(" // ")) l = l.replace(" / ", " // ");
    if (!l || /^\d+$/.test(l)) return;
    if (!names.includes(l)) names.push(l); if (isC && !cmdrs.includes(l)) cmdrs.push(l);
  });
  return { names: names.slice(0, 250), cmdrs };
}
function cardText(c) { return c.oracle_text || (c.card_faces || []).map(f => f.oracle_text || "").join("\n"); }
function cardType(c) { return c.type_line || ((c.card_faces || [])[0] || {}).type_line || ""; }
function summarizeDeck(cards, cmdrNames, notFound, label) {
  const nonland = cards.filter(c => !/\bLand\b/.test(cardType(c)));
  const counts = {}; nonland.forEach(c => { const t = tagText(cardText(c), c.name); for (const k in t) if (t[k] >= 1.5) counts[k] = (counts[k] || 0) + 1; });
  const tags = {}; Object.entries(counts).forEach(([k, v]) => { const sh = v / Math.max(1, nonland.length); if (sh >= .08) tags[k] = Math.round(sh * 100) / 100; });
  const types = {}; cards.filter(c => /Creature/.test(cardType(c))).forEach(c => { const tl = cardType(c); if (!tl.includes("—")) return; tl.split("—")[1].split("//")[0].trim().split(/\s+/).forEach(k => { if (k && k !== "Human") types[k] = (types[k] || 0) + 1; }); });
  const topTypes = {}; Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([k, v]) => { if (v >= 3) topTypes[k] = v; });
  const front = n => n.split(" // ")[0];
  let cm = cards.filter(c => cmdrNames.some(n => norm(front(n)) === norm(front(c.name)))).map(c => front(c.name));
  const ciAll = ord(cards.flatMap(c => c.color_identity || []).join(""));
  if (!cm.length) { const leg = cards.filter(c => /Legendary/.test(cardType(c)) && /Creature/.test(cardType(c)) && ord((c.color_identity || []).join("")) === ciAll); if (leg.length === 1) cm = [front(leg[0].name)]; }
  const ci = cm.length ? ord(cards.filter(c => cm.includes(front(c.name))).flatMap(c => c.color_identity || []).join("")) : ciAll;
  return { label: label || (cm[0] ? "Deck " + cm[0].split(",")[0] : "Deck analysé"), n: cards.length, lands: cards.length - nonland.length, ci, cmdrs: cm, tags, types: topTypes, gc: cards.filter(c => c.game_changer).length, nf: notFound.slice(0, 12) };
}
async function deckScan() {
  const st = document.getElementById("deckStatus"); const btn = document.querySelector('[data-act="deckscan"]');
  const parsed = parseDecklist(document.getElementById("decklist").value);
  if (!parsed.names.length) { st.textContent = "Aucune carte reconnue dans le texte collé."; return; }
  btn.disabled = true; const found = [], nf = [];
  try {
    for (let i = 0; i < parsed.names.length; i += 75) {
      if (i) await sleep(600);
      st.textContent = `Recherche chez Scryfall… ${Math.min(i + 75, parsed.names.length)} / ${parsed.names.length}`;
      const r = await fetch("https://api.scryfall.com/cards/collection", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ identifiers: parsed.names.slice(i, i + 75).map(name => ({ name })) }) });
      if (!r.ok) throw new Error("Scryfall a répondu " + r.status);
      const j = await r.json(); found.push(...(j.data || [])); (j.not_found || []).forEach(x => nf.push(x.name || "?"));
    }
  } catch (e) { st.textContent = "Analyse impossible pour l’instant (" + e.message + "). Réessaie dans un moment."; btn.disabled = false; return; }
  const A = ANS(); const sum = summarizeDeck(found, parsed.cmdrs, nf, (document.getElementById("deckname").value || "").trim());
  A.decks = [...(A.decks || []), sum].slice(-5); delete A.collNone;
  A.ownedC = [...new Set([...(A.ownedC || []), ...sum.cmdrs.filter(n => CBYN[n])])];
  save(); rerenderQ("collection"); updateRail();
}

/* ===================== ÉCRANS ===================== */
function renderIntro() {
  const n = Object.keys(S.answers).length;
  const cnt = m => { const old = S.mode; S.mode = m; const c = visSections().reduce((s, { s: sec }) => s + visQs(sec).length, 0); S.mode = old; return c; };
  const seed = META.built === "graine";
  return `<h1>Ce que tu veux jouer, et ce que tu ne veux plus jamais affronter</h1>
  <p class="lede">Un quiz pour trouver ton style de Commander, les commandants qui te ressemblent, et ce qu’il faut annoncer avant la partie pour ne plus subir les decks qui te gâchent la soirée.</p>
  <ul class="feature-list">
    <li><b>Tes vrais goûts</b><span>Tu réagis à de vrais commandants, et tu peux faire analyser tes decks actuels.</span></li>
    <li><b>Un classement fiable</b><span>Des duels entre tes meilleurs candidats pour départager ton podium.</span></li>
    <li><b>Ta carte-profil</b><span>Une image façon carte Magic et un lien à envoyer à tes amis.</span></li>
    <li><b>Ta phrase d’avant-partie</b><span>Ce que tu annonces au Rule 0, et des parades contre ce que tu détestes.</span></li>
  </ul>
  <div class="paths">
    <button class="path" data-act="mode" data-m="d"><b>Je découvre le Commander</b><span>Parcours découverte : ${cnt("d")} étapes, sans jargon, centré sur ce qui te fait envie.</span></button>
    <button class="path" data-act="mode" data-m="c"><b>Je joue régulièrement</b><span>Parcours complet : ${cnt("c")} étapes, avec les grilles de stratégies et les brackets.</span></button>
    <button class="path" data-act="mode" data-m="v"><b>Je joue depuis des années</b><span>Parcours complet, et des suggestions qui évitent les grands classiques.</span></button>
  </div>
  ${n > 0 && S.mode ? `<div class="btnrow"><button class="btn" data-act="resume">Reprendre où j’en étais</button><button class="btn ghost" data-act="results">Voir mon profil actuel</button><button class="btn ghost" data-act="reset">Tout recommencer</button></div>` : ""}
  <div class="about">
    <p><b>Tes réponses restent dans ton navigateur.</b> Rien n’est envoyé ailleurs, sauf les noms de cartes quand tu fais analyser une liste de deck par Scryfall, et ce que tu choisis de partager.</p>
    <p>Données et images des cartes : <a href="https://scryfall.com" rel="noopener">Scryfall</a>${seed ? " (base de départ de 135 commandants vérifiés, en attendant la première mise à jour)." : `, mises à jour le ${esc(META.built || "?")} (${CMDRS.length} commandants légaux).`}</p>
    <p>Le grand quiz Commander est un contenu de fan non officiel, autorisé par la politique de contenu de fan de Wizards of the Coast. Il n’est ni approuvé ni soutenu par Wizards. Certains éléments utilisés sont la propriété de Wizards of the Coast. Projet entre amis, sans but commercial.</p>
  </div>`;
}
function renderSection(i) {
  const vs = visSections(); const pos = vs.findIndex(x => x.i === i); const s = SECTIONS[i]; const A = ANS();
  let h = `<header><p class="sec-count">Partie ${pos + 1} sur ${vs.length}</p><h2 tabindex="-1" id="secTitle">${s.title}</h2>${s.intro ? `<p class="sec-intro">${s.intro}</p>` : ""}</header>`;
  h += visQs(s).map(renderQ).join("");
  h += `<details class="fb"${A["fb_" + s.id] ? " open" : ""}><summary>Il manque quelque chose dans cette partie ?</summary><textarea data-q="fb_${s.id}" placeholder="Une option, un type de deck, une question qui manque…" aria-label="Il manque quelque chose dans cette partie">${esc(A["fb_" + s.id] || "")}</textarea></details>`;
  const prev = pos > 0 ? vs[pos - 1].i : null, next = pos < vs.length - 1 ? vs[pos + 1].i : null;
  h += `<nav class="pager" aria-label="Navigation entre les parties">${prev !== null ? `<button class="btn ghost" data-act="goto" data-s="${prev}">Partie précédente</button>` : `<button class="btn ghost" data-act="home">Accueil</button>`}${next !== null ? `<button class="btn" data-act="goto" data-s="${next}">Partie suivante</button>` : `<button class="btn gold" data-act="results">Voir mon profil</button>`}</nav>`;
  return h;
}
function bars(list, max, fmt, cls) { return list.map(([lab, v]) => { const w = max > 0 ? clamp(Math.abs(v) / max * 100, 2, 100) : 2; return `<div class="bar"><span class="lab">${lab}</span><div class="track"><div class="fill ${cls || ""}${v < 0 ? " neg" : ""}" style="width:${w}%"></div></div><span class="val">${fmt ? fmt(v) : Math.round(v)}</span></div>`; }).join(""); }
function meter(lab, v, lo, hi) { if (v === undefined || v === null || isNaN(v)) return `<div class="meter"><span>${lab}</span><span class="muted">non précisé</span></div>`; const n = Math.round(clamp(v, 1, 5)); return `<div class="meter"><span>${lab}<br><span class="muted small">${lo} / ${hi}</span></span><span class="scalev" aria-label="${n} sur 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span></div>`; }

function contradictions(R) {
  const A = ANS(), sw = A.swipe || {}, want = wantLevels(), out = [];
  const swSig = t => { let p = 0, n = 0; for (const k in sw) { const c = CBYN[k]; if (c && c.t[0] === t) { if (sw[k] > 0) p++; if (sw[k] < 0) n++; } } return [p, n]; };
  const check = (t, lab, pos, neg) => { const [sp, sn] = swSig(t); const P = pos.filter(Boolean).length + (sp >= 2 ? 1 : 0), N = neg.filter(Boolean).length + (sn >= 2 ? 1 : 0); if (P >= 2 && N >= 2) out.push(`Tes réponses sur <b>${lab}</b> se contredisent : certaines disent oui, d’autres non. Pas grave, mais c’est le point à creuser avec tes amis ou avec Claude.`); };
  check("theft", "le vol", [want.theft >= 2, A.d5 === "b", A.s_steal === "yes", (A.vibe || []).includes("steal")], [want.theft === 0, A.d5 === "a", A.s_steal === "never", A.s_steal === "kill"]);
  check("combo", "les combos", [want.combo >= 2, A.s_combo === "win", (A.vibe || []).includes("combo"), (A.wincon || []).includes("combo")], [want.combo === 0, A.s_combo === "none", R.face.fastcombo === 0]);
  check("control", "le contrôle", [want.control >= 2, A.counter === "love", A.s_t6 === "hold"], [want.control === 0, A.counter === "hate", A.wipe === "never"]);
  return out;
}
function insights(R) {
  const out = []; const want = wantLevels(); const seen = new Set(); const strong = k => (want[k] >= 2) || ((R.A[k] || 0) / R.Aref > .45);
  FACE.forEach(f => { if (f.a && !seen.has(f.a) && strong(f.a) && R.face[f.k] !== undefined && R.face[f.k] <= 1) { seen.add(f.a); out.push(`Tu as envie de jouer <b>${ARCH[f.a].l.toLowerCase()}</b>, mais tu n’aimes pas l’affronter (« ${f.l.toLowerCase()} »). C’est très courant : annonce-le avant la partie et garde une version qui laisse jouer les autres.`); } });
  out.push(...contradictions(R));
  const br = R.SET.bracket, acc = R.accept;
  if (br && br <= 2 && acc.has("gc")) out.push("Tu acceptes des Game Changers tout en visant un bracket bas : d’après le guide officiel, ils ne sont pas prévus en brackets 1 et 2, et limités à trois en bracket 3.");
  if (br && br <= 3 && acc.has("mld")) out.push("La destruction massive de terrains place un deck au-delà du bracket 3 selon le guide officiel, même sans Game Changer.");
  if (br && br <= 3 && acc.has("turns")) out.push("Les tours supplémentaires en chaîne sont réservés aux brackets 4 et 5 dans le guide officiel.");
  if (br && br <= 2 && acc.has("combo2")) out.push("Les combos infinis à deux cartes ne sont pas prévus en brackets 1 et 2 ; en bracket 3, seulement s’ils n’arrivent pas tôt dans la partie.");
  if (strong("stax") && R.face.target !== undefined && R.face.target <= 1) out.push("Le stax attire tous les regards. Si être la cible te pèse, préfère des pièces symétriques que tu contournes, plutôt que des verrous qui visent un joueur.");
  if (strong("pillow") && (R.SET.politics || 3) <= 2) out.push("Le pillowfort marche mieux avec un peu de diplomatie, et ton profil politique est bas : prévois une condition de victoire claire pour ne pas faire traîner.");
  if (want.control === 3 && R.face.wipes !== undefined && R.face.wipes <= 1) out.push("Tu adores le contrôle mais les wipes à répétition t’agacent : vise un contrôle par removal ciblé et contresorts plutôt que par wipes.");
  if ((R.SET.themeEff || 3) <= 2 && (br || 0) >= 4) out.push("Très porté sur le thème tout en visant un bracket élevé : cherche des commandants à la fois thématiques et forts, ils existent.");
  const decks = ANS().decks || [];
  if (decks.length) {
    const quizTop = Object.keys(ARCH).filter(k => k !== "kindred").map(k => [k, (R.A[k] || 0) - 2.5 * clamp((R.Bdk[k] || 0) / .25, 0, 1)]).sort((a, b) => b[1] - a[1])[0];
    const deckTop = Object.entries(R.Bdk).sort((a, b) => b[1] - a[1])[0];
    if (quizTop && deckTop && deckTop[1] >= .15 && quizTop[0] !== deckTop[0]) out.push(`Tes decks actuels jouent surtout <b>${ARCH[deckTop[0]].l.toLowerCase()}</b>, alors que tes réponses penchent vers <b>${ARCH[quizTop[0]].l.toLowerCase()}</b>. Ton prochain deck est peut-être là.`);
  }
  if (R.pod.has("1v1")) out.push("Tu joues souvent en duel : le Commander à deux (Duel Commander) a ses propres règles, dont 20 points de vie et une liste de bannis différente. Certains commandants proposés ici brillent surtout à quatre.");
  if (R.answered && R.idk / R.answered > .3) out.push("Beaucoup de « je ne sais pas » : c’est normal quand on découvre. Les suggestions restent volontairement larges, et un deck préconstruit dans tes couleurs est un excellent point de départ.");
  return out;
}
function reliability(R) {
  const ratio = R.visible ? (R.answered - R.idk) / R.visible : 0; const idk = R.answered ? R.idk / R.answered : 0;
  const bonus = (R.swipeN >= 15 ? .1 : 0) + (R.deckN ? .1 : 0);
  if (ratio + bonus >= .75 && idk <= .15) return ["élevée", "Tu as répondu à presque tout, avec peu d’hésitations."];
  if (ratio + bonus >= .45) return ["moyenne", "Une partie du profil repose sur peu de réponses : complète les parties vides ou juge plus de cartes pour l’affiner."];
  return ["faible", "Trop peu de réponses pour un profil solide : les suggestions sont indicatives."];
}

/* ----- bloc commandants : duels, podium, votes ----- */
const DUELS = 7;
function nextDuel(R) {
  const d = ANS().duels || []; if (d.length >= DUELS || ANS().duelSkip) return null;
  const pool = applyDuels(suggestions(R, 8, true)); if (pool.length < 2) return null;
  const done = new Set(d.map(x => [x[0], x[1]].sort().join("|")));
  let best = null, bd = 1e9;
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < Math.min(pool.length, i + 4); j++) {
    const key = [pool[i].c.n, pool[j].c.n].sort().join("|"); if (done.has(key)) continue;
    const diff = Math.abs(pool[i].rating - pool[j].rating) + i * 15; if (diff < bd) { bd = diff; best = [pool[i].c, pool[j].c]; }
  }
  return best;
}
function cmdrItem(x) {
  const c = x.c, v = (ANS().votes || {})[c.n], p = priceOf(c);
  return `<div class="cmdr withart"><img class="art" loading="lazy" src="${esc(imgUrl(c, "art_crop"))}" alt="" onerror="this.style.visibility='hidden'">
    <div class="top"><span class="nm">${esc(c.n)}</span><span class="pips">${pips(c.ci)}</span>${c.ub ? `<span class="badge">${esc(c.ub)}</span>` : ""}${/[pb]/.test(c.fl) ? `<span class="badge">duo possible</span>` : ""}${c.gc ? `<span class="badge">Game Changer</span>` : ""}<span class="pct">${x.pct} %</span></div>
    <div>${esc(c.d || (c.o ? "Texte officiel (anglais) : " + c.o : ""))}</div>
    ${x.why.length ? `<div class="why">Pourquoi : ${x.why.join(", ")}.</div>` : ""}${x.warn.map(w => `<div class="warn">Attention : ${w}.</div>`).join("")}
    <div class="links"><a href="${esc(c.sf || ("https://scryfall.com/search?q=" + encodeURIComponent('!"' + c.n + '"')))}" target="_blank" rel="noopener">Scryfall</a><a href="${esc(edhrecUrl(c.n))}" target="_blank" rel="noopener">EDHREC</a>${p != null ? `<span class="muted">environ ${Math.round(p)} $</span>` : ""}</div>
    ${VIEW ? "" : `<div class="vote">Tu le jouerais ? <button data-act="vote" data-n="${esc(c.n)}" data-v="1" aria-pressed="${v === 1}">Oui</button><button data-act="vote" data-n="${esc(c.n)}" data-v="-1" aria-pressed="${v === -1}">Pas pour moi</button></div>`}
  </div>`;
}
function renderCmdrBlock(R) {
  const sug = suggestions(R, 9); const d = ANS().duels || []; const owned = [...ownedSet()];
  let h = `<h3>Tes commandants</h3>`;
  const duel = VIEW ? null : nextDuel(R);
  if (duel) {
    h += `<div id="duelBlock"><p><b>Départage final, duel ${d.length + 1} sur ${DUELS}.</b> Lequel construirais-tu en premier ?</p><div class="duel">${["a", "b"].map((k, i) => `<button class="dpick" data-act="duel" data-w="${k}" data-a="${esc(duel[0].n)}" data-b="${esc(duel[1].n)}"><img src="${esc(imgUrl(duel[i], "normal"))}" alt="${esc(duel[i].n)}" loading="lazy"><b>${esc(duel[i].n)}</b></button>`).join("")}</div>
      <div class="btnrow"><button class="btn ghost" data-act="duel" data-w="none" data-a="${esc(duel[0].n)}" data-b="${esc(duel[1].n)}">Aucun des deux</button><button class="btn ghost" data-act="duelskip">Passer les duels</button></div></div>`;
  } else if (d.length) {
    h += `<p class="muted">Ton podium après ${d.length} duels :</p><div class="podium">${sug.slice(0, 3).map((x, i) => `<figure><img src="${esc(imgUrl(x.c, "normal"))}" alt="${esc(x.c.n)}" loading="lazy"><figcaption>${i + 1}. ${esc(x.c.n)}</figcaption></figure>`).join("")}</div>
      ${VIEW ? "" : `<div class="btnrow"><button class="btn ghost" data-act="duelreset">Refaire les duels</button></div>`}`;
  }
  h += `<p class="muted" style="margin-top:18px">Le pourcentage combine tes stratégies, tes couleurs, ton personnage, ta tribu et tes réactions aux cartes, puis ajuste selon ton bracket, ton budget, la complexité voulue et tes decks actuels.${d.length ? " L’ordre tient compte de tes duels." : ""}</p>`;
  h += sug.map(cmdrItem).join("");
  if (owned.length) h += `<p class="muted small">Déjà dans ta collection, donc retirés : ${owned.map(esc).join(", ")}.</p>`;
  return h;
}

function renderResults() {
  const R = compute();
  if (R.answered < 6) return `<h2 tabindex="-1" id="secTitle">Encore un peu de réponses</h2><p>Tu as répondu à ${R.answered} étape${R.answered > 1 ? "s" : ""}. Il en faut au moins six pour qu’un profil ait du sens.</p><div class="btnrow"><button class="btn" data-act="resume">Continuer le quiz</button></div>`;
  const id = idSuggest(R), idName = id === null ? "Aucune couleur" : (NAMES[id] || id);
  const mp = motivation(R), msum = mp.some(x => x[1] > 0), pm = computeMax().P;
  const aes = ["vorthos", "mel"].map(k => [k, pm[k] ? Math.round(clamp(R.P[k] / pm[k], 0, 1) * 100) : 0]);
  const arch = Object.keys(ARCH).filter(k => k !== "kindred").map(k => [k, R.A[k]]);
  const topE = arch.filter(([k, v]) => ENGINE.includes(k) && v > .3).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topP = arch.filter(([k, v]) => PLANS.includes(k) && v > .3).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const bottom = arch.filter(([k, v]) => v <= -1).sort((a, b) => a[1] - b[1]).slice(0, 4);
  const amax = Math.max(1, ...arch.map(x => Math.abs(x[1])));
  const face = R.face; const quit = FACE.filter(f => face[f.k] === 0).sort((a, b) => (R.worst.has(b.k) ? 1 : 0) - (R.worst.has(a.k) ? 1 : 0));
  const annoy = FACE.filter(f => face[f.k] === 1), love = FACE.filter(f => face[f.k] === 3);
  const ins = insights(R); const [relL, relT] = reliability(R);
  const speed = R.SET.speed !== undefined ? R.SET.speed + (R.S.speed || 0) : undefined;
  const pol = R.SET.politics !== undefined ? R.SET.politics + (R.S.politics || 0) : (R.S.politics ? 3 + R.S.politics : undefined);
  const antis = [...new Set([...quit, ...annoy].map(f => f.k))].filter(k => ANTIDOTES[k]).slice(0, 5);
  const tribes = ((ANS().tribes && ANS().tribes.sel) || []);
  const sw = ANS().swipe || {}; const likes = Object.keys(sw).filter(n => sw[n] > 0), nopes = Object.keys(sw).filter(n => sw[n] < 0);
  let h = "";
  if (VIEW) h += `<div class="banner"><span>Profil de <b>${esc(VIEW.nm || "quelqu’un")}</b>, partagé par lien.</span><button class="btn gold" data-act="leaveview">Faire le quiz moi aussi</button></div>`;
  h += `<h2 tabindex="-1" id="secTitle">${VIEW ? "Son profil Commander" : "Ton profil Commander"}</h2>
  <div class="res-hero"><div class="big">${pentSVG(R)}<div class="legend-line"><span><i></i>ce qui attire</span><span><i class="play"></i>ce que le jeu demande</span></div></div><div>
    <p class="muted" style="margin:0">Identité de couleur suggérée</p>
    <p class="idname"><span>${idName}</span><span class="pips">${id === null ? "" : pips(id)}</span></p>
    ${msum ? `<p style="margin:0">Motivation dominante : <b>${PSY[mp[0][0]].l}</b> (${mp[0][1]} %) : ${PSY[mp[0][0]].d}</p>` : ""}
    ${R.excluded.size ? `<p class="muted" style="margin:.4em 0 0">Couleurs exclues : ${[...R.excluded].map(c => CNAME[c]).join(", ")}.</p>` : ""}
    <p class="muted small" style="margin:.6em 0 0">Fiabilité du profil : <b>${relL}</b>. ${relT} Signaux : ${R.answered} étapes, ${R.swipeN} cartes jugées, ${R.deckN} deck${R.deckN > 1 ? "s" : ""} analysé${R.deckN > 1 ? "s" : ""}.</p>
  </div></div>`;
  h += `<section class="block" id="cmdrBlock">${renderCmdrBlock(R)}</section>`;
  if (!VIEW) h += `<section class="block" id="shareBlock"><h3>Partager ton profil</h3>
    <div class="inline-input"><label for="pname">Ton prénom ou pseudo :</label><input type="text" id="pname" value="${esc(S.name || "")}" placeholder="Benjamin, Lulu, Le Méchant…" style="max-width:260px"></div>
    <div class="share-grid"><div>
      <div class="btnrow"><button class="btn gold" data-act="mklink">Créer mon lien de profil</button><button class="btn ghost" data-act="copylink" id="copyLinkBtn" hidden>Copier le lien</button><button class="btn ghost" data-act="sharelink" id="shareLinkBtn" hidden>Envoyer…</button></div>
      <input type="text" id="linkOut" readonly hidden aria-label="Lien de ton profil" style="width:100%;margin-top:8px">
      <div class="btnrow"><button class="btn" data-act="mkcard">Créer ma carte-profil</button><a class="btn ghost" id="cardDl" hidden download="carte-profil-commander.png">Télécharger l’image</a><button class="btn ghost" data-act="sharecard" id="shareCardBtn" hidden>Partager l’image</button></div>
      <img id="cardPreview" hidden alt="Ta carte-profil">
      <div class="btnrow"><button class="btn ghost" data-act="claude">Analyser avec Claude</button><button class="btn ghost" data-act="dltxt">Télécharger le résumé</button><button class="btn ghost" data-act="print">Imprimer ma fiche</button></div>
      <p class="small muted" id="shareMsg" aria-live="polite"></p>
    </div><div id="qrBox"></div></div></section>`;
  h += `<section class="block"><h3>Type de joueur</h3><div class="cols2"><div><p class="muted small" style="margin:0 0 4px">Pourquoi on joue</p>${bars(mp.map(([k, v]) => [PSY[k].l, v]), 100, v => v + " %")}</div>
    <div><p class="muted small" style="margin:0 0 4px">Ce qui semble beau</p>${bars(aes.map(([k, v]) => [PSY[k].l, v]), 100, v => v + " %", "alt")}</div></div>
    <p class="muted small">Selon Mark Rosewater, Vorthos et Mel ne sont pas des types de joueur mais des profils esthétiques, sur un autre axe : on peut être Spike et Vorthos à la fois.</p></section>`;
  if (R.fant.length || tribes.length) {
    h += `<section class="block"><h3>Ce que tu veux incarner</h3>`;
    const want = wantLevels(), own = ownedSet();
    R.fant.forEach(k => { const F = FANTASIES[k]; const ex = CMDRS.filter(c => c.f.includes(k)).map(c => scoreCmdr(c, R, want, own)).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 4).map(x => x.c);
      h += `<div class="tribe"><b>${F.l}</b><br><span class="muted">${F.hint}</span>${ex.length ? `<br><span class="small">Par exemple : ${ex.map(c => `${esc(c.n)} ${pips(c.ci)}`).join(" ; ")}</span>` : ""}</div>`; });
    const other = ANS().fantasy__other; if (other) h += `<div class="tribe"><b>${esc(other)}</b><br><span class="muted">Personnage libre : on en parle avec Claude.</span></div>`;
    tribes.forEach(t => { const lst = (TYPEDATA.tc[t] || []).slice(0, 5);
      h += `<div class="tribe"><b>${esc(TRIBE_FR[t] || t)}</b>${TRIBE_HINTS[t] ? `<br><span class="muted">${TRIBE_HINTS[t]}</span>` : ""}${lst.length ? `<br><span class="small">Commandants possibles : ${lst.map(([n, ci]) => `${esc(n)} ${pips(ci)}`).join(" ; ")}</span>` : `<br><span class="small muted">Aucune créature légendaire de ce type dans la base : il faudra un commandant qui le soutient.</span>`}</div>`; });
    h += `</section>`;
  }
  if (R.swipeN || R.deckN) {
    h += `<section class="block"><h3>Ce que révèlent tes cartes</h3>`;
    if (likes.length) h += `<p>Coups de cœur : ${likes.map(n => esc(n)).join(", ")}.</p>`;
    if (nopes.length) h += `<p class="muted">Refusés : ${nopes.map(n => esc(n)).join(", ")}.</p>`;
    h += (ANS().decks || []).map(d => deckSummaryHTML(d)).join("") + `</section>`;
  }
  h += `<section class="block"><h3>Stratégies</h3><div class="cols2"><div><p class="muted small" style="margin:0 0 4px">Plans de jeu</p>${topP.length ? bars(topP.map(([k, v]) => [ARCH[k].l, v]), amax, v => (v > 0 ? "+" : "") + v.toFixed(1)) : "<p class='muted small'>Pas assez de réponses.</p>"}</div>
    <div><p class="muted small" style="margin:0 0 4px">Moteurs</p>${topE.length ? bars(topE.map(([k, v]) => [ARCH[k].l, v]), amax, v => (v > 0 ? "+" : "") + v.toFixed(1)) : "<p class='muted small'>Pas assez de réponses.</p>"}</div></div>
    ${bottom.length ? `<p class="muted small" style="margin-top:18px">À éviter dans ses propres decks</p>${bars(bottom.map(([k, v]) => [ARCH[k].l, v]), amax, v => v.toFixed(1))}` : ""}</section>`;
  h += `<section class="block"><h3>Réglages de table</h3><div class="meters">
    ${R.SET.bracket ? `<div class="meter"><span>Puissance visée</span><b>${BRK[R.SET.bracket]}</b></div>` : meter("Puissance visée")}
    ${meter("Vitesse de la partie", speed, "lente", "rapide")}${meter("Complexité", R.SET.complexity, "simple", "casse-tête")}
    ${meter("Interaction", R.SET.interaction, "je déroule", "toujours une réponse")}${meter("Politique", pol, "aucune", "au cœur du jeu")}
    ${meter("Hasard", R.SET.variance, "contrôle", "chaos")}${meter("Thème ou efficacité", R.SET.themeEff, "thème", "efficacité")}</div></section>`;
  h += `<section class="block"><h3>Contre quoi ne pas jouer</h3>
    ${quit.length ? `<p style="margin-bottom:0">Quitte la table :</p><ul class="tags quit">${quit.map(f => `<li>${f.l}</li>`).join("")}</ul>` : ""}
    ${annoy.length ? `<p style="margin-bottom:0">Agace :</p><ul class="tags annoy">${annoy.map(f => `<li>${f.l}</li>`).join("")}</ul>` : ""}
    ${love.length ? `<p style="margin-bottom:0">Aime affronter :</p><ul class="tags love">${love.map(f => `<li>${f.l}</li>`).join("")}</ul>` : ""}
    ${!quit.length && !annoy.length && !love.length ? `<p class="muted">Remplis la partie « Ce que tu ne veux plus affronter » pour voir ce bloc.</p>` : ""}
    <p style="margin:22px 0 0">Phrase d’avant-partie :</p><p class="rule0">${rule0(R)}</p>
    ${antis.length ? `<h4>Parades</h4>${antis.map(k => `<div class="anti"><b>${FACEMAP[k].l}</b><br><span class="small">${ANTIDOTES[k]}</span></div>`).join("")}` : ""}</section>`;
  if (ins.length) h += `<section class="block"><h3>Ce que les réponses révèlent</h3>${ins.map(t => `<p class="note">${t}</p>`).join("")}</section>`;
  if (!VIEW) h += `<section class="block"><h3>Ton résumé complet</h3><p>Pour le garder ou le coller dans une conversation avec Claude.</p>
    <textarea id="export" readonly>${esc(exportText(R))}</textarea>
    <div class="btnrow"><button class="btn" data-act="copy">Copier le résumé</button><span id="copied" class="copied" aria-live="polite"></span></div>
    <div class="btnrow"><button class="btn ghost" data-act="resume">Modifier mes réponses</button>${S.mode === "d" ? `<button class="btn ghost" data-act="mode" data-m="c">Passer au parcours complet</button>` : ""}<button class="btn ghost" data-act="reset">Tout recommencer</button></div></section>`;
  return h;
}
function rule0(R) {
  const face = R.face; const quit = FACE.filter(f => face[f.k] === 0).sort((a, b) => (R.worst.has(b.k) ? 1 : 0) - (R.worst.has(a.k) ? 1 : 0));
  const annoy = FACE.filter(f => face[f.k] === 1 && R.worst.has(f.k));
  const arch = Object.keys(ARCH).filter(k => k !== "kindred").map(k => [k, R.A[k]]).filter(x => x[1] > .3).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => ARCH[x[0]].l.toLowerCase());
  const avoid = [...quit, ...annoy].slice(0, 4);
  return `« Je joue ${R.SET.bracket ? "un deck en " + BRK[R.SET.bracket] : "un deck détendu"}${arch.length ? ", plutôt " + arch.join(" et ") : ""}.${avoid.length ? " Je préfère éviter : " + avoid.map(f => f.l.toLowerCase()).join(", ") + "." : ""} Et vous ? »`;
}

/* ===================== EXPORT TEXTE ===================== */
function answerText(q, a) {
  const A = ANS();
  if (q.type === "swipe") { const sw = A.swipe || {}; const l = Object.keys(sw).filter(n => sw[n] > 0), n = Object.keys(sw).filter(n => sw[n] < 0); return `aime : ${l.join(", ") || "aucun"} | refuse : ${n.join(", ") || "aucun"}`; }
  if (q.type === "collection") { const d = (A.decks || []).map(x => `${x.label} [${x.ci}] : ${Object.entries(x.tags || {}).map(([t, v]) => (ARCH[t] ? ARCH[t].l : t) + " " + Math.round(v * 100) + " %").join(", ")}`); return `possédés : ${(A.ownedC || []).join(", ") || "aucun"}${d.length ? " | decks analysés : " + d.join(" ; ") : ""}`; }
  if (a === "?" || (Array.isArray(a) && a[0] === "?")) return "Je ne sais pas";
  if (Array.isArray(a) && a[0] === "none") return q.none || "Aucun";
  if (q.type === "single") { const o = optById(q, a); return o ? strip(o.l) : ""; }
  if (q.type === "multi") { let t = a.map(id => { const o = optById(q, id); return o ? strip(o.l) : ""; }).join(" ; "); const oth = A[q.id + "__other"]; if (oth) t += " ; autre : " + oth; return t; }
  if (q.type === "pair") return strip(q[a].l);
  if (q.type === "scale") return `${a}/5 (1 = ${q.left} ; 5 = ${q.right})`;
  if (q.type === "text") return a.trim().replace(/\n+/g, " / ");
  if (q.type === "tribes") return (a.sel || []).map(t => TRIBE_FR[t] || t).join(", ");
  if (q.type === "grid") { const lv = q.scale === "want" ? WANT_LV : q.scale === "face" ? FACE_LV : COLOR_LV;
    const parts = lv.map(L => { const it = q.items.filter(i => a[i.k] === L.v).map(i => i.l); return it.length ? `${L.l} : ${it.join(", ")}` : ""; }).filter(Boolean);
    const qq = q.items.filter(i => a[i.k] === "?").map(i => i.l); if (qq.length) parts.push("Je ne sais pas : " + qq.join(", ")); return parts.join(" | "); }
  return "";
}
function exportText(R) {
  R = R || compute(); const L = []; const r1 = v => Math.round(v * 10) / 10; const id = idSuggest(R); const A = ANS();
  const sug = suggestions(R, 9); const pm = computeMax().P; const nm = VIEW ? VIEW.nm : S.name;
  L.push("PROFIL COMMANDER" + (nm ? " de " + nm : "") + " (grand quiz, version " + VERSION + ", données " + (META.built || "?") + ")");
  L.push("Parcours : " + (curMode() === "d" ? "découverte" : "complet") + ((VIEW ? VIEW.vet : S.vet) ? " (joueur de longue date)" : ""));
  L.push("Motivation : " + motivation(R).map(([k, v]) => PSY[k].l + " " + v + " %").join(", ") + " | Esthétique : Vorthos " + (pm.vorthos ? Math.round(clamp(R.P.vorthos / pm.vorthos, 0, 1) * 100) : 0) + " %, Mel " + (pm.mel ? Math.round(clamp(R.P.mel / pm.mel, 0, 1) * 100) : 0) + " %");
  L.push("Couleurs (attirance / jeu / total) : " + "WUBRG".split("").map(c => `${c} ${r1(R.Catt[c])}/${r1(R.Cplay[c])}/${r1(R.C[c])}`).join(" | "));
  if (R.excluded.size) L.push("Couleurs exclues : " + [...R.excluded].map(c => CNAME[c]).join(", "));
  L.push("Identité suggérée : " + (id === null ? "aucune" : (NAMES[id] || id) + " (" + id + ")"));
  L.push("Personnages : " + (R.fant.map(k => FANTASIES[k].l).join(", ") || "non précisé") + (A.fantasy__other ? " ; autre : " + A.fantasy__other : ""));
  L.push("Archétypes (score) : " + Object.keys(ARCH).map(k => [k, R.A[k]]).filter(x => Math.abs(x[1]) >= .5).sort((a, b) => b[1] - a[1]).map(([k, v]) => ARCH[k].l + " " + r1(v)).join(", "));
  L.push("Réglages : " + (R.SET.bracket ? BRK[R.SET.bracket] : "bracket non précisé") + " ; budget " + (R.SET.budget || "?") + "/4 ; complexité " + (R.SET.complexity || "?") + "/5 ; politique " + (R.SET.politics || "?") + "/5 ; hasard " + (R.SET.variance || "?") + "/5");
  const f0 = FACE.filter(f => R.face[f.k] === 0).map(f => f.l), f1 = FACE.filter(f => R.face[f.k] === 1).map(f => f.l);
  if (f0.length) L.push("Je quitte la table face à : " + f0.join(", ")); if (f1.length) L.push("Ça m’agace : " + f1.join(", "));
  L.push("Suggestions du quiz : " + sug.map(x => `${x.c.n} (${x.pct} %)`).join(", "));
  const d = A.duels || []; if (d.length) L.push("Duels (" + d.length + ") : " + d.map(([a, b, w]) => w === "none" ? `ni ${a} ni ${b}` : `${w === "a" ? a : b} préféré à ${w === "a" ? b : a}`).join(" ; "));
  const v = A.votes || {}; const vy = Object.keys(v).filter(k => v[k] > 0), vn = Object.keys(v).filter(k => v[k] < 0);
  if (vy.length || vn.length) L.push("Votes sur les suggestions : je le jouerais : " + (vy.join(", ") || "aucun") + " | pas pour moi : " + (vn.join(", ") || "aucun"));
  const fiab = reliability(R); L.push("Fiabilité : " + fiab[0] + " ; je ne sais pas : " + Math.round(R.idk) + " sur " + R.answered + " réponses ; " + R.swipeN + " cartes jugées ; " + R.deckN + " decks analysés");
  L.push(""); L.push("RÉPONSES DÉTAILLÉES");
  visSections().forEach(({ s }, i) => { const lines = visQs(s).filter(isAnswered).map(q => `- ${strip(q.q)} → ${answerText(q, A[q.id])}`);
    if (A["fb_" + s.id]) lines.push("- Il manque : " + A["fb_" + s.id].trim());
    if (lines.length) { L.push(`[${i + 1}. ${s.title}]`); L.push(...lines); } });
  return L.join("\n");
}

/* ===================== PARTAGE ===================== */
function b64url(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function unb64url(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; const b = atob(s); const out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out; }
function slimAnswers(a) { const o = {}; for (const k in a) { if (k === "swipeCur") continue; const v = a[k]; o[k] = typeof v === "string" && v.length > 300 ? v.slice(0, 300) : v; } return o; }
async function encodeProfile() {
  const json = JSON.stringify({ v: VERSION, nm: S.name || "", m: S.mode || "c", vet: !!S.vet, a: slimAnswers(S.answers) });
  let bytes = new TextEncoder().encode(json), z = "0";
  if (window.CompressionStream) { try { const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw")); bytes = new Uint8Array(await new Response(cs).arrayBuffer()); z = "1"; } catch (e) { z = "0"; bytes = new TextEncoder().encode(json); } }
  return z + b64url(bytes);
}
async function decodeProfile(code) {
  let bytes = unb64url(code.slice(1));
  if (code[0] === "1") { const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")); bytes = new Uint8Array(await new Response(ds).arrayBuffer()); }
  const o = JSON.parse(new TextDecoder().decode(bytes)); if (!o || !o.a) throw new Error("profil illisible"); return o;
}
function shareMsg(t) { const m = document.getElementById("shareMsg"); if (m) m.textContent = t; }
async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (err) { } ta.remove(); return ok; } }
async function makeLink() {
  const url = location.origin + location.pathname + "#p=" + await encodeProfile();
  const inp = document.getElementById("linkOut"); inp.value = url; inp.hidden = false;
  document.getElementById("copyLinkBtn").hidden = false; document.getElementById("shareLinkBtn").hidden = !navigator.share;
  const box = document.getElementById("qrBox");
  if (window.qrcode && url.length <= 1800) { try { const qr = qrcode(0, "L"); qr.addData(url); qr.make(); box.innerHTML = qr.createImgTag(4, 8).replace("<img", '<img class="qr" alt="QR code de ton profil"'); } catch (e) { box.innerHTML = ""; } }
  else box.innerHTML = `<p class="small muted">Lien trop long pour un QR code lisible : envoie-le plutôt par message.</p>`;
  shareMsg("Ce lien contient tout ton profil. Celui qui l’ouvre voit tes résultats, sans rien modifier chez lui.");
}
/* ----- carte-profil en image ----- */
function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
  const words = String(text).split(/\s+/); let line = "", n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) { if (n === maxLines - 1) { ctx.fillText(line.replace(/[,.;:]?$/, "…"), x, y); return y + lh; } ctx.fillText(line, x, y); line = words[i]; y += lh; n++; }
    else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; } return y;
}
function loadCorsImage(url) { return new Promise(res => { if (!url) return res(null); const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = () => res(null); im.src = url + (url.includes("?") ? "&" : "?") + "cqz=1"; }); }
async function makeCard() {
  shareMsg("Création de ta carte…");
  const R = compute(), top = suggestions(R, 3)[0], id = idSuggest(R) || "", mp = motivation(R), pm = computeMax().P;
  const aes = (pm.vorthos && R.P.vorthos / pm.vorthos >= .5) ? "Vorthos" : (pm.mel && R.P.mel / pm.mel >= .5) ? "Mel" : "";
  try { await Promise.all([document.fonts.load("800 52px Alegreya"), document.fonts.load("italic 500 26px Alegreya"), document.fonts.load("500 26px 'Alegreya Sans'")]); } catch (e) { }
  const W = 750, H = 1050, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  const COL = { W: "#E9E1C3", U: "#2F6FB5", B: "#3A3238", R: "#C8432F", G: "#2C7A4B" }; const cols = id.split("").filter(Boolean);
  const frame = cols.length === 1 ? COL[cols[0]] : cols.length ? "#C9A64A" : "#A8A39C";
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = "#141114"; rr(0, 0, W, H, 38); g.fill();
  g.fillStyle = frame; rr(28, 28, W - 56, H - 56, 22); g.fill();
  const inkOn = cols.length === 1 && "UBRG".includes(cols[0]) ? "#F5F1E8" : "#1B1714";
  g.fillStyle = "#F4EFE4"; rr(44, 44, W - 88, 70, 12); g.fill(); g.strokeStyle = "#1B1714"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#1B1714"; g.font = "800 40px Alegreya, Georgia, serif"; g.textBaseline = "middle";
  g.fillText((S.name || "Joueur anonyme").slice(0, 22), 64, 80);
  const pipCols = { W: "#F3EBCB", U: "#3B79C2", B: "#3A3238", R: "#CF4637", G: "#2E8150", C: "#BDB8B2" };
  (cols.length ? cols : ["C"]).slice().reverse().forEach((c, i) => { const cx = W - 74 - i * 40, cy = 80; g.beginPath(); g.arc(cx, cy, 16, 0, Math.PI * 2); g.fillStyle = pipCols[c]; g.fill(); g.strokeStyle = "rgba(0,0,0,.4)"; g.stroke(); g.fillStyle = c === "W" || c === "C" ? "#3F3826" : "#fff"; g.font = "700 16px 'Alegreya Sans', Arial"; g.textAlign = "center"; g.fillText(c, cx, cy + 1); g.textAlign = "left"; });
  const ax = 60, ay = 130, aw = W - 120, ah = 470;
  const art = top ? await loadCorsImage(imgUrl(top.c, "art_crop")) : null;
  g.save(); rr(ax, ay, aw, ah, 8); g.clip();
  if (art) { const s = Math.max(aw / art.width, ah / art.height); g.drawImage(art, ax + (aw - art.width * s) / 2, ay + (ah - art.height * s) / 2, art.width * s, art.height * s); }
  else { const gr = g.createLinearGradient(ax, ay, ax + aw, ay + ah); gr.addColorStop(0, frame); gr.addColorStop(1, "#141114"); g.fillStyle = gr; g.fillRect(ax, ay, aw, ah); g.fillStyle = "rgba(255,255,255,.85)"; g.font = "800 64px Alegreya, Georgia, serif"; g.textAlign = "center"; g.fillText(NAMES[id] || "Commander", ax + aw / 2, ay + ah / 2); g.textAlign = "left"; }
  g.restore(); g.strokeStyle = "#1B1714"; g.lineWidth = 3; rr(ax, ay, aw, ah, 8); g.stroke();
  g.fillStyle = "#F4EFE4"; rr(44, 616, W - 88, 60, 12); g.fill(); g.strokeStyle = "#1B1714"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#1B1714"; g.font = "700 28px Alegreya, Georgia, serif";
  g.fillText(`Joueur — ${PSY[mp[0][0]].l.split(" /")[0]}${aes ? " " + aes : ""}`, 64, 647);
  g.font = "600 22px 'Alegreya Sans', Arial"; g.textAlign = "right"; g.fillText(NAMES[id] || "", W - 64, 647); g.textAlign = "left";
  g.fillStyle = "#FBF8F1"; rr(60, 692, W - 120, 270, 8); g.fill(); g.strokeStyle = "#1B1714"; g.stroke();
  g.fillStyle = "#1B1714"; g.textBaseline = "alphabetic";
  const arch = Object.keys(ARCH).filter(k => k !== "kindred").map(k => [k, R.A[k]]).filter(x => x[1] > .3).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => ARCH[x[0]].l);
  g.font = "700 26px 'Alegreya Sans', Arial"; let y = wrapText(g, arch.join(", ") || "Profil en construction", 84, 736, W - 168, 32, 2);
  if (top) { g.font = "500 24px 'Alegreya Sans', Arial"; y = wrapText(g, `Commandant de cœur : ${top.c.n} (${top.pct} %)`, 84, y + 6, W - 168, 30, 2); }
  g.font = "italic 500 24px Alegreya, Georgia, serif"; wrapText(g, rule0(R), 84, y + 10, W - 168, 30, 4);
  g.fillStyle = inkOn; g.font = "500 17px 'Alegreya Sans', Arial"; g.fillText("Le grand quiz Commander · contenu de fan non officiel", 60, 1000);
  if (top) { g.textAlign = "right"; g.fillText("Illustration : Scryfall", W - 60, 1000); g.textAlign = "left"; }
  let blob = null; try { blob = await new Promise(r => cv.toBlob(r, "image/png")); } catch (e) { blob = null; }
  if (!blob) { shareMsg("L’illustration n’a pas pu être intégrée ; réessaie, ou crée la carte sans image."); return; }
  const url = URL.createObjectURL(blob); const pv = document.getElementById("cardPreview"); pv.src = url; pv.hidden = false;
  const dl = document.getElementById("cardDl"); dl.href = url; dl.hidden = false;
  const file = new File([blob], "carte-profil-commander.png", { type: "image/png" });
  const sb = document.getElementById("shareCardBtn"); sb.hidden = !(navigator.canShare && navigator.canShare({ files: [file] })); sb._file = file;
  shareMsg(art ? "Ta carte est prête." : "Ta carte est prête, sans illustration (Scryfall n’a pas répondu).");
}
function copySync(t) { const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (e) { } ta.remove(); return ok; }
function openClaude() {
  // Tout se fait sans attente, dans le geste de l'utilisateur : sinon les navigateurs bloquent l'ouverture de l'onglet.
  const ok = copySync(exportText());
  const prompt = "Je vais coller ci-dessous mon profil de joueur Commander (Magic: The Gathering), issu d’un quiz détaillé. Analyse-le en expert, en français : un portrait de joueur, trois commandants argumentés pour moi avec trois cartes clés chacun, une piste hors de ma zone de confort, ce que je dois annoncer avant une partie, et deux cartes pour me protéger de ce que je déteste affronter. Respecte mes couleurs exclues, mon budget et mon bracket. Mon profil :\n\n";
  window.open("https://claude.ai/new?q=" + encodeURIComponent(prompt), "_blank", "noopener");
  shareMsg(ok ? "Ton profil est copié : dans Claude, colle-le (Ctrl+V ou appui long) juste après la consigne." : "Copie le résumé en bas de page, puis colle-le dans Claude après la consigne.");
}
function downloadTxt() { const b = new Blob([exportText()], { type: "text/plain;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "profil-commander" + (S.name ? "-" + norm(S.name).replace(/[^a-z0-9]+/g, "-") : "") + ".txt"; document.body.appendChild(a); a.click(); a.remove(); }

/* ===================== RAIL ET NAVIGATION ===================== */
function updateRail() {
  const R = compute(); document.getElementById("pent").innerHTML = pentSVG(R);
  const id = idSuggest(R); const any = "WUBRG".split("").some(c => R.C[c] > 0);
  document.getElementById("pentCap").textContent = any && id !== null ? `Tendance actuelle : ${NAMES[id] || id}. Plein : ce qui attire. Pointillé : ce que le jeu demande.` : "Ton identité de couleur se dessine au fil de tes réponses.";
  const vs = visSections(); const tot = vs.reduce((s, { s: x }) => s + visQs(x).length, 0); const ans = vs.reduce((s, { s: x }) => s + visQs(x).filter(isAnswered).length, 0);
  const active = !!(S.mode || VIEW);
  document.getElementById("prog").textContent = active && !VIEW ? `${ans} étapes sur ${tot}` : "";
  document.getElementById("navwrap").hidden = !active || !!VIEW;
  document.getElementById("modeline").innerHTML = VIEW ? "" : S.mode ? (S.mode === "d" ? `Parcours découverte. <button class="linkbtn" data-act="mode" data-m="c">Passer au complet</button>` : `Parcours complet. <button class="linkbtn" data-act="mode" data-m="d">Version courte</button>`) : "";
  document.getElementById("nav").innerHTML = active && !VIEW ? vs.map(({ s, i }) => { const n = visQs(s).filter(isAnswered).length, t = visQs(s).length; return `<li class="${n === t ? "full" : ""}"><button data-act="goto" data-s="${i}" aria-current="${S.screen === i}"><span>${s.title}</span><span class="n">${n}/${t}</span></button></li>`; }).join("") + `<li><button data-act="results" aria-current="${S.screen === "results"}"><span>Mon profil</span><span class="n"></span></button></li>` : "";
}
function render() {
  if (VIEW) main.innerHTML = renderResults();
  else if (S.screen === "intro" || !S.mode) main.innerHTML = renderIntro();
  else if (S.screen === "results") main.innerHTML = renderResults();
  else { const vs = visSections(); if (!vs.some(x => x.i === S.screen)) S.screen = vs[0].i; main.innerHTML = renderSection(S.screen); wireSwipe(); }
  rovers(); updateRail(); save(); window.scrollTo(0, 0);
  const t = document.getElementById("secTitle"); if (t) t.focus({ preventScroll: true });
}
function narrow() { return !!(window.matchMedia && window.matchMedia("(max-width: 860px)").matches); }
function go(s) { S.screen = s; if (narrow()) document.getElementById("navwrap").open = false; render(); }
function firstUnanswered() { const vs = visSections(); for (const { s, i } of vs) { if (visQs(s).some(q => !isAnswered(q))) return i; } return vs[vs.length - 1].i; }
function refreshCmdrBlock() { const el = document.getElementById("cmdrBlock"); if (el) el.innerHTML = renderCmdrBlock(compute()); const ex = document.getElementById("export"); if (ex) ex.value = exportText(); }

/* ===================== ÉVÉNEMENTS ===================== */
function flash(qid, msg) { const el = document.getElementById("cnt-" + qid); if (el) { el.textContent = msg; el.classList.add("flash"); } }
function tribeToggle(t) {
  const q = QMAP.tribes; const A = ANS(); let a = A.tribes;
  if (t === "?") { if (a === "?") delete A.tribes; else A.tribes = "?"; return true; }
  let sel = (a && a.sel) ? a.sel.slice() : [];
  if (sel.includes(t)) sel = sel.filter(x => x !== t); else { if (sel.length >= q.max) { flash("tribes", `Maximum ${q.max} : retire un type d’abord.`); return false; } sel.push(t); }
  if (sel.length) A.tribes = { sel }; else delete A.tribes; return true;
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const d = b.dataset, act = d.act, qid = d.q, A = ANS(); let changed = null;
  if (VIEW && !["leaveview", "goto", "results"].includes(act)) { if (act !== "leaveview") return; }
  if (act === "single" || act === "pair") { A[qid] === d.o ? delete A[qid] : A[qid] = d.o; changed = qid; }
  else if (act === "scale") { const v = d.v === "?" ? "?" : +d.v; A[qid] === v ? delete A[qid] : A[qid] = v; changed = qid; }
  else if (act === "grid") { const v = d.v === "?" ? "?" : +d.v; const g = Object.assign({}, A[qid] || {}); g[d.k] === v ? delete g[d.k] : g[d.k] = v; if (Object.keys(g).length) A[qid] = g; else delete A[qid]; changed = qid; }
  else if (act === "multi") {
    const q = QMAP[qid]; let arr = Array.isArray(A[qid]) ? A[qid].slice() : [];
    if (d.o === "?" || d.o === "none") arr = (arr[0] === d.o) ? [] : [d.o];
    else { arr = arr.filter(x => x !== "?" && x !== "none"); if (arr.includes(d.o)) arr = arr.filter(x => x !== d.o); else { if (arr.length >= q.max) { flash(qid, `Maximum ${q.max} : retire un choix d’abord.`); return; } arr.push(d.o); } }
    if (arr.length) A[qid] = arr; else delete A[qid]; changed = qid;
  }
  else if (act === "tribe") { if (!tribeToggle(d.t)) return; changed = "tribes"; }
  else if (act === "tribeadd") {
    const v = (document.getElementById("tsearch").value || "").trim(); const fr = TRIBE_CHIPS.find(x => norm(x[0]) === norm(v));
    const m = fr ? fr[1] : TYPEDATA.types.find(t => t.toLowerCase() === v.toLowerCase());
    if (!m) { flash("tribes", v ? `« ${v} » n’est pas un type de créature connu.` : "Tape un type de créature."); return; }
    if (!tribeToggle(m)) return; changed = "tribes";
  }
  else if (act === "sw") { swipeReact(+d.v); return; }
  else if (act === "swundo") { const o = (A.swipeOrder || []).slice(); const last = o.pop(); if (!last) return; A.swipeOrder = o; A.swipe = Object.assign({}, A.swipe); delete A.swipe[last]; A.swipeCur = last; delete A.swipeDone; changed = "swipe"; }
  else if (act === "swdone") { A.swipeDone = true; delete A.swipeCur; changed = "swipe"; }
  else if (act === "swmore") { A.swipeExtra = (A.swipeExtra || 0) + 10; delete A.swipeDone; changed = "swipe"; }
  else if (act === "swreset") { if (!window.confirm("Effacer tes réactions aux cartes ?")) return; delete A.swipe; delete A.swipeOrder; delete A.swipeCur; delete A.swipeDone; delete A.swipeExtra; changed = "swipe"; }
  else if (act === "own") { const s = new Set(A.ownedC || []); s.has(d.n) ? s.delete(d.n) : s.add(d.n); A.ownedC = [...s]; delete A.collNone; document.getElementById("cands").innerHTML = renderCands(); save(); updateRail(); return; }
  else if (act === "collnone") { A.collNone = !A.collNone; changed = "collection"; }
  else if (act === "deckscan") { await deckScan(); return; }
  else if (act === "deckdel") { const arr = (A.decks || []).slice(); arr.splice(+d.i, 1); A.decks = arr; changed = "collection"; }
  else if (act === "duel") { A.duels = [...(A.duels || []), [d.a, d.b, d.w]]; save(); refreshCmdrBlock(); return; }
  else if (act === "duelskip") { A.duelSkip = true; save(); refreshCmdrBlock(); return; }
  else if (act === "duelreset") { delete A.duels; delete A.duelSkip; save(); refreshCmdrBlock(); return; }
  else if (act === "vote") { const v = Object.assign({}, A.votes || {}); const val = +d.v; v[d.n] === val ? delete v[d.n] : v[d.n] = val; A.votes = v; save(); refreshCmdrBlock(); return; }
  else if (act === "mode") { S.mode = d.m === "v" ? "c" : d.m; S.vet = d.m === "v"; MAXCACHE = {}; save(); if (S.screen === "intro" || S.screen === "results" || typeof S.screen !== "number") return go(firstUnanswered()); return render(); }
  else if (act === "resume") return go(firstUnanswered());
  else if (act === "home") return go("intro");
  else if (act === "goto") return go(+d.s);
  else if (act === "results") return go("results");
  else if (act === "leaveview") { VIEW = null; MAXCACHE = {}; history.replaceState(null, "", location.pathname); return render(); }
  else if (act === "reset") { if (window.confirm("Effacer toutes tes réponses ?")) { S.answers = {}; S.mode = null; S.vet = false; S.seed = Math.floor(Math.random() * 1e9); MAXCACHE = {}; go("intro"); } return; }
  else if (act === "copy") { const ok = await copyText(document.getElementById("export").value); document.getElementById("copied").textContent = ok ? "Résumé copié." : "Sélectionne le texte et copie-le."; return; }
  else if (act === "mklink") { await makeLink(); return; }
  else if (act === "copylink") { const ok = await copyText(document.getElementById("linkOut").value); shareMsg(ok ? "Lien copié." : "Sélectionne le lien et copie-le."); return; }
  else if (act === "sharelink") { try { await navigator.share({ title: "Mon profil Commander", url: document.getElementById("linkOut").value }); } catch (err) { } return; }
  else if (act === "mkcard") { await makeCard(); return; }
  else if (act === "sharecard") { try { await navigator.share({ files: [b._file], title: "Ma carte-profil Commander" }); } catch (err) { } return; }
  else if (act === "claude") { openClaude(); return; }
  else if (act === "dltxt") { downloadTxt(); return; }
  else if (act === "print") { window.print(); return; }
  else return;
  if (changed) rerenderQ(changed, selOf(b));
  save(); updateRail();
});
document.addEventListener("input", e => {
  const t = e.target; if (VIEW) return;
  if (t.matches("textarea[data-q]")) { const id = t.dataset.q; if (t.value.trim()) S.answers[id] = t.value; else delete S.answers[id]; save(); if (!id.startsWith("fb_")) updateRail(); }
  else if (t.matches("input[data-other]")) { const id = t.dataset.other + "__other"; if (t.value.trim()) S.answers[id] = t.value; else delete S.answers[id]; save(); }
  else if (t.matches('textarea[data-coll="names"]')) {
    S.answers.decksText = t.value; const own = new Set(S.answers.ownedC || []);
    ownedCandidates(t.value).forEach(({ n, sure }) => { if (sure) own.add(n); }); S.answers.ownedC = [...own]; delete S.answers.collNone;
    document.getElementById("cands").innerHTML = renderCands(); save(); updateRail();
  }
  else if (t.id === "pname") { S.name = t.value.slice(0, 40); save(); const ex = document.getElementById("export"); if (ex) ex.value = exportText(); }
});
document.addEventListener("keydown", e => {
  const t = e.target;
  if (t.id === "tsearch" && e.key === "Enter") { e.preventDefault(); document.querySelector('[data-act="tribeadd"]').click(); return; }
  if (document.getElementById("scard") && !t.matches("input,textarea")) {
    if (e.key === "ArrowRight") { e.preventDefault(); return swipeReact(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); return swipeReact(-1); }
    if (e.key === "ArrowDown") { e.preventDefault(); return swipeReact(0); }
  }
  if (!t.matches || !t.matches('[role="radio"]')) return;
  const g = t.closest('[role="radiogroup"]'); if (!g) return; const rs = [...g.querySelectorAll('[role="radio"]')]; const i = rs.indexOf(t);
  let target = null;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") target = rs[(i + 1) % rs.length];
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") target = rs[(i - 1 + rs.length) % rs.length];
  else if (/^[1-9]$/.test(e.key)) { const plain = rs.filter(r => r.dataset.o !== "?" && r.dataset.v !== "?"); target = plain[+e.key - 1] || null; }
  else if (e.key === "0" || e.key === "?") target = rs.find(r => r.dataset.o === "?" || r.dataset.v === "?") || null;
  if (target) { e.preventDefault(); target.click(); }
});

/* ===================== DÉMARRAGE ===================== */
(async function boot() {
  load();
  try { await loadData(); }
  catch (e) {
    main.innerHTML = `<h2>Données introuvables</h2><p>Le site n’a pas pu charger ses fichiers de données (${esc(e.message)}). Si tu l’as ouvert directement depuis ton disque, lance plutôt un petit serveur local (voir le fichier LISEZ-MOI), ou ouvre la version en ligne.</p>`;
    return;
  }
  if (location.hash.startsWith("#p=")) {
    try { const o = await decodeProfile(location.hash.slice(3)); VIEW = { nm: o.nm, m: o.m || "c", vet: !!o.vet, a: o.a }; MAXCACHE = {}; }
    catch (e) { VIEW = null; main.innerHTML = `<div class="banner"><span>Ce lien de profil est illisible ou incomplet.</span></div>`; }
  }
  if (narrow()) document.getElementById("navwrap").open = false;
  render();
})();
