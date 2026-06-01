
CREATE TABLE public.weekly_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  completed_days TEXT[] NOT NULL DEFAULT '{}',
  completion_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  interval INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_tasks TO authenticated;
GRANT ALL ON public.weekly_tasks TO service_role;

ALTER TABLE public.weekly_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
  ON public.weekly_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON public.weekly_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.weekly_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.weekly_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_weekly_tasks_user_id ON public.weekly_tasks(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_weekly_tasks_updated_at
  BEFORE UPDATE ON public.weekly_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
