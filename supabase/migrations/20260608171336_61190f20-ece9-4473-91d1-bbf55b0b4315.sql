
-- Push subscriptions (per device)
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
ON public.push_subscriptions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notification reminders (schedule rules)
CREATE TABLE public.notification_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_of_day text NOT NULL,             -- 'HH:MM' 24h, local clock
  days_of_week int[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sun..6=Sat
  timezone text NOT NULL DEFAULT 'UTC',
  message text,
  enabled boolean NOT NULL DEFAULT true,
  last_sent_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_reminders TO authenticated;
GRANT ALL ON public.notification_reminders TO service_role;

ALTER TABLE public.notification_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reminders"
ON public.notification_reminders FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_notification_reminders_updated_at
BEFORE UPDATE ON public.notification_reminders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable cron + http
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
