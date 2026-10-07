-- =====================================================================
-- Le grand quiz Commander — migration « plusieurs groupes » (octobre 2026)
-- À coller UNE FOIS dans Supabase (SQL Editor → New query → Run), AVANT d'envoyer le nouveau site sur GitHub.
-- Peut être relancée sans danger : elle ne crée rien en double et ne supprime aucune donnée.
--
-- Avant : un « groupe » = un code d'accès + ses joueurs.
-- Après : la table « groupes » devient la COMMUNAUTÉ (toujours le même code d'accès, inchangé), et à l'intérieur,
--         des groupes de jeu (table « cercles ») que chacun peut créer, rejoindre ou quitter. Un joueur peut être
--         dans plusieurs groupes. Tout le monde voit tout le monde dans la communauté.
-- Tes joueurs actuels forment le premier groupe, « La table ».
-- =====================================================================
set search_path = public, extensions;

create table if not exists cercles (
  id uuid primary key default gen_random_uuid(),
  communaute uuid not null references groupes(id) on delete cascade,
  nom text not null check (char_length(nom) between 1 and 40),
  cree_par uuid references joueurs(id) on delete set null,
  cree_le timestamptz not null default now(),
  unique (communaute, nom)
);

create table if not exists membres (
  cercle uuid not null references cercles(id) on delete cascade,
  joueur uuid not null references joueurs(id) on delete cascade,
  ajoute_le timestamptz not null default now(),
  primary key (cercle, joueur)
);
create index if not exists membres_joueur on membres(joueur);

alter table cercles enable row level security;
alter table membres enable row level security;
-- aucune politique : comme pour les autres tables, seules les fonctions ci-dessous y accèdent.

-- Reprise de l'existant : un groupe « La table » par communauté, avec tous ses joueurs actuels
insert into cercles (communaute, nom)
  select g.id, 'La table' from groupes g where not exists (select 1 from cercles c where c.communaute = g.id);
insert into membres (cercle, joueur)
  select c.id, j.id from cercles c join joueurs j on j.groupe = c.communaute where c.nom = 'La table'
  on conflict do nothing;

-- ---------------------------------------------------------------- lecture
-- Tous les joueurs de la communauté (dernière version publiée + leurs groupes)
create or replace function groupe_joueurs(p_code text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin
  return coalesce((select json_agg(x order by x.cree_le) from (
    select j.id, j.pseudo, j.avatar, j.pin_hash is not null as reclame, j.reclame_le, j.cree_le,
           v.mode, v.reponses, v.cree_le as maj, v.version_quiz,
           (select count(*) from versions vv where vv.joueur = j.id) as nb_versions,
           coalesce((select json_agg(m.cercle) from membres m where m.joueur = j.id), '[]'::json) as cercles
    from joueurs j
    left join lateral (select * from versions where joueur = j.id order by cree_le desc limit 1) v on true
    where j.groupe = g) x), '[]'::json);
end $$;

create or replace function cercles_liste(p_code text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin
  return coalesce((select json_agg(json_build_object('id', c.id, 'nom', c.nom, 'cree_par', c.cree_par, 'cree_le', c.cree_le,
      'membres', coalesce((select json_agg(m.joueur order by m.ajoute_le) from membres m where m.cercle = c.id), '[]'::json)) order by c.cree_le)
    from cercles c where c.communaute = g), '[]'::json);
end $$;

-- Fil des nouvelles : on ajoute la création des groupes (colonne « nom »)
create or replace function groupe_nouvelles(p_code text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin
  return coalesce((select json_agg(x order by x.date desc) from (
    (select 'reclame' as type, j.id as joueur, null::uuid as cible, null::int as score, null::text as nom, j.reclame_le as date from joueurs j where j.groupe = g and j.reclame_le is not null)
    union all
    (select 'publie', v.joueur, null, null, null, v.cree_le from versions v join joueurs j on j.id = v.joueur where j.groupe = g)
    union all
    (select 'devine', d.devineur, d.cible, d.score, null, d.cree_le from devinettes d join joueurs j on j.id = d.devineur where j.groupe = g)
    union all
    (select 'cercle', c.cree_par, null, null, c.nom, c.cree_le from cercles c where c.communaute = g and c.cree_par is not null)
    order by date desc limit 30) x), '[]'::json);
end $$;

-- ---------------------------------------------------------------- écriture (code personnel exigé)
create or replace function cercle_creer(p_code text, p_joueur uuid, p_pin text, p_nom text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare j uuid := _joueur(p_code, p_joueur, p_pin); g uuid := _groupe(p_code); cid uuid;
begin
  if j is null then return json_build_object('erreur', 'CODE_PERSO'); end if;
  if char_length(trim(p_nom)) < 1 then raise exception 'NOM_VIDE'; end if;
  if (select count(*) from cercles where communaute = g) >= 30 then raise exception 'TROP_DE_GROUPES'; end if;
  insert into cercles (communaute, nom, cree_par) values (g, left(trim(p_nom), 40), j) returning id into cid;
  insert into membres (cercle, joueur) values (cid, j);
  return json_build_object('id', cid);
exception when unique_violation then raise exception 'NOM_PRIS';
end $$;

create or replace function cercle_rejoindre(p_code text, p_joueur uuid, p_pin text, p_cercle uuid) returns json language plpgsql security definer set search_path = public, extensions as $$
declare j uuid := _joueur(p_code, p_joueur, p_pin); g uuid := _groupe(p_code);
begin
  if j is null then return json_build_object('erreur', 'CODE_PERSO'); end if;
  if not exists (select 1 from cercles where id = p_cercle and communaute = g) then raise exception 'GROUPE_INCONNU'; end if;
  insert into membres (cercle, joueur) values (p_cercle, j) on conflict do nothing;
  return json_build_object('ok', true);
end $$;

create or replace function cercle_quitter(p_code text, p_joueur uuid, p_pin text, p_cercle uuid) returns json language plpgsql security definer set search_path = public, extensions as $$
declare j uuid := _joueur(p_code, p_joueur, p_pin);
begin
  if j is null then return json_build_object('erreur', 'CODE_PERSO'); end if;
  delete from membres where cercle = p_cercle and joueur = j;
  return json_build_object('ok', true);
end $$;

-- Ajouter à son groupe un profil « à réclamer » (un ami qui n'est pas encore venu), ou un joueur déjà inscrit
create or replace function cercle_ajouter_profil(p_code text, p_joueur uuid, p_pin text, p_cercle uuid, p_pseudo text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare j uuid := _joueur(p_code, p_joueur, p_pin); g uuid := _groupe(p_code); cible uuid;
begin
  if j is null then return json_build_object('erreur', 'CODE_PERSO'); end if;
  if not exists (select 1 from membres m join cercles c on c.id = m.cercle where m.cercle = p_cercle and m.joueur = j and c.communaute = g) then raise exception 'PAS_MEMBRE'; end if;
  select id into cible from joueurs where groupe = g and lower(pseudo) = lower(trim(p_pseudo));
  if cible is null then
    if char_length(trim(p_pseudo)) < 1 then raise exception 'NOM_VIDE'; end if;
    if (select count(*) from joueurs where groupe = g) >= 80 then raise exception 'GROUPE_PLEIN'; end if;
    insert into joueurs (groupe, pseudo) values (g, left(trim(p_pseudo), 24)) returning id into cible;
  end if;
  insert into membres (cercle, joueur) values (p_cercle, cible) on conflict do nothing;
  return json_build_object('id', cible);
end $$;

-- Supprimer un groupe : seulement par son créateur (les joueurs et leurs profils ne sont pas touchés)
create or replace function cercle_supprimer(p_code text, p_joueur uuid, p_pin text, p_cercle uuid) returns json language plpgsql security definer set search_path = public, extensions as $$
declare j uuid := _joueur(p_code, p_joueur, p_pin);
begin
  if j is null then return json_build_object('erreur', 'CODE_PERSO'); end if;
  if not exists (select 1 from cercles where id = p_cercle and cree_par = j) then raise exception 'PAS_CREATEUR'; end if;
  delete from cercles where id = p_cercle;
  return json_build_object('ok', true);
end $$;

grant execute on function cercles_liste(text), cercle_creer(text, uuid, text, text), cercle_rejoindre(text, uuid, text, uuid),
  cercle_quitter(text, uuid, text, uuid), cercle_ajouter_profil(text, uuid, text, uuid, text), cercle_supprimer(text, uuid, text, uuid) to anon;
