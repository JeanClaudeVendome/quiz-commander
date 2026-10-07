#!/usr/bin/env node
/* Tests du moteur v4 (docs/moteur.md §7.2 et 7.3).
   node scripts/tests/lancer.js            → tout
   node scripts/tests/lancer.js profils    → joueurs tests seulement (détail des propositions)
   node scripts/tests/lancer.js aimants    → joueurs aléatoires seulement
   node scripts/tests/lancer.js traductions → chaque texte a son anglais (site/en.js)
   Code de sortie 1 si une attente échoue : la tâche GitHub ne publie pas. */
const { QC, chargerCatalogue } = require("./charger");
const PROFILS = require("./profils");
const quoi = process.argv[2] || "tout";
const verbeux = process.argv.includes("-v");
chargerCatalogue();
let echecs = 0;
const ord = ci => "WUBRG".split("").filter(c => (ci || "").includes(c)).join("") || "C";

/* ---------- 1. Joueurs tests ---------- */
if (quoi === "tout" || quoi === "profils") {
  console.log("=== JOUEURS TESTS ===");
  PROFILS.forEach(pf => {
    const P = QC.mesurer(pf.a, pf.mode);
    const res = QC.proposer(P, { n: 10 });
    const top = res.classement;
    const r = pf.attentes(top);
    const ok = r.every(([v]) => v);
    if (!ok) echecs++;
    console.log(`\n${ok ? "✔" : "✘"} ${pf.nom} [${pf.mode}]`);
    const C = P.couleurs.final;
    console.log(`   couleurs ${QC.COULEURS.map(c => c + Math.round(C[c] * 100)).join(" ")} · styles ${P.topStyles.slice(0, 4).map(k => k + " " + P.styles[k].toFixed(2)).join(", ")} · motivation ${Object.entries(P.motivation).map(([k, v]) => k + " " + Math.round(v * 100) + "%").join(", ")}`);
    r.forEach(([v, m]) => console.log(`   ${v ? "  ok" : "  ÉCHEC"} : ${m}`));
    if (verbeux || !ok) top.forEach((x, i) => console.log(`   ${String(i + 1).padStart(2)}. ${x.c.n} [${ord(x.c.ci)}] ${x.pct}% · ${(x.c.t || []).join("/")} · p${(x.c.p || 0).toFixed(1)} x${(x.c.x || 0).toFixed(1)} pp${(x.c.pp || 0).toFixed(2)}${x.c.usd != null ? " " + x.c.usd + "$" : ""}${x.c.ub ? " UB" : ""}` +
      (verbeux ? `\n        style ${x.parts.style.toFixed(2)} couleur ${x.parts.couleur.toFixed(2)} thème ${x.parts.theme.toFixed(2)} psy ${x.parts.psy.toFixed(2)} · ${x.pourquoi.join(" ; ")}${x.attention.length ? " · ⚠ " + x.attention.join(" ; ") : ""}` : "")));
    if (verbeux) for (const f in res.familles) console.log(`   ${f} : ${res.familles[f].map(x => x.c.n).join(" | ") || "(vide)"}`);
    for (const f in res.familles) if (!res.familles[f].length) { console.log(`   ÉCHEC : la famille « ${f} » est vide`); echecs++; }
  });
}

/* ---------- 2. Joueurs aléatoires : commandants aimants et équilibre des couleurs ---------- */
if (quoi === "tout" || quoi === "aimants") {
  const N = +(process.env.N || 1500);
  console.log(`\n=== ${N} JOUEURS ALÉATOIRES ===`);
  // générateur mulberry32 (reproductible ; un générateur congruentiel naïf dépasse la précision des nombres JS et boucle)
  let seed = 12345; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const freq = {}, colFreq = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, horsGout = {}, coh = { style: 0, couleur: 0, deux: 0 }; let total = 0, dbg = 0; const hasard = { style: 0, couleur: 0, n: 0 };
  const oeilPool = QC.D.cards.filter(c => (c.pp || 0) > .85).map(c => c.n);
  /* Joueurs simulés COHÉRENTS : deux styles et une à trois couleurs préférés, des réponses alignées sur ces goûts
     (70 %) ou au hasard (30 %). Des réponses entièrement aléatoires se compensent et donnent toutes un profil « moyen ». */
  for (let i = 0; i < N; i++) {
    const mode = rnd() < .5 ? "commun" : "confirme", A = {};
    const favS = [pick(QC.STYLES), pick(QC.STYLES)], favC = [...new Set(Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => pick(QC.COULEURS)))];
    const affinite = e => Object.entries(e || {}).reduce((s, [d, v]) => s + v * ((favS.includes(d.slice(2)) || favC.includes(d.slice(2))) ? 1 : 0), 0) + rnd() * .3;
    const meilleur = opts => opts.slice().sort((a, b) => affinite(b.e) - affinite(a.e))[0];
    QC.questionsDuMode(mode).forEach(q => {
      if (rnd() < .08) return; // quelques questions sautées
      const coh = rnd() < .7;
      if (q.type === "choix" || q.type === "dilemme") A[q.id] = (coh ? meilleur(q.options) : pick(q.options)).id;
      else if (q.type === "multi" || q.type === "plans") {
        const k = 1 + Math.floor(rnd() * (q.max || 2));
        A[q.id] = coh ? q.options.slice().sort((a, b) => affinite(b.e) - affinite(a.e)).slice(0, k).map(o => o.id) : [...new Set(Array.from({ length: k }, () => pick(q.options).id))];
      }
      else if (q.type === "paires") A[q.id] = coh ? q.options.filter(o => o.id.split("").some(c => favC.includes(c))).slice(0, 2).map(o => o.id) : [pick(q.options).id];
      else if (q.type === "echelle") A[q.id] = coh ? (affinite(q.e) > .3 ? 4 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 3)) : 1 + Math.floor(rnd() * 5);
      else if (q.type === "grille") A[q.id] = Object.fromEntries(q.items.map(k => [k, favS.includes(k) ? 3 : Math.floor(rnd() * 3)]));
      else if (q.type === "couleurs") A[q.id] = Object.fromEntries(QC.COULEURS.map(c => [c, favC.includes(c) ? 3 : Math.floor(rnd() * 3)]));
      else if (q.type === "tribus") A[q.id] = rnd() < .4 ? [pick(Object.keys(QC.D.typeColor))] : [];
      else if (q.type === "cartes") A[q.id] = Object.fromEntries(Array.from({ length: 8 }, () => {
        const n = pick(oeilPool), c = QC.D.byName[n], o = ord(c.ci);
        const plait = (c.t || []).some(k => favS.includes(k)) + (o === "C" ? favC.includes("C") : o.split("").every(x => favC.includes(x)));
        return [n, rnd() < .7 ? [0, .5, 1][plait] : pick([0, .5, 1])];
      }));
    });
    // Ce qui « plaît » au joueur simulé : un de ses styles est bien présent ; toutes les couleurs sont notées « Bien » ou « J'adore »
    const g = A.couleurs || {};
    const plaitStyle = c => favS.some(k => (c.s && c.s[k] || 0) >= .45);
    const plaitCouleur = c => { const o = ord(c.ci); return (o === "C" ? ["C"] : o.split("")).every(x => g[x] === undefined || g[x] >= 2); };
    // Référence : la même mesure pour 10 commandants tirés au hasard dans le catalogue
    for (let j = 0; j < 10; j++) { const c = pick(QC.D.cards); hasard.style += plaitStyle(c); hasard.couleur += plaitCouleur(c); hasard.n++; }
    const top = QC.proposer(QC.mesurer(A, mode), { n: 10 }).classement;
    top.forEach(x => {
      freq[x.c.n] = (freq[x.c.n] || 0) + 1; total++;
      const o = ord(x.c.ci); (o === "C" ? ["C"] : o.split("")).forEach(c => colFreq[c]++);
      const styleOK = plaitStyle(x.c), colOK = plaitCouleur(x.c);
      coh.style += styleOK; coh.couleur += colOK; coh.deux += styleOK && colOK;
      if (!styleOK && !colOK) horsGout[x.c.n] = (horsGout[x.c.n] || 0) + 1;
      if (process.env.DEBUG_NOM === x.c.n && !styleOK && !colOK && !dbg++) {
        const P = QC.mesurer(A, mode);
        console.log(`   [debug] goûts simulés : styles ${favS} couleurs ${favC} · mode ${mode}`);
        console.log(`   [debug] profil : couleurs ${QC.COULEURS.map(c => c + Math.round(P.couleurs.final[c] * 100)).join(" ")} · styles ${P.topStyles.slice(0, 5).map(k => k + " " + P.styles[k].toFixed(2))} · fiab ${JSON.stringify(P.fiab)} · set ${JSON.stringify(P.set)}`);
        console.log(`   [debug] ${x.c.n} [${o}] t ${x.c.t} p ${x.c.p} · parts ${JSON.stringify(x.parts)} · poids ${JSON.stringify(x.poids)} · mult ${x.mult.map(m => m[0] + " " + m[1].toFixed(2))}`);
        console.log(`   [debug] top : ${top.map(y => y.c.n + " [" + ord(y.c.ci) + "] " + y.note.toFixed(3)).join(" | ")}`);
      }
    });
  }
  const aimants = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  console.log("   les 10 plus fréquents :", aimants.slice(0, 10).map(([n, f]) => `${n} ${(100 * f / N).toFixed(1)}%`).join(" | "));
  console.log(`   commandants différents proposés : ${aimants.length}`);
  const pc = v => (100 * v / total).toFixed(0) + " %", ph = v => (100 * v / hasard.n).toFixed(0) + " %";
  console.log(`   précision du moteur : style aimé ${pc(coh.style)} · couleurs acceptées ${pc(coh.couleur)} · les deux ${pc(coh.deux)}`);
  console.log(`   au hasard (référence) : style aimé ${ph(hasard.style)} · couleurs acceptées ${ph(hasard.couleur)}`);
  if (coh.couleur / total < .8) { echecs++; console.log("   ÉCHEC : moins de 80 % des propositions dans des couleurs acceptées"); }
  if (coh.style / total < 2.5 * hasard.style / hasard.n) { echecs++; console.log("   ÉCHEC : le style aimé n'est pas au moins 2,5 fois plus fréquent qu'au hasard"); }
  // Un aimant : proposé à plus de 2 % des joueurs alors qu'il ne correspond NI à leurs styles NI à leurs couleurs
  // Seuils : avertissement au-delà de 2 %, échec au-delà de 3 % (les données changent chaque semaine : marge contre les faux échecs)
  const hors = Object.entries(horsGout).sort((a, b) => b[1] - a[1]), fmt = l => l.slice(0, 8).map(([n, f]) => n + " " + (100 * f / N).toFixed(1) + "%").join(" | ");
  const trop = hors.filter(([, f]) => f > .03 * N), limite = hors.filter(([, f]) => f > .02 * N && f <= .03 * N);
  if (trop.length) { echecs++; console.log(`   ÉCHEC : aimants (proposés hors goûts à plus de 3 % des joueurs) : ${fmt(trop)}`); }
  else console.log("   ok : aucun commandant aimant (proposé hors goûts à plus de 3 % des joueurs)");
  if (limite.length) console.log(`   à surveiller (entre 2 et 3 %) : ${fmt(limite)}`);
  const sc = Object.values(colFreq).reduce((s, x) => s + x, 0);
  console.log("   part de chaque couleur dans les propositions :", Object.entries(colFreq).map(([c, f]) => `${c} ${(100 * f / sc).toFixed(1)}%`).join(" · "));
  const wubrg = "WUBRG".split("").map(c => colFreq[c] / sc);
  if (Math.max(...wubrg) / Math.min(...wubrg) > 1.6) { echecs++; console.log("   ÉCHEC : une couleur est favorisée (écart > 1,6×)"); } else console.log("   ok : les cinq couleurs sont équilibrées (écart ≤ 1,6×)");
}

/* ---------- 3. Stabilité ---------- */
if (quoi === "tout" || quoi === "stabilite") {
  console.log("\n=== STABILITÉ ===");
  const base = PROFILS.find(p => p.id === "confirmee");
  const top3 = a => QC.proposer(QC.mesurer(a, base.mode), { n: 3 }).classement.map(x => x.c.n);
  const t0 = top3(base.a);
  const t1 = top3(Object.assign({}, base.a, { carte: "v" }));
  const t2 = top3(Object.assign({}, base.a, { couleurs: { W: 3, U: 3, B: 0, R: 1, G: 1, C: 1, star: "U" }, paires: ["WU"] }));
  const inter = (a, b) => a.filter(x => b.includes(x)).length;
  const okA = inter(t0, t1) >= 2, okB = inter(t0, t2) <= 1;
  if (!okA) echecs++; if (!okB) echecs++;
  console.log(`   ${okA ? "ok" : "ÉCHEC"} : une réponse secondaire changée garde au moins 2 du top 3 (${inter(t0, t1)}/3)`);
  console.log(`   ${okB ? "ok" : "ÉCHEC"} : changer complètement de couleurs change le top 3 (${3 - inter(t0, t2)}/3 changés)`);
}

/* ---------- 4. Traductions : chaque texte du quiz et du moteur a son anglais (site/en.js), avec les mêmes {variables} ---------- */
if (quoi === "tout" || quoi === "traductions") {
  console.log("\n=== TRADUCTIONS ===");
  const fs = require("fs"), path = require("path"), { ROOT } = require("./charger");
  const norm = s => String(s).replace(/\s+/g, " ").trim();
  const EN = new Map();
  globalThis.I18N = { ajouter: o => { for (const k in o) EN.set(norm(k), o[k]); } };
  require(path.join(ROOT, "site", "en.js"));
  const textes = new Set();
  QC.CHAPITRES.forEach(c => [c.titre, c.intro].forEach(x => textes.add(x)));
  QC.QUESTIONS.forEach(q => {
    [q.q, q.help, q.gauche, q.droite].forEach(x => x && textes.add(x));
    if (q.type !== "paires") (q.options || []).forEach(o => [o.l, o.d].forEach(x => x && textes.add(x)));
  });
  [QC.PERSONNAGES, QC.NOMS_STYLES, QC.NOMS_COULEURS].forEach(o => Object.values(o).forEach(x => textes.add(x)));
  Object.values(QC.AVERSIONS).forEach(a => textes.add(a.l));
  // textes passés à la traduction dans le code : QC.T("…"), t("…"), tr("…")
  const code = ["moteur/match.js", "moteur/propositions.js", "site/commun.js", "site/quiz.js", "site/profil.js", "site/groupe.js", "site/stockage.js",
    "index.html", "qui.html", "joueurs.html", "devine.html"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
  for (const m of code.matchAll(/\b(?:QC\.T|tr|t)\("((?:[^"\\]|\\.)+)"/g)) textes.add(m[1].replace(/\\"/g, '"'));
  const vars = s => (String(s).match(/\{\w+\}/g) || []).sort().join(",");
  const sansEn = [...textes].filter(x => norm(x) && !EN.has(norm(x)));
  const malVar = [...textes].filter(x => EN.has(norm(x)) && vars(x) !== vars(EN.get(norm(x))));
  if (sansEn.length || malVar.length) echecs++;
  console.log(`   ${sansEn.length ? "ÉCHEC" : "ok"} : ${textes.size} textes, ${sansEn.length} sans traduction anglaise${sansEn.length ? " :\n     " + sansEn.join("\n     ") : ""}`);
  console.log(`   ${malVar.length ? "ÉCHEC" : "ok"} : variables identiques en français et en anglais${malVar.length ? " :\n     " + malVar.join("\n     ") : ""}`);
}

console.log(echecs ? `\n${echecs} échec(s).` : "\nTous les tests passent.");
process.exit(echecs ? 1 : 0);
