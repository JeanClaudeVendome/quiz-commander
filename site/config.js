/* Configuration du stockage partagé.
   Laisse vide pour le mode LOCAL : tout reste dans ton navigateur (pratique pour tester, mais rien n'est partagé).
   Pour partager les profils avec le groupe, crée un projet Supabase (voir LISEZ-MOI, « Profils partagés »)
   et colle ici l'adresse du projet et sa clé publique « anon » (Project Settings → API).
   La clé « anon » est faite pour être publique : la sécurité repose sur le code du groupe (voir supabase/schema.sql). */
window.QC_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};
