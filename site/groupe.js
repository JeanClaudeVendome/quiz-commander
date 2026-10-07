/* =====================================================================
   Le grand quiz Commander — page des groupes.
   groupe.html            → liste de tous les groupes (+ création)
   groupe.html?g=<id>     → la page d'un groupe (hexagone, stats, fiches, face-à-face)
   groupe.html?g=tous     → toute la communauté
   ===================================================================== */
(async function () {
  "use strict";
  const QC = window.QC, ST = window.QCStock, $ = SITE.$, esc = SITE.esc, tr = SITE.T;
  if (!(await SITE.demarrer("Les groupes"))) return;
  const G = await SITE.groupe(), moi = SITE.moi(), gid = SITE.param("g");
  const pDv = ST.devinettes().catch(() => []);
  const NOMPSY = { timmy: "Timmy", johnny: "Johnny", spike: "Spike" };

  /* ===================== Liste des groupes ===================== */
  if (!gid) {
    const mes = SITE.mesCercles(), autres = G.cercles.filter(c => !mes.includes(c));
    $("gsub").textContent = tr(SITE.pluriel(G.cercles.length) ? "{n} GROUPES" : "{n} GROUPE", { n: G.cercles.length }) + " · " + tr("{n} joueurs", { n: G.joueurs.length }).toUpperCase();
    const tous = { id: "tous", nom: tr("Toute la communauté"), membres: G.joueurs.map(j => j.id) };
    $("liste").innerHTML =
      (moi ? `<div class="section-title"><h2>Tes groupes</h2><div class="orn"><i></i><b></b><i></i></div></div>
        <div class="gcs">${mes.map(c => SITE.carteCercle(c)).join("") || `<p class="vide-g">Tu ne fais encore partie d'aucun groupe : rejoins-en un ci-dessous, ou crée le tien.</p>`}</div>` : "") +
      `<div class="section-title"><h2>${moi ? "Les autres groupes" : "Tous les groupes"}</h2><div class="orn"><i></i><b></b><i></i></div></div>
        <div class="gcs">${(moi ? autres : G.cercles).map(c => SITE.carteCercle(c)).join("")}${SITE.carteCercle(tous).replace('href="groupe.html?g=tous"', 'href="groupe.html?g=tous"')}
        ${moi ? `<button class="gc nouveau" id="nouveau"><b>+ Créer un groupe</b><small>Pour ta table du jeudi, ta boutique, ta famille…</small></button>` : ""}</div>
        <div id="creer"></div>` +
      (moi ? "" : `<p class="vide-g" style="margin-top:22px"><a class="btn ghost-dark" href="qui.html">Entrer pour créer ou rejoindre un groupe</a></p>`) + `<div style="height:60px"></div>`;
    if ($("nouveau")) $("nouveau").onclick = () => {
      $("creer").innerHTML = `<form class="form-g" id="fc"><input id="nom" maxlength="40" placeholder="Nom du groupe" aria-label="Nom du groupe" required><button class="btn ghost-dark">Créer</button></form><div class="err-g" id="ec" role="alert"></div>`;
      $("nom").focus();
      $("fc").onsubmit = async e => {
        e.preventDefault();
        try { const r = await ST.creerCercle($("nom").value.trim()); location.href = "groupe.html?g=" + r.id; } catch (er) { $("ec").textContent = er.message; }
      };
    };
    SITE.images();
    return;
  }

  /* ===================== Page d'un groupe ===================== */
  const C = gid === "tous" ? { id: "tous", nom: tr("Toute la communauté"), membres: G.joueurs.map(j => j.id) } : G.parCercle[gid];
  if (!C) { $("liste").innerHTML = `<p class="vide-g" style="padding:60px 0">Ce groupe n'existe plus. <a href="groupe.html">Voir tous les groupes</a></p>`; return; }
  $("detail").hidden = false; $("liste").hidden = true;
  document.title = C.nom + " — " + tr("Le grand quiz Commander");
  const J = SITE.membresDe(C), dedans = moi && C.membres.includes(moi.id), estCreateur = moi && C.cree_par === moi.id;
  $("gtitre").textContent = C.nom;
  const faits = J.filter(j => j.reponses).map(j => { const pr = SITE.profil(j); return { j, P: pr.P, A: pr.A, ident: pr.ident, titre: pr.titre }; });
  const nR = J.filter(j => j.reclame).length, nF = faits.length;
  $("gsub").textContent = tr(SITE.pluriel(J.length) ? "{n} joueurs" : "{n} joueur", { n: J.length }).toUpperCase() + " · " + tr(SITE.pluriel(nF) ? "{n} PROFILS COMPLÉTÉS" : "{n} PROFIL COMPLÉTÉ", { n: nF });
  $("hexTitre").textContent = gid === "tous" ? "L'hexagone de la communauté" : "L'hexagone du groupe";
  // actions : rejoindre, quitter, supprimer
  if (gid !== "tous" && moi) {
    $("gact").innerHTML = `<div class="actions-g">${dedans ? `<button class="btn" id="quitter">Quitter le groupe</button>` : `<button class="btn solid" id="rejoindre">Rejoindre le groupe</button>`}
      ${estCreateur ? `<button class="btn" id="supprimer">Supprimer le groupe</button>` : ""}</div><div class="err-g" id="ea" role="alert" style="color:#F0A49A"></div>`;
    const agir = async f => { try { await f(); location.reload(); } catch (er) { $("ea").textContent = er.message; } };
    if ($("rejoindre")) $("rejoindre").onclick = () => agir(() => ST.rejoindre(C.id));
    if ($("quitter")) $("quitter").onclick = () => { if (confirm(tr("Quitter « {g} » ? Ton profil reste visible par tous.", { g: C.nom }))) agir(() => ST.quitter(C.id)); };
    if ($("supprimer")) $("supprimer").onclick = () => { if (confirm(tr("Supprimer le groupe « {g} » ? Les joueurs et leurs profils ne sont pas supprimés.", { g: C.nom }))) agir(async () => { await ST.supprimerCercle(C.id); location.href = "groupe.html"; }); };
  }
  const fin = x => x.P.couleurs.final;
  const moy = nF ? Object.fromEntries(QC.COULEURS.map(c => [c, faits.reduce((s, x) => s + fin(x)[c], 0) / nF])) : null;

  let sel = null;
  function grand() {
    let extra = faits.map(x => { const on = sel === x.j.id, col = SITE.TINT[SITE.dominante(x.P)][0];
      return `<polygon points="${SITE.hexPoly(fin(x))}" fill="${on ? col : "none"}" fill-opacity="${on ? .3 : 0}" stroke="${col}" stroke-width="${on ? 2.5 : 1}" stroke-opacity="${sel && !on ? .15 : .55}"/>`; }).join("");
    if (moy) extra += `<polygon points="${SITE.hexPoly(moy)}" fill="#4A2E4F" fill-opacity="${sel ? .05 : .22}" stroke="#4A2E4F" stroke-width="2" stroke-dasharray="${sel ? "4 4" : ""}"/>`;
    $("bighex").innerHTML = SITE.hex(null, null, { labels: true, question: !moy, extra, aria: tr("Hexagone de {g}", { g: C.nom }) });
    document.querySelectorAll("#who button").forEach(b => b.setAttribute("aria-pressed", (b.dataset.id || null) === sel));
    $("whohint").textContent = !moy ? "L'hexagone se dessinera dès que le premier profil sera publié."
      : sel ? tr("{p} en couleur, la moyenne en pointillés.", { p: G.parId[sel].pseudo }) : "La moyenne en violet, chaque joueur en trait fin.";
  }
  $("who").innerHTML = `<button data-id=""><span style="background:#4A2E4F"></span>Tout le monde</button>` + J.map(j => j.reponses
    ? `<button data-id="${j.id}"><span ${SITE.avAttrs(j)}></span>${esc(j.pseudo)}</button>`
    : `<button disabled title="Quiz pas encore fait" style="opacity:.45;cursor:default"><span ${SITE.avAttrs(j)}></span>${esc(j.pseudo)}</button>`).join("");
  $("who").querySelectorAll("button[data-id]").forEach(b => b.onclick = () => { const id = b.dataset.id || null; sel = sel === id ? null : id; grand(); });
  grand();

  // fiches (cartes) des membres
  $("cards").innerHTML = J.map(j => {
    const pr = SITE.profil(j), av = SITE.avatarDe(j), col = SITE.TINT[SITE.dominante(pr && pr.P)][0];
    const chip = pr ? "" : j.reclame ? `<span class="chip">Quiz à faire</span>` : `<span class="chip free">Profil libre</span>`;
    const phare = pr && pr.res.familles.sur[0] ? pr.res.familles.sur[0].c.n : "—";
    return `<a class="pc${pr ? "" : " empty"}" href="profil.html?j=${j.id}" style="--t:${col}">
      <div class="art" ${av ? `data-art="${esc(av)}"` : ""}>${av ? "" : `<span class="bigini" aria-hidden="true">${esc(j.pseudo[0])}</span>`}<div class="mh">${SITE.hex(pr && pr.P.couleurs.dit, pr && pr.P.couleurs.afficheRevele, { color: col, question: !pr })}</div></div>
      <div class="body"><b>${esc(j.pseudo)}</b><div class="t">${pr ? esc(pr.titre + " · " + (SITE.GUILDES[pr.ident] || pr.ident)) : chip}</div>
      <div class="phare">Commandant phare : <strong>${esc(phare)}</strong><time>${pr ? tr("Profil mis à jour {d}", { d: SITE.depuis(j.maj) }) : tr(j.reclame ? "Réclamé, en attente du quiz" : "En attente de son propriétaire")}</time></div></div></a>`;
  }).join("") || `<p class="vide-g">Personne dans ce groupe pour l'instant.</p>`;

  // ajouter un ami au groupe (profil à réclamer, ou joueur déjà inscrit)
  if (dedans && gid !== "tous") {
    $("ajout").innerHTML = `<div class="section-title" style="padding-top:30px"><h2>Ajouter un ami</h2><p>Tape son prénom. S'il est déjà inscrit, il rejoint le groupe ; sinon, un profil « à réclamer » est créé à son nom.</p><div class="orn"><i></i><b></b><i></i></div></div>
      <form class="form-g" id="fa"><input id="ami" maxlength="24" placeholder="Prénom de ton ami" aria-label="Prénom de ton ami" list="tousJoueurs" required><button class="btn ghost-dark">Ajouter</button></form>
      <datalist id="tousJoueurs">${G.joueurs.filter(j => !C.membres.includes(j.id)).map(j => `<option value="${esc(j.pseudo)}">`).join("")}</datalist>
      <div class="err-g" id="eaj" role="alert"></div><div style="height:30px"></div>`;
    $("fa").onsubmit = async e => { e.preventDefault(); try { await ST.ajouterProfil(C.id, $("ami").value.trim()); location.reload(); } catch (er) { $("eaj").textContent = er.message; } };
  }

  // statistiques
  const dvTous = await pDv, ids = new Set(J.map(j => j.id)), dv = dvTous.filter(d => ids.has(d.cible) && ids.has(d.devineur));
  let S;
  if (nF) {
    const tri = QC.COULEURS.slice().sort((a, b) => moy[b] - moy[a]);
    const sc = {}; faits.forEach(x => x.P.topStyles.slice(0, 2).forEach(k => sc[k] = (sc[k] || 0) + 1));
    const pc = {}; faits.forEach(x => { const k = SITE.psyPrincipale(x.P); pc[k] = (pc[k] || 0) + 1; });
    const best = {}; dv.forEach(d => best[d.devineur] = Math.max(best[d.devineur] || 0, d.score));
    const champion = Object.entries(best).sort((a, b) => b[1] - a[1])[0];
    S = [["Profils complétés", `${nF} / ${J.length}`], ["Profils réclamés", `${nR} / ${J.length}`], ["Couleur reine", QC.NOMS_COULEURS[tri[0]]], ["Couleur oubliée", QC.NOMS_COULEURS[tri[5]]],
      ["Style le plus répandu", SITE.NOM_STYLE_COURT[Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0]]], ["Profil dominant", NOMPSY[Object.entries(pc).sort((a, b) => b[1] - a[1])[0][0]]],
      ["Devinettes jouées", dv.length], ["Meilleur devineur", champion && G.parId[champion[0]] ? `${G.parId[champion[0]].pseudo} (${champion[1]}/5)` : "—"]];
  } else S = [["Profils complétés", `0 / ${J.length}`], ["Profils réclamés", `${nR} / ${J.length}`], ["Couleur reine", "—"], ["Couleur oubliée", "—"], ["Style le plus répandu", "—"], ["Profil dominant", "—"], ["Devinettes jouées", dv.length], ["Meilleur devineur", "—"]];
  $("stats").innerHTML = S.map(([k, v]) => `<div class="stat"><small>${k}</small><b class="${v === "—" || v === 0 ? "zero" : ""}">${esc(v)}</b></div>`).join("");

  // face à face : n'importe quels joueurs de la communauté (membres du groupe en premier)
  const tousFaits = G.joueurs.filter(j => j.reponses).sort((a, b) => (ids.has(b.id) - ids.has(a.id)) || a.pseudo.localeCompare(b.pseudo))
    .map(j => { const pr = SITE.profil(j); return { j, P: pr.P, A: pr.A }; });
  if (tousFaits.length < 2) {
    $("duel").style.display = "none"; $("verdict").style.display = "none";
    $("cmpEmpty").innerHTML = `<div class="duel"><div class="side"><div class="pic ini">?</div></div><div class="score"><div class="pct zero">– %</div><small>COMPATIBILITÉ</small></div><div class="side"><div class="pic ini">?</div></div></div>
      <p class="ph" style="text-align:center;color:#B9B0C6">Le face-à-face s'ouvrira quand deux joueurs auront publié leur profil.</p>`;
  } else {
    const opt = x => `<option value="${x.j.id}">${esc(x.j.pseudo)}${ids.has(x.j.id) ? "" : tr(" (autre groupe)")}</option>`;
    const sa = $("sa"), sb = $("sb"); sa.innerHTML = sb.innerHTML = tousFaits.map(opt).join("");
    sa.value = moi && moi.reponses ? moi.id : tousFaits[0].j.id; sb.value = tousFaits.find(x => x.j.id !== sa.value).j.id;
    const comparer = () => {
      const a = tousFaits.find(x => x.j.id === sa.value), b = tousFaits.find(x => x.j.id === sb.value);
      ["pa", "pb"].forEach((id, i) => { const el = $(id), j = [a, b][i].j, av = SITE.avatarDe(j); el.className = "pic"; el.textContent = ""; el.style.backgroundImage = ""; if (av) { el.removeAttribute("data-ini"); el.setAttribute("data-art", av); } else { el.removeAttribute("data-art"); el.setAttribute("data-ini", j.pseudo[0]); } });
      const c = QC.compatibilite(a.P, b.P);
      $("pct").textContent = (a === b ? 100 : c.pct) + " %";
      $("duohex").innerHTML = SITE.hex(null, null, { grid: "#4A4058", extra: `<polygon points="${SITE.hexPoly(fin(a))}" fill="${SITE.TINT[SITE.dominante(a.P)][0]}" fill-opacity=".45" stroke="#E9D7AE"/><polygon points="${SITE.hexPoly(fin(b))}" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="5 4"/>` });
      const opp = c.oppositions.map(o => esc(tr("{p} est bien plus attiré par {c}", { p: (o.plus === "A" ? a : b).j.pseudo, c: QC.NOMS_COULEURS[o.c] })));
      const ka = SITE.psyPrincipale(a.P), kb = SITE.psyPrincipale(b.P);
      if (ka !== kb) opp.push(esc(tr("{a} est plutôt {x}, {b} plutôt {y}", { a: a.j.pseudo, x: NOMPSY[ka], b: b.j.pseudo, y: NOMPSY[kb] })));
      const da = SITE.deteste(a.A, a.P); if (da) opp.push(esc(tr("{b} devrait éviter ce que {a} ne veut plus affronter : {d}", { b: b.j.pseudo, a: a.j.pseudo, d: da })));
      $("common").innerHTML = c.communs.map(x => `<li>${esc(x.charAt(0).toUpperCase() + x.slice(1))}</li>`).join("") || "<li>Pas grand-chose… idéal pour des parties variées !</li>";
      $("oppo").innerHTML = opp.slice(0, 4).map(x => `<li>${x}</li>`).join("") || "<li>Presque rien : vous jouez de façon très proche.</li>";
      SITE.images($("duel"));
    };
    sa.onchange = sb.onchange = comparer; comparer();
  }
  SITE.images();
})();
