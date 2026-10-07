/* =====================================================================
   Le grand quiz Commander — stockage des profils.
   Même interface pour deux modes :
     - « supabase » : profils partagés avec le groupe (fonctions de supabase/schema.sql, appelées en HTTP)
     - « local »    : simulation dans le navigateur (si site/config.js est vide) — rien n'est partagé
   Toutes les méthodes sont asynchrones et lèvent une Error dont le message est en français.
   ===================================================================== */
(function () {
  "use strict";
  const CFG = window.QC_CONFIG || {};
  const MODE = CFG.supabaseUrl && CFG.supabaseAnonKey ? "supabase" : "local";
  const SESS = "qc-session", DB = "qc-local-db";
  const MESSAGES = {
    CODE_GROUPE: "Ce code d'accès est inconnu.", JOUEUR: "Ce joueur n'existe pas.", NON_RECLAME: "Ce profil n'a pas encore été réclamé.",
    VERROUILLE: "Trop de codes faux : ce profil est verrouillé. Demande à l'administrateur du site.", CODE_PERSO: "Code personnel incorrect.",
    FORMAT_PIN: "Le code personnel doit faire 4 chiffres.", DEJA_RECLAME: "Ce profil vient d'être réclamé par quelqu'un d'autre.",
    PSEUDO_PRIS: "Ce prénom existe déjà.", GROUPE_PLEIN: "La communauté est complète.", TROP_GROS: "Réponses trop volumineuses.",
    NOM_PRIS: "Un groupe porte déjà ce nom.", NOM_VIDE: "Donne un nom.", TROP_DE_GROUPES: "Il y a déjà trop de groupes.", GROUPE_INCONNU: "Ce groupe n'existe plus.",
    PAS_MEMBRE: "Il faut faire partie du groupe pour y ajouter quelqu'un.", PAS_CREATEUR: "Seul le créateur du groupe peut le supprimer.",
    SOI_MEME: "Tu ne peux pas te deviner toi-même.", CODE_ADMIN: "Code administrateur incorrect.", RESEAU: "Impossible de joindre le serveur. Vérifie ta connexion."
  };
  const err = code => { const e = new Error(MESSAGES[code] || code); e.code = code; return e; };
  const lire = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

  /* ---------- Supabase : appel d'une fonction ---------- */
  async function rpc(fn, args) {
    let r;
    try {
      r = await fetch(CFG.supabaseUrl.replace(/\/$/, "") + "/rest/v1/rpc/" + fn, {
        method: "POST",
        // Ancienne clé « anon » (un jeton JWT, « eyJ… ») : aussi en Authorization. Nouvelle clé « sb_publishable_… » : apikey seulement.
        headers: Object.assign({ "Content-Type": "application/json", apikey: CFG.supabaseAnonKey },
          CFG.supabaseAnonKey.startsWith("eyJ") ? { Authorization: "Bearer " + CFG.supabaseAnonKey } : {}),
        body: JSON.stringify(args)
      });
    } catch (e) { throw err("RESEAU"); }
    const txt = await r.text();
    if (!r.ok) {
      let m = ""; try { m = JSON.parse(txt).message || ""; } catch (e) { m = txt; }
      const code = Object.keys(MESSAGES).find(k => m.includes(k));
      throw code ? err(code) : new Error("Erreur du serveur : " + m.slice(0, 120));
    }
    const res = txt ? JSON.parse(txt) : null;
    if (res && res.erreur) throw err(res.erreur); // code personnel faux : renvoyé sans exception côté base (compteur d'essais conservé)
    return res;
  }

  /* ---------- Local : une petite base dans le navigateur ---------- */
  const uid = () => "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function base() {
    let b = lire(DB, null);
    if (!b) {
      const now = new Date().toISOString();
      b = { groupe: { id: "local", nom: "Communauté (mode local)" }, joueurs: ["Ben", "Ilyes", "Clement", "Filipe"].map(p => ({ id: uid(), pseudo: p, avatar: null, pin: null, reclame_le: null, cree_le: now })), versions: [], devinettes: [] };
      ecrire(DB, b);
    }
    if (!b.cercles) { // base locale d'avant les groupes multiples : ses joueurs forment le premier groupe, « La table »
      const c = { id: uid(), nom: "La table", cree_par: null, cree_le: new Date().toISOString() };
      b.cercles = [c]; b.membres = b.joueurs.map(j => ({ cercle: c.id, joueur: j.id, ajoute_le: c.cree_le })); ecrire(DB, b);
    }
    return b;
  }
  const garder = b => ecrire(DB, b);
  function joueurLocal(b, id, pin) {
    const j = b.joueurs.find(x => x.id === id);
    if (!j) throw err("JOUEUR");
    if (!j.pin) throw err("NON_RECLAME");
    if (j.pin !== pin) throw err("CODE_PERSO");
    return j;
  }
  const LOCAL = {
    groupe_entrer: () => { const b = base(); return b.groupe; },
    groupe_joueurs: () => {
      const b = base();
      return b.joueurs.map(j => {
        const vs = b.versions.filter(v => v.joueur === j.id).sort((x, y) => x.cree_le < y.cree_le ? 1 : -1), v = vs[0];
        return { id: j.id, pseudo: j.pseudo, avatar: j.avatar, reclame: !!j.pin, reclame_le: j.reclame_le, cree_le: j.cree_le,
          mode: v && v.mode, reponses: v && v.reponses, maj: v && v.cree_le, nb_versions: vs.length, cercles: b.membres.filter(m => m.joueur === j.id).map(m => m.cercle) };
      });
    },
    joueur_historique: a => base().versions.filter(v => v.joueur === a.p_joueur).sort((x, y) => x.cree_le > y.cree_le ? 1 : -1)
      .map(v => ({ id: v.id, mode: v.mode, reponses: v.reponses, date: v.cree_le })),
    groupe_nouvelles: () => {
      const b = base(), out = [];
      b.joueurs.forEach(j => { if (j.reclame_le) out.push({ type: "reclame", joueur: j.id, date: j.reclame_le }); });
      b.versions.forEach(v => out.push({ type: "publie", joueur: v.joueur, date: v.cree_le }));
      b.devinettes.forEach(d => out.push({ type: "devine", joueur: d.devineur, cible: d.cible, score: d.score, date: d.cree_le }));
      b.cercles.forEach(c => { if (c.cree_par) out.push({ type: "cercle", joueur: c.cree_par, nom: c.nom, date: c.cree_le }); });
      return out.sort((x, y) => x.date < y.date ? 1 : -1).slice(0, 30);
    },
    groupe_devinettes: () => base().devinettes.map(d => ({ devineur: d.devineur, cible: d.cible, score: d.score, sur: d.sur, date: d.cree_le })),
    joueur_reclamer: a => {
      if (!/^\d{4}$/.test(a.p_pin)) throw err("FORMAT_PIN");
      const b = base(), j = b.joueurs.find(x => x.id === a.p_joueur);
      if (!j) throw err("JOUEUR"); if (j.pin) throw err("DEJA_RECLAME");
      j.pin = a.p_pin; j.reclame_le = new Date().toISOString(); garder(b); return { id: j.id };
    },
    joueur_creer: a => {
      if (!/^\d{4}$/.test(a.p_pin)) throw err("FORMAT_PIN");
      const b = base(), ps = a.p_pseudo.trim();
      if (b.joueurs.some(x => x.pseudo.toLowerCase() === ps.toLowerCase())) throw err("PSEUDO_PRIS");
      const now = new Date().toISOString(), j = { id: uid(), pseudo: ps, avatar: null, pin: a.p_pin, reclame_le: now, cree_le: now };
      b.joueurs.push(j); garder(b); return { id: j.id };
    },
    joueur_connexion: a => { joueurLocal(base(), a.p_joueur, a.p_pin); return { id: a.p_joueur }; },
    version_publier: a => {
      const b = base(), j = joueurLocal(b, a.p_joueur, a.p_pin), v = { id: uid(), joueur: j.id, mode: a.p_mode, reponses: a.p_reponses, cree_le: new Date().toISOString() };
      b.versions.push(v); if (a.p_avatar) j.avatar = a.p_avatar; garder(b); return { id: v.id };
    },
    joueur_avatar: a => { const b = base(), j = joueurLocal(b, a.p_joueur, a.p_pin); j.avatar = a.p_avatar; garder(b); },
    version_supprimer: a => { const b = base(); joueurLocal(b, a.p_joueur, a.p_pin); b.versions = b.versions.filter(v => !(v.id === a.p_version && v.joueur === a.p_joueur)); garder(b); },
    devinette_enregistrer: a => {
      const b = base(); joueurLocal(b, a.p_joueur, a.p_pin); if (a.p_joueur === a.p_cible) throw err("SOI_MEME");
      b.devinettes.push({ devineur: a.p_joueur, cible: a.p_cible, score: a.p_score, sur: a.p_sur, cree_le: new Date().toISOString() }); garder(b);
    },
    cercles_liste: () => { const b = base(); return b.cercles.map(c => Object.assign({}, c, { membres: b.membres.filter(m => m.cercle === c.id).map(m => m.joueur) })); },
    cercle_creer: a => {
      const b = base(), j = joueurLocal(b, a.p_joueur, a.p_pin), nom = (a.p_nom || "").trim().slice(0, 40);
      if (!nom) throw err("NOM_VIDE");
      if (b.cercles.some(c => c.nom.toLowerCase() === nom.toLowerCase())) throw err("NOM_PRIS");
      const c = { id: uid(), nom, cree_par: j.id, cree_le: new Date().toISOString() };
      b.cercles.push(c); b.membres.push({ cercle: c.id, joueur: j.id, ajoute_le: c.cree_le }); garder(b); return { id: c.id };
    },
    cercle_rejoindre: a => {
      const b = base(), j = joueurLocal(b, a.p_joueur, a.p_pin);
      if (!b.cercles.some(c => c.id === a.p_cercle)) throw err("GROUPE_INCONNU");
      if (!b.membres.some(m => m.cercle === a.p_cercle && m.joueur === j.id)) b.membres.push({ cercle: a.p_cercle, joueur: j.id, ajoute_le: new Date().toISOString() });
      garder(b); return { ok: true };
    },
    cercle_quitter: a => { const b = base(), j = joueurLocal(b, a.p_joueur, a.p_pin); b.membres = b.membres.filter(m => !(m.cercle === a.p_cercle && m.joueur === j.id)); garder(b); return { ok: true }; },
    cercle_ajouter_profil: a => {
      const b = base(), j = joueurLocal(b, a.p_joueur, a.p_pin), ps = (a.p_pseudo || "").trim().slice(0, 24);
      if (!b.membres.some(m => m.cercle === a.p_cercle && m.joueur === j.id)) throw err("PAS_MEMBRE");
      let cible = b.joueurs.find(x => x.pseudo.toLowerCase() === ps.toLowerCase());
      if (!cible) { if (!ps) throw err("NOM_VIDE"); cible = { id: uid(), pseudo: ps, avatar: null, pin: null, reclame_le: null, cree_le: new Date().toISOString() }; b.joueurs.push(cible); }
      if (!b.membres.some(m => m.cercle === a.p_cercle && m.joueur === cible.id)) b.membres.push({ cercle: a.p_cercle, joueur: cible.id, ajoute_le: new Date().toISOString() });
      garder(b); return { id: cible.id };
    },
    cercle_supprimer: a => {
      const b = base(), j = joueurLocal(b, a.p_joueur, a.p_pin), c = b.cercles.find(x => x.id === a.p_cercle);
      if (!c || c.cree_par !== j.id) throw err("PAS_CREATEUR");
      b.cercles = b.cercles.filter(x => x.id !== c.id); b.membres = b.membres.filter(m => m.cercle !== c.id); garder(b); return { ok: true };
    }
  };
  const appel = async (fn, args) => MODE === "supabase" ? rpc(fn, args) : LOCAL[fn](args || {});

  /* Cache de lecture (45 s, le temps de naviguer entre les pages) : évite d'attendre Supabase à chaque page.
     Toute écriture le vide, pour qu'on voie toujours tout de suite ses propres changements. */
  const CACHE = "qc-cache:", TTL = 45000;
  async function lecture(fn, args) {
    const k = CACHE + fn + ":" + JSON.stringify(args);
    try { const c = JSON.parse(sessionStorage.getItem(k) || "null"); if (c && Date.now() - c.t < TTL) return c.v; } catch (e) { }
    const v = await appel(fn, args);
    try { sessionStorage.setItem(k, JSON.stringify({ t: Date.now(), v })); } catch (e) { }
    return v;
  }
  function viderCache() { try { Object.keys(sessionStorage).filter(k => k.startsWith(CACHE)).forEach(k => sessionStorage.removeItem(k)); } catch (e) { } }
  const ecriture = async (fn, args) => { const r = await appel(fn, args); viderCache(); return r; };

  /* ---------- Session (code du groupe + joueur connecté sur cet appareil) ---------- */
  const session = () => lire(SESS, {});
  const S = {
    mode: MODE,
    session,
    code: () => session().code || (MODE === "local" ? "local" : null),
    moi: () => session().joueur || null,
    async entrer(code) { const g = await appel("groupe_entrer", { p_code: code }); viderCache(); ecrire(SESS, Object.assign(session(), { code, groupe: g })); return g; },
    sortir() { const s = session(); delete s.joueur; delete s.pin; ecrire(SESS, s); },
    oublierGroupe() { try { localStorage.removeItem(SESS); } catch (e) { } },
    joueurs: () => lecture("groupe_joueurs", { p_code: S.code() }),
    historique: id => lecture("joueur_historique", { p_code: S.code(), p_joueur: id }),
    nouvelles: () => lecture("groupe_nouvelles", { p_code: S.code() }),
    devinettes: () => lecture("groupe_devinettes", { p_code: S.code() }),
    cercles: () => lecture("cercles_liste", { p_code: S.code() }),
    creerCercle: nom => ecriture("cercle_creer", { p_code: S.code(), p_joueur: S.moi(), p_pin: session().pin, p_nom: nom }),
    rejoindre: id => ecriture("cercle_rejoindre", { p_code: S.code(), p_joueur: S.moi(), p_pin: session().pin, p_cercle: id }),
    quitter: id => ecriture("cercle_quitter", { p_code: S.code(), p_joueur: S.moi(), p_pin: session().pin, p_cercle: id }),
    ajouterProfil: (id, pseudo) => ecriture("cercle_ajouter_profil", { p_code: S.code(), p_joueur: S.moi(), p_pin: session().pin, p_cercle: id, p_pseudo: pseudo }),
    supprimerCercle: id => ecriture("cercle_supprimer", { p_code: S.code(), p_joueur: S.moi(), p_pin: session().pin, p_cercle: id }),
    async reclamer(id, pin) { await ecriture("joueur_reclamer", { p_code: S.code(), p_joueur: id, p_pin: pin }); ecrire(SESS, Object.assign(session(), { joueur: id, pin })); },
    async creer(pseudo, pin) { const r = await ecriture("joueur_creer", { p_code: S.code(), p_pseudo: pseudo, p_pin: pin }); ecrire(SESS, Object.assign(session(), { joueur: r.id, pin })); return r.id; },
    async connexion(id, pin) { await appel("joueur_connexion", { p_code: S.code(), p_joueur: id, p_pin: pin }); ecrire(SESS, Object.assign(session(), { joueur: id, pin })); },
    publier: (mode, reponses, avatar) => ecriture("version_publier", { p_code: S.code(), p_joueur: S.moi(), p_pin: session().pin, p_mode: mode, p_reponses: reponses, p_avatar: avatar || null }),
    avatar: av => ecriture("joueur_avatar", { p_code: S.code(), p_joueur: S.moi(), p_pin: session().pin, p_avatar: av }),
    supprimerVersion: vid => ecriture("version_supprimer", { p_code: S.code(), p_joueur: S.moi(), p_pin: session().pin, p_version: vid }),
    devinette: (cible, score, sur) => ecriture("devinette_enregistrer", { p_code: S.code(), p_joueur: S.moi(), p_pin: session().pin, p_cible: cible, p_score: score, p_sur: sur || 5 }),
    viderCache,
    /* outils du mode local (encadré de démonstration) */
    reinitialiserLocal() { viderCache(); try { localStorage.removeItem(DB); localStorage.removeItem(SESS); } catch (e) { } }
  };
  if (MODE === "local" && !session().code) ecrire(SESS, { code: "local", groupe: { id: "local", nom: "Communauté (mode local)" } });
  window.QCStock = S;
})();
