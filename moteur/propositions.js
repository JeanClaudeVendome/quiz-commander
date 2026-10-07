/* =====================================================================
   Le grand quiz Commander — moteur v4 : propositions (docs/moteur.md §5.4 et 5.5) et groupe (§6).

   QC.proposer(profil, {n}) → { classement, familles: {sur, surprise, horsZone}, pourcentages }
   QC.compatibilite(profilA, profilB) → { pct, communs, oppositions }
   ===================================================================== */
(function (QC) {
  "use strict";
  const R = () => QC.R;
  const ordC = ci => "WUBRG".split("").filter(c => (ci || "").includes(c)).join("");

  /* Ressemblance entre deux commandants (pour la diversité) */
  function ressemblance(a, b) {
    let s = 0;
    if (a.t && b.t && a.t[0] && a.t[0] === b.t[0]) s += .45;
    if (ordC(a.ci) === ordC(b.ci)) s += .35;
    if ((a.k || []).some(k => (b.k || []).includes(k) && (a.t || []).includes("kindred"))) s += .2;
    return Math.min(1, s);
  }

  /* Sélection diversifiée (MMR) : chaque nouveau choix équilibre note et différence avec les choix précédents */
  function diversifier(liste, n, lambda, deja) {
    const out = [], pris = (deja || []).slice();
    const pool = liste.slice(0, Math.max(60, n * 10));
    while (out.length < n && pool.length) {
      let best = -1, bi = 0;
      pool.forEach((x, i) => {
        const sim = pris.length ? Math.max(...pris.map(p => ressemblance(x.c, p.c))) : 0;
        const v = lambda * x.rel - (1 - lambda) * sim;
        if (v > best) { best = v; bi = i; }
      });
      const x = pool.splice(bi, 1)[0];
      out.push(x); pris.push(x);
    }
    return out;
  }

  QC.proposer = function (P, opts) {
    opts = opts || {};
    const n = opts.n || 12, D = QC.D;
    const all = [];
    D.cards.forEach(c => { const x = QC.noter(P, c); if (x) all.push(x); });
    all.sort((a, b) => b.note - a.note);
    // Pourcentage affiché : rang dans le catalogue (99 = meilleur 1 %), plus parlant qu'une note brute
    const N = all.length, top = all[0] ? all[0].note : 1;
    all.forEach((x, i) => { x.rang = i + 1; x.pct = Math.round(100 * (1 - i / N) * .6 + 40 * (x.note / top)); x.rel = x.note / top; });

    const topCols = P.ordreCouleurs.filter(c => c !== "C").slice(0, 3);
    const topStyles = P.topStyles.slice(0, 3);
    const inTop = x => ordC(x.c.ci).split("").filter(Boolean).every(c => topCols.includes(c)) || (!ordC(x.c.ci) && P.couleurs.final.C >= .55);

    const sur = diversifier(all.filter(x => !x.drapeaux.jamais && inTop(x) && (x.c.sc || 0) >= .45), R().parFamille, R().diversite);
    const prisSur = new Set(sur.map(x => x.c.n));
    const surprise = diversifier(all.filter(x => !prisSur.has(x.c.n) && !x.drapeaux.jamais && x.parts.style >= .6 &&
      ((x.c.pp || 0) < .5 || !topStyles.includes((x.c.t || [])[0]) || !inTop(x))), R().parFamille, R().diversite, sur);
    const prisS = new Set([...prisSur, ...surprise.map(x => x.c.n)]);
    const hors = all.filter(x => !prisS.has(x.c.n) && x.parts.psy >= .5 &&
      (!topStyles.includes((x.c.t || [])[0]) || !inTop(x)))
      .map(x => Object.assign({}, x, { rel: (x.parts.psy * .5 + x.parts.theme * .3 + x.parts.style * .2) }))
      .sort((a, b) => b.rel - a.rel);
    const horsZone = diversifier(hors, R().parFamille, R().diversite, [...sur, ...surprise]);

    return { classement: diversifier(all, n, R().diversite), tous: all, familles: { sur, surprise, horsZone } };
  };

  /* ---------- Groupe (§6) ---------- */
  QC.compatibilite = function (A, B) {
    const ca = A.couleurs.final, cb = B.couleurs.final;
    const col = 1 - QC.COULEURS.reduce((s, c) => s + Math.abs(ca[c] - cb[c]), 0) / 6;
    const va = QC.STYLES.map(k => A.styles[k]), vb = QC.STYLES.map(k => B.styles[k]);
    const ma = va.reduce((s, x) => s + x, 0) / va.length, mb = vb.reduce((s, x) => s + x, 0) / vb.length;
    let dot = 0, na = 0, nb = 0;
    va.forEach((x, i) => { const a = x - ma, b = vb[i] - mb; dot += a * b; na += a * a; nb += b * b; });
    const sty = na && nb ? (dot / Math.sqrt(na * nb) + 1) / 2 : .5;
    const mot = 1 - .5 * ["timmy", "johnny", "spike"].reduce((s, k) => s + Math.abs(A.motivation[k] - B.motivation[k]), 0);
    const pct = Math.round(100 * (.4 * col + .4 * sty + .2 * mot));
    const communs = [], oppo = [];
    QC.COULEURS.forEach(c => { if (ca[c] > .62 && cb[c] > .62) communs.push(QC.T("vous partagez {c}", { c: QC.NOMS_COULEURS[c] })); });
    QC.STYLES.forEach(k => { if (A.styles[k] > .35 && B.styles[k] > .35) communs.push(QC.T("vous aimez tous les deux {s}", { s: QC.NOMS_STYLES[k] })); });
    QC.COULEURS.map(c => [c, ca[c] - cb[c]]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 2)
      .forEach(([c, d]) => { if (Math.abs(d) > .25) oppo.push({ c, plus: d > 0 ? "A" : "B" }); });
    return { pct, couleurs: col, styles: sty, motivation: mot, communs: communs.slice(0, 5), oppositions: oppo };
  };
})(typeof module !== "undefined" ? (globalThis.QC = globalThis.QC || {}) : (window.QC = window.QC || {}));
