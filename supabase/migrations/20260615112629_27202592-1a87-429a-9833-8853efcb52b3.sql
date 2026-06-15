CREATE POLICY "Backend service can manage private settings"
ON public.app_private_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);