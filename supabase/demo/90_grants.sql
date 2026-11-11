-- Permissões equivalentes às padrão do Supabase (o acesso real é decidido pelo RLS).
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
grant execute on all functions in schema public, auth, storage, extensions to anon, authenticated, service_role;
-- igual ao Supabase: views públicas expostas; tabelas protegidas por RLS
