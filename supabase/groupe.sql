-- =====================================================================
-- Création du groupe et des profils de départ. À lancer UNE FOIS après schema.sql.
-- AVANT de lancer : remplace les deux codes ci-dessous par les tiens.
--   - code du groupe : celui que tu donnes à tes amis (insensible aux majuscules)
--   - code administrateur : à garder pour toi (débloquer ou libérer un profil)
-- =====================================================================
set search_path = public, extensions;
with g as (
  insert into groupes (nom, code_hash, admin_hash)
  values ('La table', crypt(lower('REMPLACE-MOI-code-du-groupe'), gen_salt('bf')), crypt('REMPLACE-MOI-code-admin', gen_salt('bf')))
  returning id
)
insert into joueurs (groupe, pseudo)
select g.id, p from g, unnest(array['Ben', 'Ilyes', 'Clement', 'Filipe']) as p;
