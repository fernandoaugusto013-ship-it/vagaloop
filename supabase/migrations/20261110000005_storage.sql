-- VagaLoop — Fase 1 · 05 · Storage
-- resumes: privado, caminho {user_id}/{arquivo}. logos: público, caminho {company_id}/{arquivo}.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('resumes', 'resumes', false, 5242880,
   array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "cv: dono envia na própria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cv: dono lê; empresa só após contratação" on storage.objects
  for select to authenticated
  using (bucket_id = 'resumes' and (
           (storage.foldername(name))[1] = auth.uid()::text
           or public.is_admin()
           or public.contact_unlocked_for_me(((storage.foldername(name))[1])::uuid)));
create policy "cv: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logo: time da empresa envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy "logo: time da empresa substitui" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy "logo: leitura pública" on storage.objects
  for select to anon, authenticated using (bucket_id = 'logos');
