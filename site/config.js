/* Configuration du stockage partagé.
   Laisse vide pour le mode LOCAL : tout reste dans ton navigateur (pratique pour tester, mais rien n'est partagé).
   Pour partager les profils avec le groupe, crée un projet Supabase (voir LISEZ-MOI, « Profils partagés »)
   et colle ici l'adresse du projet et sa clé publique (Project Settings → API Keys : « Publishable key » sb_publishable_…,
   ou, dans « Legacy API Keys », la clé « anon » eyJ…). Jamais la clé « secret » ni « service_role ».
   La clé publique est faite pour être publique : la sécurité repose sur le code du groupe (voir supabase/schema.sql).
   Tant que supabaseAnonKey est vide, le site reste en mode local. */
window.QC_CONFIG = {
  supabaseUrl: "https://glnmfakwemeebtkeycfk.supabase.co",
  supabaseAnonKey: "sb_publishable_Wp6PNGIQTNqkJT0-H6bQoA_xDFe-lZ3"
};
