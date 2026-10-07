/* =====================================================================
   Le grand quiz Commander — moteur v4 : profil × commandant → note détaillée (docs/moteur.md §5.1 à 5.3).

   QC.noter(profil, commandant) → null (exclu) ou { c, note, parts, poids, mult: [[facteur, valeur, raison]], pourquoi, attention, drapeaux }
   ===================================================================== */
(function (QC) {
  "use strict";
  const R = () => QC.R;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ordC = ci => "WUBRG".split("").filter(c => (ci || "").includes(c)).join("");
  const nomStyle = k => QC.NOMS_STYLES[k] || k;

  /* Le profil psychologique d'un commandant, déduit de ses données */
  function psyCommandant(c) {
    const s = c.s || {}, x = ((c.x || 2) - 1) / 4, p = ((c.p || 2) - 1) / 4, pp = c.pp || 0;
    return {
      timmy: clamp(.6 * Math.max(s.big || 0, s.voltron || 0, s.aggro || 0, s.tokens || 0, s.chaos || 0) + .4 * pp, 0, 1),
      johnny: clamp(.5 * Math.max(s.combo || 0, s.chaos || 0, s.theft || 0, s.spells || 0, s.blink || 0) + .3 * (1 - pp) + .2 * x, 0, 1),
      spike: clamp(.65 * p + .35 * Math.max(s.control || 0, s.combo || 0, s.stax || 0), 0, 1),
      mel: clamp(.55 * x + .45 * Math.max(s.combo || 0, s.spells || 0, s.artifacts || 0, s.counters || 0, s.blink || 0), 0, 1)
    };
  }
  QC.psyCommandant = psyCommandant;

  QC.noter = function (P, c) {
    const S = P.set, why = [], warn = [], mult = [], drapeaux = {};
    // ---------- exclusions ----------
    if (P.possedes.includes(c.n) || P.rejetes.includes(c.n)) return null;
    if (c.ub && S.ub === -1) return null;
    const cols = ordC(c.ci).split("").filter(Boolean);

    // ---------- style ----------
    const s = c.s || {};
    let num = 0, den = 0, rejet = 1;
    const contrib = [];
    for (const k in s) {
      if (s[k] < .1) continue;
      const u = (P.styles[k] + 1) / 2;
      num += s[k] * u; den += s[k];
      contrib.push([k, s[k], u]);
      if (P.stylesRejetes.includes(k) && s[k] >= R().aversionSeuil) rejet *= (1 - R().aversionForce * s[k]);
    }
    // Sans donnée de style (≈ 7 % du catalogue), le commandant n'est pas « neutre » : on ne sait pas, on reste prudent
    const connu = den >= R().styleConnu;
    let fStyle = connu ? num / den : R().styleInconnu;
    if (connu) fStyle = .5 + (fStyle - .5) * R().contrasteStyle * (.6 + .4 * (c.sc || .5)); // données peu sûres : on reste prudent
    fStyle = clamp(fStyle, 0, 1) * rejet;
    if (P.stylesRejetes.includes("combo") && c.cb && (c.cb.bp === "R" || c.cb.bp === "S")) {
      fStyle *= R().comboRejete;
      warn.push(QC.T("des combos rapides existent avec lui, même si tu peux le jouer sans"));
    }
    contrib.sort((a, b) => b[1] * b[2] - a[1] * a[2]);
    const bons = contrib.filter(([k, sv, u]) => u >= .66 && sv >= .4).slice(0, 2).map(([k]) => nomStyle(k));
    if (bons.length) why.push(QC.T("colle à ton goût pour {s}", { s: bons.join(QC.T(" et ")) }));
    const mauvais = contrib.filter(([k, sv, u]) => u <= .35 && sv >= .5).sort((a, b) => a[2] - b[2])[0];
    if (mauvais) warn.push(QC.T("repose sur {s}, que tu aimes peu", { s: nomStyle(mauvais[0]) }));

    // ---------- couleur ----------
    const F = P.couleurs.final;
    let fCol;
    if (!cols.length) fCol = F.C * R().incolore; // un deck incolore ne joue AUCUNE carte colorée : la contrainte la plus forte
    else {
      const vals = cols.map(x => F[x]);
      const moy = vals.reduce((t, x) => t + x, 0) / vals.length, mini = Math.min(...vals);
      fCol = (1 - R().couleurMin) * moy + R().couleurMin * mini; // un deck joue toutes ses couleurs : la plus faible compte
      if (cols.some(x => P.jamais.includes(x))) drapeaux.jamais = cols.filter(x => P.jamais.includes(x));
    }
    if (S.ncol) {
      const want = S.ncol === 4 ? 4 : S.ncol, L = cols.length || 1;
      const ok = S.ncol === 4 ? L >= 4 : L === want;
      if (!ok) fCol *= Math.abs(want - L) >= 2 ? .75 : .9;
    }
    fCol = clamp(fCol, 0, 1);
    if (fCol >= .62 && !drapeaux.jamais) why.push(QC.T("dans tes couleurs"));

    // ---------- thème ----------
    // un type de créature choisi explicitement (1) pèse plus qu'un type déduit d'un personnage (0,6) ou d'une carte aimée (0,35)
    let fTheme = .3;
    const fm = (c.f || []).filter(f => P.theme.fant[f]);
    if (fm.length) { fTheme += .3 * Math.min(1, P.theme.fant[fm[0]]); why.push(QC.T("incarne {p}", { p: (QC.PERSONNAGES[fm[0]] || fm[0]).toLowerCase() })); }
    const km = (c.k || []).filter(k => P.theme.kinds[k]).sort((a, b) => P.theme.kinds[b] - P.theme.kinds[a]);
    if (km.length) {
      const kv = P.theme.kinds[km[0]];
      fTheme += .35 * kv + (kv >= 1 && (s.kindred || 0) >= .5 ? .15 : 0); // bonus : le commandant soutient vraiment ce type
      if (kv >= .6) why.push(QC.T("type de créature : {k}", { k: km[0] }));
    }
    if (c.ub && S.ub === 2) fTheme += .15;
    if (c.ub && S.ub === 0) fTheme -= .2;
    fTheme = clamp(fTheme, 0, 1);

    // ---------- psychologie ----------
    // on compare des RÉPARTITIONS Timmy/Johnny/Spike : un commandant polyvalent ne doit pas plaire à toutes les psychologies
    const pc = psyCommandant(c), M = P.motivation;
    const tot = pc.timmy + pc.johnny + pc.spike || 1;
    let fPsy = 1 - .5 * (Math.abs(M.timmy - pc.timmy / tot) + Math.abs(M.johnny - pc.johnny / tot) + Math.abs(M.spike - pc.spike / tot));
    if (P.psy.mel > .6) fPsy = .8 * fPsy + .2 * pc.mel;
    fPsy = clamp(.2 + .8 * fPsy, 0, 1);

    // ---------- combinaison : moyenne géométrique pondérée, poids ajustés par la fiabilité ----------
    const B = R().poids, V = P.psy.vorthos, sp = P.motivation.spike;
    let wTheme = R().themeVorthos[0] + (R().themeVorthos[1] - R().themeVorthos[0]) * clamp((V - .4) / .5, 0, 1);
    if (P.mode === "commun") wTheme = Math.max(wTheme, R().themeDebutant);
    if (sp > .5) wTheme = Math.min(wTheme, .1);
    const w = {
      style: B.style * (.4 + .6 * P.fiab.style), couleur: B.couleur * (.4 + .6 * P.fiab.couleur),
      theme: wTheme * (.4 + .6 * P.fiab.theme), psy: B.psy * (.4 + .6 * P.fiab.psy)
    };
    const sw = w.style + w.couleur + w.theme + w.psy;
    for (const k in w) w[k] /= sw;
    const parts = { style: fStyle, couleur: fCol, theme: fTheme, psy: fPsy };
    const fl = R().plancher;
    let note = Math.exp(w.style * Math.log(Math.max(fl, fStyle)) + w.couleur * Math.log(Math.max(fl, fCol)) +
      w.theme * Math.log(Math.max(fl, fTheme)) + w.psy * Math.log(Math.max(fl, fPsy)));

    // ---------- multiplicateurs de contexte ----------
    const M_ = (k, v, raison) => { if (Math.abs(v - 1) > .005) { mult.push([k, v, raison]); note *= v; } };
    if (drapeaux.jamais) M_("jamais", R().jamais, QC.T("contient {c}, que tu as écarté", { c: drapeaux.jamais.map(x => QC.NOMS_COULEURS[x]).join(QC.T(" et ")) }));
    else if (P.bof && cols.some(x => P.bof.includes(x))) M_("bof", R().bof, QC.T("contient {c}, qui ne t'attire pas", { c: cols.filter(x => P.bof.includes(x)).map(x => QC.NOMS_COULEURS[x]).join(QC.T(" et ")) }));
    if (!connu) M_("inconnu", R().inconnu, QC.T("son style de jeu est encore mal connu"));
    const br = S.bracket, pw = c.p || 2;
    if (br) {
      const d = pw - br, flou = P.set.bracketExplicite ? 1 : R().bracketFlou;
      const sd = (d > 0 ? R().bracketAuDessus : R().bracketEnDessous * (sp > .5 ? .65 : 1)) * flou;
      const m = Math.max(R().bracketPlancher, Math.exp(-(d * d) / (2 * sd * sd)));
      M_("bracket", m, d > 0 ? QC.T("plus puissant que ton niveau (puissance {p} pour un bracket {b})", { p: pw.toFixed(1), b: br }) : QC.T("plutôt faible pour ton niveau (puissance {p})", { p: pw.toFixed(1) }));
    }
    const price = c.usd != null ? c.usd : (c.eur != null ? c.eur * 1.1 : null), bud = S.budget;
    if (price != null && bud && (S.proxy || 0) < 2) {
      let m = 1; (R().budget[bud] || []).forEach(([lim, f]) => { if (price > lim) m = f; });
      M_("budget", m, QC.T("le commandant seul coûte environ {p} €", { p: Math.round(price) }));
    }
    if (S.complexite) { // réglage 1 à 5 → complexité visée selon les quantiles du catalogue (interpolation)
      const q = (QC.D && QC.D.complexiteCible) || [1.5, 2, 2.5, 3, 3.5], i = clamp(S.complexite, 1, 5) - 1, lo = Math.floor(i);
      const want = q[lo] + (q[Math.min(4, lo + 1)] - q[lo]) * (i - lo);
      const ecart = (c.x || 2) - want;
      if (Math.abs(ecart) > .25) M_("complexite", Math.max(.6, 1 - R().complexite * 2 * Math.abs(ecart)), ecart > 0 ? QC.T("plus complexe que ce que tu cherches") : QC.T("plus simple que ce que tu cherches"));
    }
    if (S.obscur && !P.aimes.includes(c.n)) {
      const target = 1 - (S.obscur - 1) / 4;
      M_("popularite", 1 - R().popularite * Math.abs((c.pp || 0) - target), (c.pp || 0) > target ? QC.T("très joué, alors que tu cherches de l'original") : QC.T("peu connu"));
      if (S.obscur >= 4 && (c.pp || 0) < .5 && pw >= 2.6) why.push(QC.T("une pépite peu jouée"));
    }
    else if (P.mode === "commun") M_("popularite", 1 - R().populariteDebutant * (1 - (c.pp || 0)), QC.T("peu connu, donc moins de ressources pour le construire"));
    if ((c.pp || 0) < .3 && pw < 1.8) M_("qualite", R().obscurFaible, QC.T("peu joué et peu puissant"));
    if (S.cmdtype === "duo" && /[pwfbdts]/.test(c.fl || "")) M_("duo", 1.08, QC.T("se joue en duo"));
    if (S.cmdtype === "crea" && (c.fl || "").includes("a")) M_("type", .85, QC.T("n'est pas une créature"));
    if (S.prochain && P.decksStyles && c.t && c.t.length) {
      const sim = Math.max(...c.t.slice(0, 2).map(k => P.decksStyles[k] ? 1 : 0), 0);
      if (S.prochain === "new" && sim) M_("prochain", 1 - R().prochainNouveau, QC.T("ressemble à un deck que tu as déjà"));
      if (S.prochain === "deeper" && sim) M_("prochain", 1 + R().prochainMieux, QC.T("approfondit un style que tu joues déjà"));
    }
    if (P.mode === "commun") {
      if (c.pc && c.pc.length) { M_("precon", R().precon, QC.T("existe en deck préconstruit")); why.push(QC.T("existe en deck préconstruit : {d}", { d: c.pc[0] })); }
      if ((c.x || 2) > 3.5) M_("debutant", R().debutantComplexe, QC.T("exigeant pour débuter"));
    }
    M_("donnees", R().donneesFaibles[0] + R().donneesFaibles[1] * (c.sc || .5), QC.T("données encore incomplètes sur ce commandant"));
    if (P.aimes.includes(c.n)) { M_("aime", R().aime, QC.T("tu as aimé sa carte")); why.unshift(QC.T("tu as aimé sa carte au coup d'œil")); }
    if (P.reve.includes(c.n)) { M_("reve", R().reve, QC.T("ton commandant de rêve")); why.unshift(QC.T("ton commandant de rêve")); }

    // ---------- avertissements ----------
    for (const k in P.aversions) {
      const av = QC.AVERSIONS[k];
      if (av && av.style && P.aversions[k] <= 1 && (s[av.style] || 0) >= .55) warn.push(QC.T("fait subir aux autres « {a} », que tu n'aimes pas affronter", { a: av.l.toLowerCase() }));
    }
    if (c.cb && (c.cb.bp === "R" || c.cb.bp === "S") && br && br <= 3) warn.push(QC.T("a des combos rapides connus : à annoncer avant la partie"));
    mult.filter(([k, v]) => v < .9).forEach(([k, v, r]) => warn.push(r));
    return { c, note, parts, poids: w, mult, pourquoi: [...new Set(why)].slice(0, 4), attention: [...new Set(warn)].slice(0, 3), drapeaux };
  };
})(typeof module !== "undefined" ? (globalThis.QC = globalThis.QC || {}) : (window.QC = window.QC || {}));
