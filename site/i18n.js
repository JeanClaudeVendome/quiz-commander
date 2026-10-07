/* =====================================================================
   Le grand quiz Commander — traduction français / anglais.
   Le français est la langue source : chaque phrase française sert de clé au dictionnaire anglais (site/en.js).
   - I18N.T("phrase française {x}", {x}) : la traduction, avec ses variables (le français tel quel si la langue est le français
     ou si la phrase manque au dictionnaire).
   - Les textes fixes des pages (texte, placeholder, aria-label, title, alt) sont traduits automatiquement, y compris
     ceux ajoutés plus tard par les scripts (MutationObserver) : seule une correspondance EXACTE avec une clé est traduite.
   Langue : ?lang=en|fr dans l'adresse (mémorisé), sinon le choix mémorisé, sinon la langue du navigateur.
   Ce fichier se charge AVANT le moteur : QC.T (moteur/reglages.js) devient I18N.T.
   ===================================================================== */
(function () {
  "use strict";
  const CLE = "qc-lang";
  const lire = () => { try { return localStorage.getItem(CLE); } catch (e) { return null; } };
  const ecrire = v => { try { localStorage.setItem(CLE, v); } catch (e) { } };
  let lang = (new URLSearchParams(location.search).get("lang") || "").toLowerCase();
  if (lang === "fr" || lang === "en") ecrire(lang);
  else {
    const m = lire(), nav = ((navigator.languages && navigator.languages[0]) || navigator.language || "fr").toLowerCase();
    lang = m === "fr" || m === "en" ? m : nav.startsWith("fr") ? "fr" : "en";
  }

  const norm = s => String(s).replace(/\s+/g, " ").trim();
  const DICO = new Map(), MAJ = new Map();
  const entourer = (orig, en) => orig.slice(0, orig.length - orig.trimStart().length) + en + (orig.trim() ? orig.slice(orig.trimEnd().length) : "");
  const remplir = (s, v) => v ? String(s).replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : m) : s;

  /* Traduction d'une phrase (les espaces autour sont conservés) */
  function T(fr, v) {
    if (fr == null) return fr;
    let s = String(fr);
    if (lang === "en") {
      const k = norm(s), en = DICO.get(k);
      if (en !== undefined) s = entourer(s, en);
    }
    return remplir(s, v);
  }
  /* Traduit si la clé existe, sinon renvoie null (pour le DOM : pas de faux positifs) */
  function exact(s) {
    const k = norm(s);
    if (!k) return null;
    if (DICO.has(k)) return DICO.get(k);
    if (k === k.toUpperCase() && MAJ.has(k)) return MAJ.get(k);
    return null;
  }

  /* ---------- traduction automatique des pages ---------- */
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];
  const SAUTER = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1 };
  const FRANCAIS = /[éèêàùçôîœ]|\b(le|la|les|des|du|une|est|pour|avec|dans|tu|ton|ta|tes|pas|sur)\b/i;
  const manques = new Set();
  function traduireNoeud(n) {
    if (n.nodeType === 3) {
      const p = n.parentNode;
      if (!p || SAUTER[p.nodeName] || (p.closest && p.closest("[translate=no]"))) return;
      const t = n.nodeValue, en = exact(t);
      if (en !== null) { if (norm(t) !== en) n.nodeValue = entourer(t, en); }
      else if (/[a-zà-ÿ]{3}/i.test(t) && FRANCAIS.test(t)) manques.add(norm(t));
      return;
    }
    if (n.nodeType !== 1 || SAUTER[n.nodeName] || n.getAttribute("translate") === "no") return;
    for (const a of ATTRS) traduireAttr(n, a);
    for (let c = n.firstChild; c; c = c.nextSibling) traduireNoeud(c);
  }
  function traduireAttr(el, a) {
    const v = el.getAttribute(a), en = v && exact(v);
    if (en && en !== norm(v)) el.setAttribute(a, en);
  }
  let obs = null;
  function traduirePage() {
    if (lang !== "en" || !document.body) return;
    document.documentElement.lang = "en";
    document.title = document.title.split(" — ").map(x => exact(x) || x).join(" — ");
    traduireNoeud(document.body);
    if (obs) return;
    obs = new MutationObserver(ms => {
      obs.disconnect();
      for (const m of ms) {
        if (m.type === "childList") m.addedNodes.forEach(traduireNoeud);
        else if (m.type === "characterData") traduireNoeud(m.target);
        else if (m.type === "attributes") traduireAttr(m.target, m.attributeName);
      }
      brancher();
    });
    brancher();
  }
  const brancher = () => obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  window.I18N = {
    LANG: lang,
    EN: lang === "en",
    locale: lang === "en" ? "en-US" : "fr-FR",
    T,
    /* Ajoute des paires { "français": "english" } au dictionnaire */
    ajouter(o) { for (const k in o) { const kn = norm(k); DICO.set(kn, o[k]); MAJ.set(kn.toUpperCase(), String(o[k]).toUpperCase()); } },
    /* Remplace les textes d'un objet de données (champs listés) par leur traduction */
    donnees(obj, champs) {
      if (lang !== "en" || !obj) return obj;
      const voir = x => {
        if (Array.isArray(x)) x.forEach(voir);
        else if (x && typeof x === "object") for (const k in x) { if (typeof x[k] === "string") { if (champs.includes(k)) x[k] = T(x[k]); } else voir(x[k]); }
      };
      voir(obj);
      return obj;
    },
    /* Traduit les valeurs (chaînes) d'une table { clé: "texte" } */
    table(o) { if (lang === "en" && o) for (const k in o) if (typeof o[k] === "string") o[k] = T(o[k]); return o; },
    traduirePage,
    manques,
    choisir(l) { ecrire(l); const u = new URL(location.href); u.searchParams.delete("lang"); location.href = u.toString(); }
  };
  window.QC = window.QC || {};
  window.QC.LANG = lang;
  window.QC.T = T;
})();
