# Cloud Story Composer Setup

This Composer lets the deployed Vercel site edit existing Pretty Little Maps Stories from an authenticated owner session. It uses Supabase Auth, Postgres, and Storage. It does not write to `src/data/stories.ts` or `public/` at runtime.

## 1. Create a Supabase Project

1. Create a Supabase project.
2. Open Project Settings > API.
3. Copy:
   - Project URL
   - Publishable anon key
4. Do not copy or use the service-role key in the browser.

## 2. Run the Database Migration

Open Supabase SQL Editor and run:

```sql
-- paste the contents of:
-- supabase/migrations/20260715_cloud_story_composer.sql
```

This creates `public.stories`, enables Row Level Security, and adds policies:

- anonymous users can read only `status = 'published'`
- authenticated owners can read, insert, and update only rows where `user_id = auth.uid()`
- anonymous users cannot insert or update
- `story_visibility_index()` exposes only slug, place ID, and status so the public app can hide static fallback when a cloud row is Draft

After signing in once, add your user ID to the owner allowlist:

```sql
insert into public.story_owners (user_id)
values ('your-auth-user-uuid')
on conflict (user_id) do nothing;
```

Without that row, even an authenticated user cannot write Story data.

## 3. Create the Storage Bucket

1. Open Supabase Storage.
2. Create a bucket named `story-images`.
3. Make it public if you want public image URLs to work directly in the static React app.
4. Run the policies in:

```text
supabase/storage-policies.sql
```

Images are stored as:

```text
<user-id>/<slug>/cover-<timestamp>.<ext>
<user-id>/<slug>/<timestamp>-<filename>
```

The policies allow authenticated users to upload, update, and delete only inside their own `<user-id>/` folder.
They also require the user to exist in `public.story_owners`.

## 4. Configure Email Login

In Supabase Authentication:

1. Enable Email provider.
2. Enable magic link / OTP email login.
3. Restrict sign-in operationally to your owner email. The database and storage policies also require your UUID in `public.story_owners`, so non-owner authenticated users still cannot write.
4. Add the deployed Vercel URL to allowed redirect URLs.
5. Add local development URLs while testing:

```text
http://localhost:5173
http://localhost:5173/compose/chengdu
```

For production, add:

```text
https://your-vercel-domain.vercel.app
https://your-vercel-domain.vercel.app/compose/chengdu
```

## 5. Add Environment Variables

Create local `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
```

In Vercel, add the same variables under Project Settings > Environment Variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Never add `SUPABASE_SERVICE_ROLE_KEY`, database passwords, or owner secrets to Vercel.

## 6. Seed Existing Stories

Get your owner user ID:

1. Sign in once through `/login`.
2. In Supabase, open Authentication > Users.
3. Copy your user UUID.
4. Insert that UUID into `public.story_owners` as shown above.

Generate seed SQL:

```bash
SUPABASE_OWNER_USER_ID="your-auth-user-uuid" npm run seed:stories
```

This writes:

```text
supabase/seed-stories.sql
```

Run that generated SQL in the Supabase SQL Editor. It uses `on conflict (slug) do update`, so re-running it will not create duplicate rows.

The seed preserves:

- slug
- placeId
- title
- status
- featured
- preview summary
- first text block body
- existing public cover and gallery URLs

Do not remove the static registry yet. The app still uses it as a fallback.

## 6b. Migrate Existing Story Images

After `public.stories` is seeded, migrate local files from `public/images/stories/` to Supabase Storage:

```bash
SUPABASE_URL="https://your-project-ref.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="local-only-service-role-key" \
SUPABASE_OWNER_USER_ID="your-auth-user-uuid" \
npm run migrate:story-images
```

The script uploads images to:

```text
story-images/<user-id>/<slug>/<existing-filename>
```

It preserves the slug folder, updates `cover_url` and `gallery_urls`, fetches every new public URL, and reports missing rows, broken links, and remaining `/images/stories/` references. The service-role key is for this local migration command only. Do not commit it, put it in `.env`, or add it to Vercel.

## 7. Test Login

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:5173/login
```

Enter the owner email, open the magic link, then open:

```text
http://localhost:5173/compose/chengdu
```

## 8. Test Composer Save

1. Change title, preview summary, body, status, or featured.
2. Upload a JPEG, PNG, or WebP cover.
3. Upload one or more JPEG, PNG, or WebP gallery images.
4. Click `Save Changes`.
5. Confirm `Saved · Draft` or `Saved · Published`.

HEIC/HEIF files are rejected with a clear message.

## 9. Deploy

1. Commit and push the code.
2. Confirm Vercel has:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

3. Redeploy.
4. Open:

```text
https://your-vercel-domain.vercel.app/login
https://your-vercel-domain.vercel.app/compose/chengdu
https://your-vercel-domain.vercel.app/stories/chengdu
```

The existing `vercel.json` SPA rewrite keeps direct refreshes safe.

## 10. Troubleshooting

### 401 or RLS errors when saving

- Confirm you are signed in.
- Confirm the row `user_id` matches your Supabase Auth user UUID.
- Confirm your UUID exists in `public.story_owners`.
- Confirm the stories table policies from the migration are installed.
- Confirm you are using the publishable anon key, not a service-role key.

### Upload denied

- Confirm bucket name is exactly `story-images`.
- Confirm storage policies were applied.
- Confirm the upload path starts with your signed-in user ID.
- Confirm your UUID exists in `public.story_owners`.
- Confirm the file is JPEG, PNG, or WebP.

### Published Story does not appear publicly

- Confirm `status = 'published'`.
- Confirm the public read policy exists.
- Confirm Vercel has the Supabase env vars.
- If Supabase is unavailable, the app falls back to `src/data/stories.ts`.

### Draft Story appears missing

That is expected for anonymous users. Draft cloud Stories are hidden from Featured Stories, the Story archive, Map previews, and Previous/Next navigation.
If Supabase is reachable, the app also suppresses the old static fallback for cloud rows marked Draft.
