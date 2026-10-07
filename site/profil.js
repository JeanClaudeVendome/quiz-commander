/* =====================================================================
   Le grand quiz Commander — page profil d'un joueur.
   ===================================================================== */
(async function () {
  "use strict";
  const QC = window.QC, ST = window.QCStock, $ = SITE.$, esc = SITE.esc;
  if (!(await SITE.demarrer("Mon profil"))) return;
  const G = await SITE.groupe(), moi = SITE.moi();
  const j = G.parId[SITE.param("j")] || moi || G.joueurs[0];
  if (!j) { $("corps").innerHTML = `<p class="chargement">Aucun joueur dans ce groupe.</p>`; return; }
  const estMoi = moi && moi.id === j.id;
  if (!estMoi) document.querySelectorAll("#mainnav [aria-current]").forEach(a => a.removeAttribute("aria-current"));
  const pHist = ST.historique(j.id).catch(() => []); // en parallèle de l'affichage
  const pr = SITE.profil(j);
  document.title = j.pseudo + " — Le grand quiz Commander";
  $("hname").textContent = j.pseudo;
  $("hsub").textContent = SITE.statut(j).toUpperCase();
  if (SITE.param("nouveau") && estMoi) $("bandeau").innerHTML = `<div class="bandeau" role="status">Ta fiche est publiée : tout le groupe peut la voir.</div>`; setTimeout(() => { const b = document.querySelector(".bandeau"); if (b) { b.style.opacity = 0; setTimeout(() => b.remove(), 700); } }, 5000);
  const FAM = [["surprise", "La surprise cohérente"], ["sur", "Le choix sûr"], ["horsZone", "Hors de ta zone"]];
  const gs = SITE.cerclesDe(j);
  const groupesHTML = `<p style="margin:10px 0 0">${gs.map(c => `<a class="chipg" href="groupe.html?g=${c.id}">${esc(c.nom)}</a>`).join("") || `<span class="ph">Dans aucun groupe pour l'instant.</span>`}${estMoi ? ` <a class="chipg" href="groupe.html" style="border-style:dashed">+ groupes</a>` : ""}</p>`;

  if (pr) {
    const P = pr.P, A = pr.A, res = pr.res;
    SITE.teinter(P);
    const av = SITE.avatarDe(j);
    if (av) { $("hero").setAttribute("data-art", av); $("hero").dataset.credit = "cr1"; }
    const contra = SITE.contradiction(P), cit = SITE.citation(A), det = SITE.deteste(A, P), fav = (A.favcards || [])[0];
    $("left").innerHTML = `<div class="kicker">Profil ${j.mode === "confirme" ? "confirmé" : "découverte"} · version du ${esc(SITE.dateLongue(j.maj))}</div>${groupesHTML}
      <h2 class="name">${esc(SITE.devise(P))}</h2>
      <h3>Qui c'est</h3><p>${esc(SITE.texteQui(P))}</p>${contra ? `<p class="contra">${esc(contra)}</p>` : ""}
      ${cit ? `<div class="quote">« ${esc(cit)} »</div>` : ""}
      <h3>Ne veut plus affronter</h3><p>${det ? esc(det.charAt(0).toUpperCase() + det.slice(1)) + "." : '<span class="ph">Rien de particulier.</span>'}</p>
      <h3>Carte fétiche</h3><p>${fav ? esc(fav.n || fav) : '<span class="ph">Non renseignée.</span>'}</p>
      ${estMoi ? `<div class="actions"><a class="btn ghost-dark" href="quiz.html">Refaire le quiz</a><button class="btn ghost-dark" id="chAv">Changer d'avatar</button></div><div id="avZone"></div>` : `<div class="actions"><a class="btn ghost-dark" href="devine.html?j=${j.id}">Deviner ses réponses</a></div>`}`;
    $("wm").style.backgroundImage = `url("https://svgs.scryfall.io/card-symbols/${SITE.dominante(P)}.svg")`;
    $("hex").innerHTML = SITE.hex(P.couleurs.dit, P.couleurs.afficheRevele, { labels: true, aria: "Hexagone des couleurs de " + j.pseudo });
    // styles : les six plus forts
    $("styles").innerHTML = P.topStyles.slice(0, 6).map(k => `<div class="style"><div class="tile"><img data-art="${esc(SITE.STYLE_ART[k])}" alt=""><span class="pct">${Math.round((P.styles[k] + 1) / 2 * 100)} %</span></div><div class="lab">${esc(SITE.NOM_STYLE_COURT[k])}</div></div>`).join("");
    // commandants : une carte par famille
    $("cmdrs").innerHTML = FAM.map(([f, lab], i) => { const x = res.familles[f][0];
      if (!x) return `<div class="cm side"><div class="back">?</div><div class="tag"><b>${lab}</b></div></div>`;
      return `<div class="cm ${i === 1 ? "mid" : "side"}"><img src="${esc(x.c.img || "")}" alt="${esc(x.c.n)}" loading="lazy"><div class="pctbig">${x.pct}%</div>
        <div class="tag"><b>${lab}</b><span>${esc(x.c.fr && x.c.fr !== x.c.n ? x.c.fr : x.c.n)}</span></div>
        <div class="why">${esc(x.pourquoi.slice(0, 2).join(" ; "))}</div>${x.attention[0] ? `<div class="warn">⚠ ${esc(x.attention[0])}</div>` : ""}</div>`; }).join("");
    // toutes les propositions, par famille, avec explications
    const ligne = x => `<li><a class="mini" href="${esc(x.c.sf || "#")}" target="_blank" rel="noopener" style="background-image:url('${esc(x.c.img || "")}')" aria-label="${esc(x.c.n)} sur Scryfall"></a><div>
      <b>${esc(x.c.n)} ${SITE.pips(x.c.ci, 14)}</b>${x.c.fr && x.c.fr !== x.c.n ? `<small class="fr">${esc(x.c.fr)}</small>` : ""}
      <span class="pct">${x.pct} %</span> <small>${(x.c.t || []).map(k => SITE.NOM_STYLE_COURT[k]).join(" · ")} · puissance ${(x.c.p || 2).toFixed(1)}${x.c.usd != null ? " · ~" + Math.round(x.c.usd) + " €" : ""}</small>
      <small>${esc(x.pourquoi.join(" ; "))}</small>${x.attention.length ? `<small style="color:#9A5A10">⚠ ${esc(x.attention.join(" ; "))}</small>` : ""}
      ${x.c.cb && x.c.cb.ex && x.c.cb.ex[0] ? `<div class="combo">Combo connu : avec ${esc(x.c.cb.ex[0].avec.join(" + "))}${x.c.cb.ex[0].fait.length ? " (" + esc(x.c.cb.ex[0].fait.join(", ")) + ")" : ""}</div>` : ""}
      ${x.c.pc && x.c.pc.length ? `<small>Préconstruit : ${esc(x.c.pc[0])}</small>` : ""}</div></li>`;
    $("toutes").innerHTML = `<details class="toutes"><summary>Toutes ses propositions, avec les explications</summary><ul class="liste">${FAM.map(([f, lab]) => `<li class="fam-sec">${lab.toUpperCase()}</li>` + res.familles[f].map(ligne).join("")).join("")}
      <li class="fam-sec">LE CLASSEMENT GÉNÉRAL</li>${res.classement.map(ligne).join("")}</ul></details>`;
    // historique
    SITE.images();
    const H = await pHist;
    $("hist").innerHTML = H.length > 1 ? H.slice(-5).map(v => { const Pv = QC.mesurer(v.reponses, v.mode);
      return `<div>${SITE.hex(Pv.couleurs.dit, Pv.couleurs.afficheRevele, { aria: "Hexagone du " + SITE.dateLongue(v.date) })}<br>${esc(SITE.dateLongue(v.date))}</div>`; }).join("")
      : `<p class="ph">Une seule version pour l'instant : l'évolution apparaîtra à la prochaine version du quiz.</p>`;
    if (estMoi) $("chAv").onclick = () => {
      const opts = [...new Set([...res.familles.sur, ...res.familles.surprise, ...res.classement].map(x => x.c.n))].slice(0, 10);
      $("avZone").innerHTML = `<div class="avchoix">${opts.map(n => `<button data-av="${esc(n)}" data-art="${esc(n)}" aria-label="${esc(n)}" title="${esc(n)}" aria-pressed="${n === av}"></button>`).join("")}</div>`;
      SITE.images($("avZone"));
      $("avZone").querySelectorAll("[data-av]").forEach(b => b.onclick = async () => { try { await ST.avatar(b.dataset.av); location.reload(); } catch (e) { alert(e.message); } });
    };
  } else {
    /* profil vide : réservé ou libre */
    $("hero").classList.add("empty");
    $("hero").insertAdjacentHTML("afterbegin", `<div class="wmk"></div>`);
    let txt, cta = "";
    if (!j.reclame) { txt = `Ce profil attend son propriétaire. Si tu es ${esc(j.pseudo)}, réclame-le : il sera verrouillé à ton nom, et personne d'autre ne pourra le prendre.`; cta = `<a class="btn ghost-dark" href="qui.html?j=${j.id}">C'est moi, je le réclame</a>`; }
    else if (estMoi) { txt = "Ton profil est réservé. Fais le quiz pour remplir cette page : ton hexagone, tes styles de jeu et tes commandants apparaîtront ici."; cta = `<a class="btn ghost-dark" href="quiz.html">Faire le quiz</a>`; }
    else txt = `${esc(j.pseudo)} a réclamé son profil, mais n'a pas encore fait le quiz. Reviens bientôt !`;
    $("left").innerHTML = `<div class="kicker">${j.reclame ? "Profil réservé" : "Profil libre"}</div>${groupesHTML}<h2 class="name">Une page encore blanche</h2><p>${txt}</p>
      <h3>Qui c'est</h3><p class="ph">À découvrir</p><h3>Ne veut plus affronter</h3><p class="ph">À découvrir</p><h3>Carte fétiche</h3><p class="ph">À découvrir</p>${cta ? `<div class="cta">${cta}</div>` : ""}`;
    $("hex").innerHTML = SITE.hex(null, null, { labels: true, question: true });
    $("styles").innerHTML = Array.from({ length: 6 }, () => `<div class="style"><div class="tile empty">?<span class="pct">0 %</span></div><div class="lab ph">À découvrir</div></div>`).join("");
    $("cmdrs").innerHTML = FAM.map(([, fam], i) => `<div class="cm ${i === 1 ? "mid" : "side"}"><div class="back">?</div><div class="tag"><b>${fam}</b><span class="ph">Après le quiz</span></div></div>`).join("");
    $("hist").innerHTML = `<p class="ph">Aucune version publiée pour l'instant.</p>`;
  }
  $("others").innerHTML = G.joueurs.map(x => `<a href="profil.html?j=${x.id}" ${SITE.avAttrs(x)} title="${esc(x.pseudo)}" aria-label="${esc(x.pseudo)}" aria-current="${x.id === j.id}"></a>`).join("");
  SITE.images();
})();
