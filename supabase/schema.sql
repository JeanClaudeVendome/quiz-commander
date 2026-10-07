-- =====================================================================
-- Le grand quiz Commander — base de données Supabase
-- À coller UNE FOIS dans Supabase : SQL Editor → New query → Run. Voir LISEZ-MOI, section « Profils partagés ».
--
-- Sécurité :
--  - Les tables ne sont PAS lisibles directement (RLS activée, aucune règle) : tout passe par les fonctions
--    ci-dessous, qui vérifient le CODE DU GROUPE à chaque appel.
--  - Le code du groupe et les codes personnels (4 chiffres) sont stockés hachés (bcrypt via pgcrypto).
--  - Toute écriture au nom d'un joueur exige son code personnel.
--  - Limite connue : un code à 4 chiffres protège contre les erreurs entre amis, pas contre un attaquant
--    déterminé qui connaîtrait déjà le code du groupe. Ne mettez rien de sensible dans les réponses.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
set search_path = public, extensions;

create table if not exists groupes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  code_hash text not null,
  admin_hash text not null,
  cree_le timestamptz not null default now()
);

create table if not exists joueurs (
  id uuid primary key default gen_random_uuid(),
  groupe uuid not null references groupes(id) on delete cascade,
  pseudo text not null check (char_length(pseudo) between 1 and 24),
  avatar text,
  pin_hash text,                       -- null tant que le profil n'est pas réclamé
  reclame_le timestamptz,
  essais_rates int not null default 0, -- verrou après 10 codes faux d'affilée (déverrouillage par l'administrateur)
  cree_le timestamptz not null default now(),
  unique (groupe, pseudo)
);

create table if not exists versions (
  id uuid primary key default gen_random_uuid(),
  joueur uuid not null references joueurs(id) on delete cascade,
  mode text not null check (mode in ('commun', 'confirme')),
  reponses jsonb not null,
  version_quiz int not null default 4,
  cree_le timestamptz not null default now()
);
create index if not exists versions_joueur on versions(joueur, cree_le desc);

create table if not exists devinettes (
  id uuid primary key default gen_random_uuid(),
  devineur uuid not null references joueurs(id) on delete cascade,
  cible uuid not null references joueurs(id) on delete cascade,
  score int not null check (score between 0 and 10),
  sur int not null default 5,
  cree_le timestamptz not null default now()
);

alter table groupes enable row level security;
alter table joueurs enable row level security;
alter table versions enable row level security;
alter table devinettes enable row level security;
-- aucune politique : accès direct refusé à tous, seules les fonctions « security definer » ci-dessous lisent et écrivent.

-- ---------------------------------------------------------------- outils internes
create or replace function _groupe(p_code text) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare g uuid;
begin
  select id into g from groupes where code_hash = crypt(lower(trim(p_code)), code_hash) limit 1;
  if g is null then raise exception 'CODE_GROUPE'; end if;
  return g;
end $$;

-- Vérifie le code personnel. Code faux : renvoie NULL SANS lever d'exception, pour que le compteur d'essais
-- soit bien enregistré (une exception annulerait toute la transaction, compteur compris).
-- Les fonctions appelantes renvoient alors {"erreur": "CODE_PERSO"}.
create or replace function _joueur(p_code text, p_joueur uuid, p_pin text) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code); j joueurs;
begin
  select * into j from joueurs where id = p_joueur and groupe = g;
  if j.id is null then raise exception 'JOUEUR'; end if;
  if j.pin_hash is null then raise exception 'NON_RECLAME'; end if;
  if j.essais_rates >= 10 then raise exception 'VERROUILLE'; end if;
  if j.pin_hash <> crypt(p_pin, j.pin_hash) then
    update joueurs set essais_rates = essais_rates + 1 where id = j.id;
    return null;
  end if;
  update joueurs set essais_rates = 0 where id = j.id;
  return j.id;
end $$;

-- ---------------------------------------------------------------- lecture
create or replace function groupe_entrer(p_code text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin
  return (select json_build_object('id', id, 'nom', nom) from groupes where id = g);
end $$;

-- Tous les joueurs du groupe, avec leur dernière version publiée
create or replace function groupe_joueurs(p_code text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin
  return coalesce((select json_agg(x order by x.cree_le) from (
    select j.id, j.pseudo, j.avatar, j.pin_hash is not null as reclame, j.reclame_le, j.cree_le,
           v.mode, v.reponses, v.cree_le as maj, v.version_quiz,
           (select count(*) from versions vv where vv.joueur = j.id) as nb_versions
    from joueurs j
    left join lateral (select * from versions where joueur = j.id order by cree_le desc limit 1) v on true
    where j.groupe = g) x), '[]'::json);
end $$;

create or replace function joueur_historique(p_code text, p_joueur uuid) returns json language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin
  return coalesce((select json_agg(json_build_object('id', v.id, 'mode', v.mode, 'reponses', v.reponses, 'date', v.cree_le) order by v.cree_le)
    from versions v join joueurs j on j.id = v.joueur where j.id = p_joueur and j.groupe = g), '[]'::json);
end $$;

-- Fil des nouvelles : réclamations, publications, devinettes
create or replace function groupe_nouvelles(p_code text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin
  return coalesce((select json_agg(x order by x.date desc) from (
    (select 'reclame' as type, j.id as joueur, null::uuid as cible, null::int as score, j.reclame_le as date from joueurs j where j.groupe = g and j.reclame_le is not null)
    union all
    (select 'publie', v.joueur, null, null, v.cree_le from versions v join joueurs j on j.id = v.joueur where j.groupe = g)
    union all
    (select 'devine', d.devineur, d.cible, d.score, d.cree_le from devinettes d join joueurs j on j.id = d.devineur where j.groupe = g)
    order by date desc limit 30) x), '[]'::json);
end $$;

create or replace function groupe_devinettes(p_code text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin
  return coalesce((select json_agg(json_build_object('devineur', d.devineur, 'cible', d.cible, 'score', d.score, 'sur', d.sur, 'date', d.cree_le))
    from devinettes d join joueurs j on j.id = d.cible where j.groupe = g), '[]'::json);
end $$;

-- ---------------------------------------------------------------- écriture
create or replace function joueur_reclamer(p_code text, p_joueur uuid, p_pin text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin
  if p_pin !~ '^[0-9]{4}$' then raise exception 'FORMAT_PIN'; end if;
  update joueurs set pin_hash = crypt(p_pin, gen_salt('bf')), reclame_le = now()
    where id = p_joueur and groupe = g and pin_hash is null;
  if not found then raise exception 'DEJA_RECLAME'; end if;
  return json_build_object('id', p_joueur);
end $$;

create or replace function joueur_creer(p_code text, p_pseudo text, p_pin text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code); nid uuid;
begin
  if p_pin !~ '^[0-9]{4}$' then raise exception 'FORMAT_PIN'; end if;
  if (select count(*) from joueurs where groupe = g) >= 40 then raise exception 'GROUPE_PLEIN'; end if;
  insert into joueurs (groupe, pseudo, pin_hash, reclame_le) values (g, trim(p_pseudo), crypt(p_pin, gen_salt('bf')), now()) returning id into nid;
  return json_build_object('id', nid);
exception when unique_violation then raise exception 'PSEUDO_PRIS';
end $$;

-- Code personnel faux : ces fonctions renvoient {"erreur": "CODE_PERSO"} au lieu de lever une exception (voir _joueur).
drop function if exists joueur_avatar(text, uuid, text, text);
drop function if exists version_supprimer(text, uuid, text, uuid);
drop function if exists devinette_enregistrer(text, uuid, text, uuid, int, int);

create or replace function joueur_connexion(p_code text, p_joueur uuid, p_pin text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare j uuid := _joueur(p_code, p_joueur, p_pin);
begin
  if j is null then return json_build_object('erreur', 'CODE_PERSO'); end if;
  return json_build_object('id', j);
end $$;

create or replace function version_publier(p_code text, p_joueur uuid, p_pin text, p_mode text, p_reponses jsonb, p_avatar text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare j uuid := _joueur(p_code, p_joueur, p_pin); vid uuid;
begin
  if j is null then return json_build_object('erreur', 'CODE_PERSO'); end if;
  if octet_length(p_reponses::text) > 60000 then raise exception 'TROP_GROS'; end if;
  insert into versions (joueur, mode, reponses) values (j, p_mode, p_reponses) returning id into vid;
  if p_avatar is not null then update joueurs set avatar = left(p_avatar, 120) where id = j; end if;
  return json_build_object('id', vid);
end $$;

create or replace function joueur_avatar(p_code text, p_joueur uuid, p_pin text, p_avatar text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare j uuid := _joueur(p_code, p_joueur, p_pin);
begin
  if j is null then return json_build_object('erreur', 'CODE_PERSO'); end if;
  update joueurs set avatar = left(p_avatar, 120) where id = j;
  return json_build_object('ok', true);
end $$;

create or replace function version_supprimer(p_code text, p_joueur uuid, p_pin text, p_version uuid) returns json language plpgsql security definer set search_path = public, extensions as $$
declare j uuid := _joueur(p_code, p_joueur, p_pin);
begin
  if j is null then return json_build_object('erreur', 'CODE_PERSO'); end if;
  delete from versions where id = p_version and joueur = j;
  return json_build_object('ok', true);
end $$;

create or replace function devinette_enregistrer(p_code text, p_joueur uuid, p_pin text, p_cible uuid, p_score int, p_sur int) returns json language plpgsql security definer set search_path = public, extensions as $$
declare j uuid := _joueur(p_code, p_joueur, p_pin);
begin
  if j is null then return json_build_object('erreur', 'CODE_PERSO'); end if;
  if j = p_cible then raise exception 'SOI_MEME'; end if;
  insert into devinettes (devineur, cible, score, sur) values (j, p_cible, greatest(0, least(p_score, p_sur)), p_sur);
  return json_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- administration (code administrateur)
create or replace function admin_deverrouiller(p_code text, p_admin text, p_joueur uuid) returns void language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin
  if not exists (select 1 from groupes where id = g and admin_hash = crypt(p_admin, admin_hash)) then raise exception 'CODE_ADMIN'; end if;
  update joueurs set essais_rates = 0 where id = p_joueur and groupe = g;
end $$;

create or replace function admin_liberer(p_code text, p_admin text, p_joueur uuid) returns void language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin -- rend un profil « libre » (code personnel oublié) : ses versions sont conservées
  if not exists (select 1 from groupes where id = g and admin_hash = crypt(p_admin, admin_hash)) then raise exception 'CODE_ADMIN'; end if;
  update joueurs set pin_hash = null, reclame_le = null, essais_rates = 0 where id = p_joueur and groupe = g;
end $$;

create or replace function admin_supprimer_joueur(p_code text, p_admin text, p_joueur uuid) returns void language plpgsql security definer set search_path = public, extensions as $$
declare g uuid := _groupe(p_code);
begin
  if not exists (select 1 from groupes where id = g and admin_hash = crypt(p_admin, admin_hash)) then raise exception 'CODE_ADMIN'; end if;
  delete from joueurs where id = p_joueur and groupe = g;
end $$;

-- Les fonctions internes ne sont pas appelables de l'extérieur
revoke all on function _groupe(text), _joueur(text, uuid, text) from public, anon, authenticated;
grant execute on function groupe_entrer(text), groupe_joueurs(text), joueur_historique(text, uuid), groupe_nouvelles(text), groupe_devinettes(text),
  joueur_reclamer(text, uuid, text), joueur_creer(text, text, text), joueur_connexion(text, uuid, text),
  version_publier(text, uuid, text, text, jsonb, text), joueur_avatar(text, uuid, text, text), version_supprimer(text, uuid, text, uuid),
  devinette_enregistrer(text, uuid, text, uuid, int, int),
  admin_deverrouiller(text, text, uuid), admin_liberer(text, text, uuid), admin_supprimer_joueur(text, text, uuid) to anon;
