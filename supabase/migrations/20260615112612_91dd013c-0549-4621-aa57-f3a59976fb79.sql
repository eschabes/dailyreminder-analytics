CREATE TABLE IF NOT EXISTS public.app_private_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_private_settings TO service_role;

ALTER TABLE public.app_private_settings ENABLE ROW LEVEL SECURITY;