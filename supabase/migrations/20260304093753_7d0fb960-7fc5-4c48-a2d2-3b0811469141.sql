INSERT INTO storage.buckets (id, name, public)
VALUES ('editor-images', 'editor-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'editor-images');

CREATE POLICY "Public read access for editor images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'editor-images');

CREATE POLICY "Admins can delete editor images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'editor-images' AND public.has_role(auth.uid(), 'admin'));