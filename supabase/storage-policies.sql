-- Create a public bucket named story-images in the Supabase dashboard first.
-- Then run these policies in the SQL editor.

drop policy if exists "Story images are publicly readable" on storage.objects;
create policy "Story images are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'story-images');

drop policy if exists "Owners can upload story images to their folder" on storage.objects;
create policy "Owners can upload story images to their folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'story-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.story_owners
    where story_owners.user_id = auth.uid()
  )
);

drop policy if exists "Owners can update story images in their folder" on storage.objects;
create policy "Owners can update story images in their folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'story-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.story_owners
    where story_owners.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'story-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.story_owners
    where story_owners.user_id = auth.uid()
  )
);

drop policy if exists "Owners can delete story images in their folder" on storage.objects;
create policy "Owners can delete story images in their folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'story-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.story_owners
    where story_owners.user_id = auth.uid()
  )
);
