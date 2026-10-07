#!/usr/bin/env node
/* Audit de structure du quiz (docs/moteur.md §7.1), à relancer après chaque modification de moteur/questions.js.
   Pour chaque mode : information disponible par dimension, couverture des styles, poids des questions, couleurs nommées.
   Code de sortie 1 si une règle est violée. */
const { QC } = require("./tests/charger");
const R = QC.R;
let echecs = 0;
const fail = m => { echecs++; console.log("   ÉCHEC : " + m); };
const MOTS_COULEUR = /\b(blanc|blanche|bleu|bleue|noir|noire|rouge|vert|verte|incolore)s?\b/i;

function information(q) { // {dimension: poids d'information maximal apporté par la question}
  const f = q.fiab === undefined ? 1 : q.fiab, out = {};
  const add = (d, w) => { out[d] = (out[d] || 0) + w; };
  if (q.type === "choix" || q.type === "dilemme") {
    const dims = new Set(); q.options.forEach(o => Object.keys(o.e).forEach(d => dims.add(d)));
    dims.forEach(d => { const v = q.options.map(o => o.e[d] || 0); const r = Math.max(...v) - Math.min(...v); if (r > 0) add(d, f * r); });
  } else if (q.type === "multi" || q.type === "plans") {
    q.options.forEach(o => { for (const d in o.e) add(d, f * Math.abs(o.e[d]) * ((q.max || 1) / q.options.length + R.multiNonCoche * (1 - (q.max || 1) / q.options.length))); });
  } else if (q.type === "echelle") { for (const d in q.e) add(d, f * Math.abs(q.e[d])); }
  else if (q.type === "grille") q.items.forEach(k => add("a." + k, R.grilleStyle));
  else if (q.type === "tribus") { add("a.kindred", R.tribuStyle); QC.COULEURS.forEach(c => add("c." + c, R.tribuCouleur / 2)); }
  return out;
}

for (const mode of ["commun", "confirme"]) {
  const qs = QC.questionsDuMode(mode);
  console.log(`\n=== Mode ${mode === "commun" ? "découverte" : "confirmé"} : ${qs.length} questions ===`);
  const info = {}, sources = {}, poidsQ = [];
  qs.forEach(q => {
    const inf = information(q);
    let mx = 0;
    for (const d in inf) { info[d] = (info[d] || 0) + inf[d]; (sources[d] = sources[d] || []).push(q.id); mx = Math.max(mx, inf[d]); }
    if (mx) poidsQ.push([q.id, mx]);
    // aucune couleur nommée hors des questions de couleur
    if (q.type !== "couleurs" && q.type !== "paires") {
      const textes = [q.q, q.help, q.gauche, q.droite, ...(q.options || []).flatMap(o => [o.l, o.d])].filter(Boolean);
      textes.forEach(t => { if (MOTS_COULEUR.test(t)) fail(`la question « ${q.id} » nomme une couleur : « ${t} »`); });
    }
  });
  // couverture des styles
  QC.STYLES.forEach(k => { const n = (sources["a." + k] || []).length; if (n < 3) fail(`le style ${k} n'a que ${n} source(s) : ${(sources["a." + k] || []).join(", ")}`); });
  const st = QC.STYLES.map(k => [k, (sources["a." + k] || []).length, info["a." + k] || 0]).sort((a, b) => a[2] - b[2]);
  console.log("   styles les moins informés :", st.slice(0, 5).map(([k, n, w]) => `${k} (${n} q., ${w.toFixed(1)})`).join(" · "));
  console.log("   styles les plus informés  :", st.slice(-3).map(([k, n, w]) => `${k} (${n} q., ${w.toFixed(1)})`).join(" · "));
  // équilibre des couleurs révélées
  const ci = QC.COULEURS.map(c => [c, info["c." + c] || 0]);
  const m = ci.reduce((s, [, w]) => s + w, 0) / ci.length;
  console.log("   information sur les couleurs révélées :", ci.map(([c, w]) => `${c} ${w.toFixed(2)}`).join(" · "));
  ci.forEach(([c, w]) => { if (w < .6 * m || w > 1.4 * m) fail(`la couleur ${c} est ${w < m ? "sous" : "sur"}-informée (${w.toFixed(2)} pour une moyenne de ${m.toFixed(2)})`); });
  // psychologie
  console.log("   information psychologique :", QC.PSY.map(k => `${k} ${(info["p." + k] || 0).toFixed(1)}`).join(" · "));
  // aucune question ne pèse trop
  const med = poidsQ.map(x => x[1]).sort((a, b) => a - b)[Math.floor(poidsQ.length / 2)];
  poidsQ.filter(([, w]) => w > 2.5 * med).forEach(([id, w]) => fail(`la question « ${id} » pèse ${w.toFixed(2)}, plus de 2,5 fois la médiane (${med.toFixed(2)})`));
  // questions qui ne mesurent rien (hors réglages et contexte)
  qs.filter(q => !Object.keys(information(q)).length && !["couleurs", "paires", "cartes", "aversions", "collection", "texte"].includes(q.type) &&
    !(q.options || []).some(o => o.set) && !q.set).forEach(q => fail(`la question « ${q.id} » ne mesure rien`));
}
console.log(echecs ? `\n${echecs} problème(s).` : "\nAudit réussi : le quiz est équilibré dans les deux modes.");
process.exit(echecs ? 1 : 0);
