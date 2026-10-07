/* =====================================================================
   Le grand quiz Commander — page du quiz.
   Parcours : choix du mode → chapitres et questions (moteur/questions.js) → révélation → publication.
   Le brouillon est sauvegardé dans le navigateur à chaque réponse.
   ===================================================================== */
(async function () {
  "use strict";
  const QC = window.QC, ST = window.QCStock, TX = window.QUIZ_TEXTES, $ = SITE.$, esc = SITE.esc, ord = SITE.ord;
  if (!(await SITE.demarrer("Le quiz"))) return;
  const scr = $("screen"), BROUILLON = "qc-brouillon";
  const moi = SITE.moi();
  let D = null;           // { mode, A: réponses, i: étape, avatar }
  let STEPS = [], T = null;

  const garder = () => { try { localStorage.setItem(BROUILLON, JSON.stringify(D)); } catch (e) { } };
  const lireBrouillon = () => { try { return JSON.parse(localStorage.getItem(BROUILLON) || "null"); } catch (e) { return null; } };
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function construire(mode) {
    const qs = QC.questionsDuMode(mode);
    STEPS = [];
    QC.CHAPITRES.forEach(ch => {
      const l = qs.filter(q => q.ch === ch.id);
      if (!l.length) return;
      STEPS.push({ k: "chapitre", ch });
      l.forEach(q => STEPS.push({ k: "q", q, ch }));
    });
    STEPS.push({ k: "revelation" });
  }
  const QSTEPS = () => STEPS.filter(s => s.k === "q");

  /* ---------- progression ---------- */
  function progression() {
    const s = STEPS[D.i], qs = QSTEPS(), qi = qs.indexOf(s);
    const avant = STEPS.slice(0, D.i + 1).filter(x => x.k === "q").length;
    const pct = s.k === "revelation" ? 100 : (avant - (qi >= 0 ? 1 : 0)) / qs.length * 100;
    $("top").style.visibility = s.k === "revelation" ? "hidden" : "visible";
    $("barI").style.width = pct + "%"; $("barB").style.left = pct + "%";
    if (s.ch) {
      $("chapName").innerHTML = `<span class="long">CHAPITRE </span>${s.ch.n} · ${esc(s.ch.titre.toUpperCase())}`;
      SITE.image(s.ch.art).then(v => { if (v.art) $("bg").style.backgroundImage = `url("${v.art}")`; });
    }
    const reste = Math.max(1, Math.round((qs.length - Math.max(0, qi)) * .35));
    $("qnum").innerHTML = qi >= 0 ? `<span class="long">Question </span>${qi + 1}<span class="long"> sur </span><span class="short"> / </span>${qs.length}<span class="long"> · environ ${reste} min</span>` : "";
  }
  function aller(d) { clearTimeout(T); D.i = Math.max(0, Math.min(STEPS.length - 1, D.i + d)); garder(); rendre(); window.scrollTo(0, 0); }
  const repondre = (id, v) => { D.A[id] = v; garder(); };
  // Après un choix, le focus va sur « Suivant » : on avance quand on le décide (clic, Entrée ou Espace)
  const focusSuivant = () => { const nx = scr.querySelector('[data-act="next"]:not([disabled])'); if (nx) nx.focus({ preventScroll: true }); };
  function pied(peutSuivre, opt) {
    opt = opt || {};
    const s = STEPS[D.i];
    return `<div class="foot"><button class="link" data-act="prev">← Précédent</button>
      ${opt.idk === false ? "<span></span>" : `<button class="link" data-act="idk">Je ne sais pas</button>`}
      <button class="btn solid" data-act="next" ${peutSuivre ? "" : "disabled"}>${opt.label || "Suivant"}</button></div>`;
  }
  function brancherPied() {
    const s = STEPS[D.i];
    scr.querySelectorAll("[data-act]").forEach(b => b.onclick = () => {
      if (b.dataset.act === "prev") aller(-1);
      else if (b.dataset.act === "next") aller(1);
      else if (b.dataset.act === "idk") { repondre(s.q.id, "?"); aller(1); }
    });
  }
  const entete = q => `<h1 class="q">${esc(q.q)}</h1>${q.help ? `<p class="help">${esc(q.help)}</p>` : `<p class="help"></p>`}`;

  /* ---------- écran de départ ---------- */
  function depart() {
    $("top").style.visibility = "hidden";
    SITE.image("Jace, the Mind Sculptor").then(v => { if (v.art) $("bg").style.backgroundImage = `url("${v.art}")`; });
    const b = lireBrouillon();
    const reprendre = b && b.mode && b.i > 0 ? `<div class="reprise"><span>Tu as un quiz en cours (${b.mode === "confirme" ? "confirmé" : "découverte"}).</span><button class="btn solid" id="reprendre">Reprendre</button></div>` : "";
    const avant = moi && moi.reponses ? `<label class="fine" style="display:block;margin-top:16px"><input type="checkbox" id="depuisAvant"> Partir de mes réponses publiées (pour ne changer que ce qui a évolué)</label>` : "";
    scr.className = "screen in";
    scr.innerHTML = `<h1 class="q" style="font-size:clamp(2rem,6vw,3.2rem)">Le quiz</h1>
      <p class="help">Deux parcours. Le confirmé contient tout le découverte, plus des questions pour affiner : tu pourras toujours le faire plus tard.</p>
      <div class="modes">
        <button class="mode" data-mode="commun"><b>Découverte</b><small>39 QUESTIONS · ENVIRON 12 MIN</small><span>Pour débuter ou pour aller vite. Sans jargon.</span></button>
        <button class="mode" data-mode="confirme"><b>Confirmé</b><small>62 QUESTIONS · ENVIRON 25 MIN</small><span>Les grilles de styles, les brackets, les plans de Magic : un profil plus précis.</span></button>
      </div>${avant}${reprendre}
      ${moi ? "" : `<p class="fine">Tu n'es pas connecté : tu pourras faire le quiz, mais il faudra choisir ton profil pour le publier. <a href="qui.html" style="color:var(--gold-l)">Choisir mon profil</a></p>`}`;
    scr.querySelectorAll(".mode").forEach(m => m.onclick = () => {
      const base = $("depuisAvant") && $("depuisAvant").checked ? JSON.parse(JSON.stringify(moi.reponses)) : {};
      D = { mode: m.dataset.mode, A: base, i: 0, avatar: moi && moi.avatar };
      construire(D.mode); garder(); rendre();
    });
    if ($("reprendre")) $("reprendre").onclick = () => { D = b; construire(D.mode); D.i = Math.min(D.i, STEPS.length - 1); rendre(); };
  }

  /* ---------- rendu d'une étape ---------- */
  function rendre() {
    const s = STEPS[D.i]; progression();
    scr.className = "screen in" + (s.k === "chapitre" ? " chapter" : s.k === "revelation" ? " reveal" : "");
    void scr.offsetWidth;
    if (s.k === "chapitre") {
      scr.innerHTML = `<div class="num" aria-hidden="true">${s.ch.n}</div><h1>${esc(s.ch.titre)}</h1><div class="orn"><i></i><b></b><i></i></div><p>${esc(s.ch.intro)}</p>
        <div><button class="btn solid" id="go">${D.i === 0 ? "Commencer" : "Continuer"}</button></div>
        <div style="margin-top:16px"><button class="link" id="back">← ${D.i === 0 ? "Changer de parcours" : "Précédent"}</button></div>`;
      $("go").onclick = () => aller(1); $("back").onclick = () => D.i === 0 ? depart() : aller(-1); $("go").focus({ preventScroll: true });
      return;
    }
    if (s.k === "revelation") return revelation();
    const q = s.q, R = RENDUS[q.type];
    if (R) R(q); else { scr.innerHTML = entete(q) + pied(true); brancherPied(); }
    const f = scr.querySelector("[aria-pressed='true'],.opt,.art,.side,.dot,.rb,input"); if (f && q.type !== "texte" && q.type !== "collection" && q.type !== "tribus") f.focus({ preventScroll: true });
  }

  const RENDUS = {
    choix(q) {
      const v = D.A[q.id];
      scr.innerHTML = entete(q) + `<div class="opts" role="radiogroup" aria-label="${esc(q.q)}">${q.options.map((o, n) => `<button class="opt" role="radio" aria-checked="${v === o.id}" aria-pressed="${v === o.id}" data-v="${esc(o.id)}"><span class="k"><span>${n + 1}</span></span><span>${esc(o.l)}${o.d ? `<small>${esc(o.d)}</small>` : ""}</span></button>`).join("")}</div>` + pied(!!v);
      scr.querySelectorAll(".opt").forEach(b => b.onclick = () => { repondre(q.id, b.dataset.v); rendre(); focusSuivant(); });
      brancherPied();
    },
    dilemme(q) {
      const v = D.A[q.id], [a, b] = q.options, art = q.art || [];
      const cote = (o, i) => `<button class="side${art[i] ? "" : " noart"}" ${art[i] ? `data-art="${esc(art[i])}"` : ""} data-v="${o.id}" aria-pressed="${v === o.id}"><b>${esc(o.l)}</b></button>`;
      scr.innerHTML = entete(q) + `<div class="pair">${cote(a, 0)}<div class="or"><span>OU</span></div>${cote(b, 1)}</div>` + pied(!!v);
      scr.querySelectorAll(".side").forEach(x => x.onclick = () => { repondre(q.id, x.dataset.v); rendre(); focusSuivant(); });
      brancherPied(); SITE.images(scr);
    },
    multi(q) {
      const v = Array.isArray(D.A[q.id]) ? D.A[q.id] : [];
      const basculer = id => { let c = v.slice(); if (c.includes(id)) c = c.filter(x => x !== id); else { if (c.length >= q.max) c.shift(); c.push(id); } repondre(q.id, c); rendre(); };
      let corps;
      if (q.art) corps = `<div class="arts">${q.options.map(o => `<button class="art" data-art="${esc(TX.PERSO_ART[o.id] || "")}" data-v="${o.id}" aria-pressed="${v.includes(o.id)}"><span class="tick"></span><span class="t"><b>${esc(o.l)}</b><small>${esc(o.d || "")}</small></span></button>`).join("")}</div>`;
      else corps = `<div class="opts">${q.options.map(o => `<button class="opt multi" data-v="${o.id}" aria-pressed="${v.includes(o.id)}"><span class="k"><span>${v.includes(o.id) ? "✓" : ""}</span></span><span>${q.type === "paires" ? SITE.pips(o.id, 18) + " " + esc(TX.GUILDES_PAIRES[o.id]) : esc(o.l)}</span></button>`).join("")}</div>`;
      scr.innerHTML = entete(q) + corps + `<div class="count">${v.length} / ${q.max} choisi${v.length > 1 ? "s" : ""}</div>` + pied(v.length > 0);
      scr.querySelectorAll("[data-v]").forEach(b => b.onclick = () => basculer(b.dataset.v));
      brancherPied(); SITE.images(scr);
    },
    echelle(q) {
      const v = D.A[q.id];
      scr.innerHTML = entete(q) + `<div class="scale"><div class="track" role="radiogroup" aria-label="${esc(q.q)}">${[1, 2, 3, 4, 5].map(n => `<button class="dot" role="radio" aria-label="${n} sur 5" aria-checked="${v === n}" aria-pressed="${v === n}" data-v="${n}"></button>`).join("")}</div>
        <div class="ends"><span>${esc(q.gauche)}</span><span>${esc(q.droite)}</span></div></div>` + pied(!!v);
      scr.querySelectorAll(".dot").forEach(b => b.onclick = () => { repondre(q.id, +b.dataset.v); rendre(); focusSuivant(); });
      brancherPied();
    },
    grille(q) {
      const v = D.A[q.id] && typeof D.A[q.id] === "object" ? D.A[q.id] : {};
      const NIV = [[3, "Coup de cœur"], [2, "Pourquoi pas"], [1, "Bof"], [0, "Jamais"]];
      scr.innerHTML = entete(q) + `<p class="help">Note chaque idée selon l'envie de la piloter, pas selon sa puissance.</p><div class="grows">${q.items.map(k => `<div class="grow"><div><b>${esc(SITE.NOM_STYLE_COURT[k])}</b><small>${esc(TX.STYLE_DESC[k])}</small></div>
        <div class="lv4" role="radiogroup" aria-label="${esc(SITE.NOM_STYLE_COURT[k])}">${NIV.map(([n, l]) => `<button role="radio" class="${n === 0 ? "neg" : ""}" aria-checked="${v[k] === n}" aria-pressed="${v[k] === n}" data-k="${k}" data-n="${n}">${l}</button>`).join("")}</div></div>`).join("")}</div>` + pied(Object.keys(v).length >= Math.ceil(q.items.length / 2));
      scr.querySelectorAll(".lv4 button").forEach(b => b.onclick = () => { v[b.dataset.k] = +b.dataset.n; repondre(q.id, v); const y = window.scrollY; rendre(); window.scrollTo(0, y); });
      brancherPied();
    },
    aversions(q) {
      const v = D.A[q.id] && typeof D.A[q.id] === "object" ? D.A[q.id] : {};
      const NIV = [[3, "J'adore"], [2, "Ça va"], [1, "Ça m'agace"], [0, "Je quitte la table"]];
      scr.innerHTML = entete(q) + `<p class="help">Réponds à celles qui te parlent. Ces réponses servent à préparer la discussion d'avant-partie, et aux avertissements sur les commandants.</p><div class="grows">${q.items.map(k => `<div class="grow"><div><b>${esc(QC.AVERSIONS[k].l)}</b><small>${esc(TX.AVERSION_DESC[k] || "")}</small></div>
        <div class="lv4" role="radiogroup" aria-label="${esc(QC.AVERSIONS[k].l)}">${NIV.map(([n, l]) => `<button role="radio" class="${n === 0 ? "neg" : ""}" aria-checked="${v[k] === n}" aria-pressed="${v[k] === n}" data-k="${k}" data-n="${n}">${l}</button>`).join("")}</div></div>`).join("")}</div>` + pied(true);
      scr.querySelectorAll(".lv4 button").forEach(b => b.onclick = () => { v[b.dataset.k] = +b.dataset.n; repondre(q.id, v); const y = window.scrollY; rendre(); window.scrollTo(0, y); });
      brancherPied();
    },
    couleurs(q) {
      const v = D.A[q.id] && typeof D.A[q.id] === "object" ? D.A[q.id] : {};
      const COLS = [["W", "Blanc"], ["U", "Bleu"], ["B", "Noir"], ["R", "Rouge"], ["G", "Vert"], ["C", "Incolore"]];
      const LV = [[0, "Jamais"], [1, "Bof"], [2, "Bien"], [3, "J'adore"]];
      const complet = COLS.every(([c]) => v[c] !== undefined);
      scr.innerHTML = entete(q) + `<div class="cgrid">${COLS.map(([c, l]) => `<div class="crow"><img src="https://svgs.scryfall.io/card-symbols/${c}.svg" alt=""><b>${l}</b>
        <div class="lv" role="radiogroup" aria-label="${l}">${LV.map(([n, t]) => `<button role="radio" class="${n === 0 ? "never" : ""}" aria-checked="${v[c] === n}" aria-pressed="${v[c] === n}" data-c="${c}" data-n="${n}">${t}</button>`).join("")}</div>
        <button class="star" aria-label="Coup de cœur : ${l}" aria-pressed="${v.star === c}" data-c="${c}">★</button></div>`).join("")}</div>` + pied(complet, { idk: false });
      scr.querySelectorAll(".lv button").forEach(b => b.onclick = () => { v[b.dataset.c] = +b.dataset.n; if (v.star === b.dataset.c && +b.dataset.n < 3) delete v.star; repondre(q.id, v); rendre(); });
      scr.querySelectorAll(".star").forEach(b => b.onclick = () => { v.star = v.star === b.dataset.c ? undefined : b.dataset.c; if (v.star) v[v.star] = 3; repondre(q.id, v); rendre(); });
      brancherPied();
    },
    paires(q) { RENDUS.multi(q); },
    plans(q) { RENDUS.multi(q); },
    tribus(q) {
      let v = Array.isArray(D.A[q.id]) ? D.A[q.id].slice() : [];
      const fr = Object.fromEntries(TX.TRIBUS.map(([f, e]) => [e, f]));
      const tous = Object.keys(QC.D.typeColor).sort();
      const basculer = t => { if (v.includes(t)) v = v.filter(x => x !== t); else if (v.length < q.max) v.push(t); repondre(q.id, v.slice()); dessiner(); };
      const dessiner = () => {
        scr.innerHTML = entete(q) + `<div class="chips">${TX.TRIBUS.filter(([, e]) => tous.includes(e)).map(([f, e]) => `<button class="chip-b" aria-pressed="${v.includes(e)}" data-t="${e}">${esc(f)}</button>`).join("")}</div>
          <div class="search"><input id="tq" placeholder="Un autre type ? (noms anglais : Treefolk, Ooze, Kraken…)" aria-label="Chercher un type de créature" autocomplete="off"><ul class="sugg" id="ts"></ul></div>
          <div class="picked">${v.map(t => `<span>${esc(fr[t] || t)} <button aria-label="Retirer ${esc(fr[t] || t)}" data-t="${esc(t)}">✕</button></span>`).join("")}</div>
          <div class="count">${v.length} / ${q.max} choisi${v.length > 1 ? "s" : ""}</div>` + pied(v.length > 0);
        scr.querySelectorAll("[data-t]").forEach(b => b.onclick = () => basculer(b.dataset.t));
        $("tq").oninput = () => {
          const s = norm($("tq").value);
          $("ts").innerHTML = s.length < 2 ? "" : tous.filter(t => norm(t).includes(s) || norm(fr[t]).includes(s)).slice(0, 8)
            .map(t => `<li><button data-add="${esc(t)}">${esc(fr[t] ? fr[t] + " (" + t + ")" : t)}</button></li>`).join("");
          $("ts").querySelectorAll("[data-add]").forEach(b => b.onclick = () => basculer(b.dataset.add));
        };
        brancherPied();
      };
      dessiner();
    },
    cartes(q) { coupDoeil(q); },
    collection(q) {
      const v = D.A[q.id] && D.A[q.id].commandants ? D.A[q.id].commandants.slice() : [];
      const maj = () => repondre(q.id, { commandants: v });
      const dessiner = () => {
        scr.innerHTML = entete(q) + `<div class="search"><input id="cq" placeholder="Nom d'un commandant (français ou anglais)" aria-label="Chercher un commandant" autocomplete="off"><ul class="sugg" id="cs"></ul></div>
          <div class="picked">${v.map(n => `<span>${esc(n)} <button aria-label="Retirer ${esc(n)}" data-del="${esc(n)}">✕</button></span>`).join("")}</div>` +
          pied(true, { label: v.length ? "Suivant" : "Je n'ai pas encore de deck" });
        scr.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { v.splice(v.indexOf(b.dataset.del), 1); maj(); dessiner(); });
        brancherCherche($("cq"), $("cs"), chercherCommandants, n => { if (!v.includes(n)) v.push(n); maj(); dessiner(); });
        brancherPied();
      };
      dessiner();
    },
    texte(q) {
      const v = Array.isArray(D.A[q.id]) ? D.A[q.id].slice() : [];
      const maj = () => repondre(q.id, v);
      const dessiner = () => {
        scr.innerHTML = entete(q) + `<div class="search"><input id="xq" placeholder="${q.recherche === "commandants" ? "Nom d'un commandant" : "Nom d'une carte (en anglais)"}" aria-label="Chercher" autocomplete="off" ${v.length >= q.max ? "disabled" : ""}><ul class="sugg" id="xs"></ul></div>
          <div class="picked">${v.map((c, i) => `<span>${esc(c.n)} <button aria-label="Retirer ${esc(c.n)}" data-del="${i}">✕</button></span>`).join("")}</div>
          <div class="count">${v.length} / ${q.max}</div><div class="err" id="xerr"></div>` + pied(true, { label: v.length ? "Suivant" : "Passer" });
        scr.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { v.splice(+b.dataset.del, 1); maj(); dessiner(); });
        const source = q.recherche === "commandants" ? chercherCommandants : chercherCartes;
        brancherCherche($("xq"), $("xs"), source, async n => {
          if (v.length >= q.max || v.some(c => c.n === n)) return;
          const c = SITE.carte(n);
          if (c) v.push({ n, ci: c.ci, s: c.s });
          else { try { const r = await fetch("https://api.scryfall.com/cards/named?exact=" + encodeURIComponent(n)).then(r => r.json()); v.push({ n, ci: (r.color_identity || []).join("") }); } catch (e) { v.push({ n, ci: "" }); } }
          maj(); dessiner();
        });
        brancherPied();
      };
      dessiner();
    }
  };

  /* ---------- recherches ---------- */
  function chercherCommandants(s) {
    s = norm(s); if (s.length < 2) return Promise.resolve([]);
    return Promise.resolve(QC.D.cards.filter(c => norm(c.n).includes(s) || norm(c.fr).includes(s)).sort((a, b) => (b.pp || 0) - (a.pp || 0)).slice(0, 8)
      .map(c => ({ n: c.n, sous: c.fr && c.fr !== c.n ? c.fr : "", art: c.art })));
  }
  let ctrl = null;
  async function chercherCartes(s) {
    if (s.length < 2) return [];
    if (ctrl) ctrl.abort(); ctrl = new AbortController();
    try { const r = await fetch("https://api.scryfall.com/cards/autocomplete?q=" + encodeURIComponent(s), { signal: ctrl.signal }).then(r => r.json()); return (r.data || []).slice(0, 8).map(n => ({ n })); }
    catch (e) { return []; }
  }
  function brancherCherche(input, liste, source, choisir) {
    let t = null;
    input.oninput = () => { clearTimeout(t); t = setTimeout(async () => {
      const res = await source(input.value.trim());
      liste.innerHTML = res.map(r => `<li><button data-n="${esc(r.n)}">${r.art ? `<span class="mini" style="background-image:url('${esc(r.art)}')"></span>` : ""}<span>${esc(r.n)}${r.sous ? `<small>${esc(r.sous)}</small>` : ""}</span></button></li>`).join("");
      liste.querySelectorAll("button").forEach(b => b.onclick = () => choisir(b.dataset.n));
    }, 180); };
    input.focus({ preventScroll: true });
  }

  /* ---------- coup d'œil : les cartes qui apprennent le plus (docs/moteur.md §3.3) ---------- */
  function prochaineCarte(vus) {
    const P = QC.mesurer(D.A, D.mode), possedes = new Set(P.possedes);
    const pool = QC.D.cards.filter(c => (c.pp || 0) >= .75 && c.s && Object.keys(c.s).length && !vus.has(c.n) && !possedes.has(c.n));
    let best = null, bv = -1;
    for (let i = 0; i < 140 && pool.length; i++) {
      const c = pool[Math.floor(Math.random() * pool.length)];
      let incert = 0, tot = 0;
      for (const k in c.s) if (c.s[k] >= .3) { incert += c.s[k] * (1 - P.stylesFiab[k]); tot += c.s[k]; }
      incert = tot ? incert / tot : 0;
      const x = QC.noter(P, c), proche = x ? 1 - Math.abs(x.parts.style - .5) * 2 : 0;
      const val = .55 * incert + .3 * proche + .15 * Math.random();
      if (val > bv) { bv = val; best = c; }
    }
    return best;
  }
  function coupDoeil(q) {
    const r = D.A[q.id] = D.A[q.id] && typeof D.A[q.id] === "object" ? D.A[q.id] : {};
    const vus = new Set(Object.keys(r));
    if (vus.size >= q.n) { aller(1); return; }
    D.carteEnCours = D.carteEnCours && !vus.has(D.carteEnCours) ? D.carteEnCours : (prochaineCarte(vus) || {}).n;
    const n = D.carteEnCours; if (!n) { aller(1); return; }
    const c = SITE.carte(n);
    scr.innerHTML = `<h1 class="q" style="text-align:center">${esc(q.q)}</h1><p class="help" style="text-align:center">Carte ${vus.size + 1} sur ${q.n}${c.fr ? " · " + esc(c.fr) : ""}<span class="kbd"> · flèches ← et → au clavier</span></p>
      <div class="swipe"><div class="deck"><div class="card" id="card" style="background-image:url('${esc(c.img || "")}')" role="img" aria-label="${esc(n)}"><span class="stamp like">J'ADORE</span><span class="stamp nope">PAS POUR MOI</span></div></div>
      <div class="react"><div class="rc"><button class="rb no" data-r="0" aria-label="Pas pour moi">✕</button><span>Pas pour moi</span></div>
        <div class="rc"><button class="rb meh" data-r="0.5" aria-label="Bof">?</button><span>Bof</span></div>
        <div class="rc"><button class="rb yes" data-r="1" aria-label="J'adore">♥</button><span>J'adore</span></div></div></div>
      <div class="foot"><button class="link" data-act="prev">← Précédent</button><span></span><button class="btn" data-act="next">Passer le reste</button></div>`;
    brancherPied();
    const card = $("card"), likeS = card.querySelector(".like"), nopeS = card.querySelector(".nope");
    const decider = v => {
      const dx = v > .5 ? 600 : v < .5 ? -600 : 0;
      card.style.transform = `translate(${dx}px,${v === .5 ? 400 : 40}px) rotate(${(v - .5) * 50}deg)`; card.style.opacity = 0;
      r[n] = v; D.carteEnCours = null; garder(); setTimeout(() => coupDoeil(q), 260);
    };
    scr.querySelectorAll(".rb").forEach(b => b.onclick = () => decider(+b.dataset.r));
    let x0 = null, dx = 0;
    card.onpointerdown = e => { x0 = e.clientX; card.classList.add("drag"); card.setPointerCapture(e.pointerId); };
    card.onpointermove = e => { if (x0 === null) return; dx = e.clientX - x0; card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`; likeS.style.opacity = Math.max(0, dx / 120); nopeS.style.opacity = Math.max(0, -dx / 120); };
    card.onpointerup = () => { card.classList.remove("drag"); if (Math.abs(dx) > 110) decider(dx > 0 ? 1 : 0); else { card.style.transform = ""; likeS.style.opacity = nopeS.style.opacity = 0; } x0 = null; dx = 0; };
  }

  /* ---------- révélation et publication ---------- */
  function revelation() {
    const P = QC.mesurer(D.A, D.mode), res = QC.proposer(P, { n: 12 }), F = res.familles;
    const tete = [F.sur[0], F.surprise[0], F.horsZone[0]].filter(Boolean);
    const ident = SITE.identite(P), titre = SITE.titre(P), contra = SITE.contradiction(P);
    const choixAv = [...new Set([...(D.avatar ? [D.avatar] : []), ...F.sur.slice(0, 2), ...F.surprise.slice(0, 2), ...F.horsZone.slice(0, 1)].map(x => x.c ? x.c.n : x))].slice(0, 6);
    if (!D.avatar) D.avatar = choixAv[0];
    SITE.teinter(P);
    scr.innerHTML = `<div class="load" id="load">CALCUL DE TON PROFIL…</div>
      <div class="rhex" id="rhex">${SITE.hex(null, null, { labels: true, grid: "#4A4058" })}</div>
      <div class="rtitle" id="rtitle"><small>${moi ? esc(moi.pseudo.toUpperCase()) + ", TU ES…" : "TU ES…"}</small><h1>${esc(titre)}</h1><p>${esc(SITE.GUILDES[ident] || ident)}</p>${contra ? `<p class="contra">${esc(contra)}</p>` : ""}</div>
      <div class="rcards">${["La surprise cohérente", "Le choix sûr", "Hors de ta zone"].map((fam, k) => { const x = [F.surprise[0], F.sur[0], F.horsZone[0]][k];
        return `<div class="flip${k === 1 ? " mid" : ""}"><div class="in"><div class="b">${SITE.hex(null, null, { grid: "#B08D57" })}</div><div class="f">${x ? `<img src="${esc(x.c.img || "")}" alt="${esc(x.c.n)}">` : ""}</div></div><div class="cap">${fam}</div></div>`; }).join("")}</div>
      <div class="after" id="after">
        <p class="help" style="margin:10px 0 0">Ton avatar sur le site</p>
        <div class="avatars">${choixAv.map(n => `<button data-av="${esc(n)}" data-art="${esc(n)}" aria-label="${esc(n)}" title="${esc(n)}" aria-pressed="${D.avatar === n}"></button>`).join("")}</div>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:22px">
          ${moi ? `<button class="btn solid" id="publier">Publier ma fiche</button>` : `<a class="btn solid" href="qui.html">Choisir mon profil pour publier</a>`}
          <button class="btn" id="revoir">Revoir mes réponses</button></div>
        <div class="err" id="perr" role="alert"></div>
        <p class="fine">${moi ? "Ta fiche sera visible par tout le groupe. Tes anciennes versions sont conservées dans ton historique." : "Tes réponses sont gardées dans ce navigateur en attendant."}</p>
      </div>`;
    SITE.images(scr);
    scr.querySelectorAll("[data-av]").forEach(b => b.onclick = () => { D.avatar = b.dataset.av; garder(); scr.querySelectorAll("[data-av]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    $("revoir").onclick = () => { D.i = 0; garder(); rendre(); };
    if ($("publier")) $("publier").onclick = async () => {
      const btn = $("publier"); btn.disabled = true; $("perr").textContent = "";
      try {
        const A = Object.assign({}, D.A); delete A.carteEnCours;
        await ST.publier(D.mode, A, D.avatar);
        localStorage.removeItem(BROUILLON);
        location.href = "profil.html?j=" + moi.id + "&nouveau=1";
      } catch (e) { $("perr").textContent = e.message; btn.disabled = false; }
    };
    // animation : l'hexagone se dessine, puis le titre, puis les cartes se retournent
    const svg = $("rhex").querySelector("svg"), reduit = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const NS = "http://www.w3.org/2000/svg", dit = document.createElementNS(NS, "polygon"), rev = document.createElementNS(NS, "polygon");
    dit.setAttribute("fill", "#E9D7AE"); dit.setAttribute("fill-opacity", ".28"); dit.setAttribute("stroke", "#E9D7AE"); dit.setAttribute("stroke-width", "2");
    rev.setAttribute("fill", "none"); rev.setAttribute("stroke", "#fff"); rev.setAttribute("stroke-width", "1.5"); rev.setAttribute("stroke-dasharray", "5 4");
    svg.append(dit, rev);
    const C = P.couleurs, t0 = performance.now() + (reduit ? 0 : 900), Dur = reduit ? 1 : 1400, ease = x => 1 - Math.pow(1 - x, 3);
    const fin = () => {
      $("load").textContent = Object.keys(C.dit).length ? "CE QUE TU DIS · CE QUE TES RÉPONSES RÉVÈLENT" : "TON HEXAGONE";
      setTimeout(() => $("rtitle").classList.add("on"), 200);
      scr.querySelectorAll(".flip").forEach((f, n) => setTimeout(() => f.classList.add("on"), (reduit ? 0 : 1100) + [1, 0, 2][n] * (reduit ? 0 : 350)));
      setTimeout(() => $("after").classList.add("on"), reduit ? 0 : 2400);
    };
    const frame = now => {
      const k = ease(Math.max(0, Math.min(1, (now - t0) / Dur)));
      const sc = v => Object.fromEntries(QC.COULEURS.map(c => [c, (v[c] || 0) * k]));
      if (Object.keys(C.dit).length) dit.setAttribute("points", SITE.hexPoly(sc(C.dit)));
      rev.setAttribute("points", SITE.hexPoly(sc(C.afficheRevele)));
      if (k < 1) requestAnimationFrame(frame); else fin();
    };
    requestAnimationFrame(frame);
  }

  document.addEventListener("keydown", e => {
    if (!D || !STEPS[D.i] || e.target.tagName === "INPUT") return;
    const s = STEPS[D.i];
    if (s.k === "q" && (s.q.type === "choix") && /^[1-9]$/.test(e.key)) { const b = scr.querySelectorAll(".opt")[+e.key - 1]; if (b) b.click(); }
    if (s.k === "q" && s.q.type === "cartes") { if (e.key === "ArrowRight") scr.querySelector(".rb.yes").click(); if (e.key === "ArrowLeft") scr.querySelector(".rb.no").click(); }
    // Entrée valide la réponse choisie (comme le bouton « Suivant ») ; sur un bouton, Entrée garde son effet normal
    if (e.key === "Enter" && s.k === "q" && e.target.tagName !== "BUTTON" && e.target.tagName !== "A") {
      const nx = scr.querySelector('[data-act="next"]:not([disabled])'); if (nx) { e.preventDefault(); nx.click(); }
    }
  });

  depart();
})();
