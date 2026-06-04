-- =====================================================
-- Security: enable RLS on 6 tables flagged by Supabase advisor
-- Applied: 2026-06-03
-- =====================================================
-- These tables had RLS disabled. The anon key is exposed in client-side
-- JS (js/supabase-client.js, js/newsletter.js), so anyone on the public web
-- could read every row via the PostgREST API.
--
-- Strategy:
--   - All 6: enable RLS. Default-deny — only service_role bypasses.
--   - context_snapshots, backup_logs: also allow Adi (by email) to read/write,
--     because spaces/admin/devcontrol.js queries these directly from the
--     browser using the anon key + her authenticated session.
--   - email_list, practice_templates, practice_clients, client_documents:
--     no client-side code in this repo references them, so service_role-only
--     is the safest baseline. If a use case surfaces, add a scoped policy
--     in a follow-up migration.
-- =====================================================

-- 1. email_list (59 rows — likely contains email addresses → PII)
ALTER TABLE public.email_list ENABLE ROW LEVEL SECURITY;

-- 2. context_snapshots (devcontrol dashboard reads/upserts daily)
ALTER TABLE public.context_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY context_snapshots_admin ON public.context_snapshots
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('its.adimarie@gmail.com', 'adimarie@bodyworkandbotanicals.com'))
  WITH CHECK ((auth.jwt() ->> 'email') IN ('its.adimarie@gmail.com', 'adimarie@bodyworkandbotanicals.com'));

-- 3. backup_logs (devcontrol dashboard reads activity log)
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY backup_logs_admin ON public.backup_logs
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('its.adimarie@gmail.com', 'adimarie@bodyworkandbotanicals.com'))
  WITH CHECK ((auth.jwt() ->> 'email') IN ('its.adimarie@gmail.com', 'adimarie@bodyworkandbotanicals.com'));

-- 4. practice_templates (1 row — config / template data)
ALTER TABLE public.practice_templates ENABLE ROW LEVEL SECURITY;

-- 5. practice_clients (3 rows — likely PII)
ALTER TABLE public.practice_clients ENABLE ROW LEVEL SECURITY;

-- 6. client_documents (5 rows — likely PII, possibly intake / medical)
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
