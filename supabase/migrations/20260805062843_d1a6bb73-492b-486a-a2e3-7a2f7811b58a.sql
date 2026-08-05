-- 1. Lock down SECURITY DEFINER / trigger functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2. admin_audit_log: explicit admin-only read
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
DROP POLICY IF EXISTS "Admins read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins read audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. organizations: admin-only write paths
DROP POLICY IF EXISTS "Admins insert organizations" ON public.organizations;
CREATE POLICY "Admins insert organizations"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update organizations" ON public.organizations;
CREATE POLICY "Admins update organizations"
ON public.organizations FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete organizations" ON public.organizations;
CREATE POLICY "Admins delete organizations"
ON public.organizations FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

-- 4. storage 'media': ownership-scoped write/update/delete
DROP POLICY IF EXISTS "Authenticated media upload" ON storage.objects;
CREATE POLICY "Owners upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND owner = auth.uid());

DROP POLICY IF EXISTS "Owners update media" ON storage.objects;
CREATE POLICY "Owners update media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role)))
WITH CHECK (bucket_id = 'media' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role)));

DROP POLICY IF EXISTS "Owners delete media" ON storage.objects;
CREATE POLICY "Owners delete media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role)));