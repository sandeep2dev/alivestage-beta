-- Public avatars bucket for artist profile photos (Supabase Storage)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Service role avatar insert" ON storage.objects;
CREATE POLICY "Service role avatar insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Service role avatar update" ON storage.objects;
CREATE POLICY "Service role avatar update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Service role avatar delete" ON storage.objects;
CREATE POLICY "Service role avatar delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars');
