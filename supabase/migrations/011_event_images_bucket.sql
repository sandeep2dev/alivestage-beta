-- Public bucket for inline event description images (Supabase Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public event image read" ON storage.objects;
CREATE POLICY "Public event image read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Service role event image insert" ON storage.objects;
CREATE POLICY "Service role event image insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Service role event image update" ON storage.objects;
CREATE POLICY "Service role event image update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Service role event image delete" ON storage.objects;
CREATE POLICY "Service role event image delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-images');
