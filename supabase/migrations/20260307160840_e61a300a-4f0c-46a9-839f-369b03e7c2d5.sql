
-- Create collect-uploads storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('collect-uploads', 'collect-uploads', false);

-- RLS: Only admins can upload
CREATE POLICY "Admins can upload collect files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'collect-uploads' AND public.has_role(auth.uid(), 'admin'));

-- RLS: Only admins can read
CREATE POLICY "Admins can read collect files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'collect-uploads' AND public.has_role(auth.uid(), 'admin'));

-- RLS: Only admins can delete
CREATE POLICY "Admins can delete collect files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'collect-uploads' AND public.has_role(auth.uid(), 'admin'));
