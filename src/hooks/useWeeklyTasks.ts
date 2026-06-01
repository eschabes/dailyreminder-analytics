import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyTask } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const LOCAL_KEY = 'weeklyTasks';
const MIGRATED_KEY_PREFIX = 'weeklyTasks_migrated_';

type Row = {
  id: string;
  name: string;
  completed_days: string[];
  completion_counts: Record<string, number> | null;
  interval: number | null;
  position: number;
  created_at: string;
  updated_at: string;
};

const rowToTask = (r: Row): WeeklyTask => ({
  id: r.id,
  name: r.name,
  completedDays: r.completed_days || [],
  completionCounts: r.completion_counts || {},
  interval: r.interval ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function useWeeklyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('weekly_tasks')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      toast.error('Failed to load tasks', { description: error.message });
      return;
    }
    setTasks((data as Row[]).map(rowToTask));
  }, [user]);

  // Initial load + one-time migration of localStorage data
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const migratedFlag = MIGRATED_KEY_PREFIX + user.id;
      const { data, error } = await supabase
        .from('weekly_tasks')
        .select('*')
        .order('position', { ascending: true });
      if (error) {
        toast.error('Failed to load tasks', { description: error.message });
        setLoading(false);
        return;
      }
      const rows = (data as Row[]) || [];

      // Migrate localStorage if cloud is empty and we have local data and not yet migrated
      if (rows.length === 0 && !localStorage.getItem(migratedFlag)) {
        try {
          const raw = localStorage.getItem(LOCAL_KEY);
          if (raw) {
            const local: WeeklyTask[] = JSON.parse(raw);
            if (Array.isArray(local) && local.length > 0) {
              const inserts = local.map((t, i) => ({
                user_id: user.id,
                name: t.name,
                completed_days: t.completedDays || [],
                completion_counts: t.completionCounts || {},
                interval: t.interval ?? null,
                position: i,
              }));
              const { error: insErr } = await supabase.from('weekly_tasks').insert(inserts);
              if (insErr) {
                toast.error('Migration failed', { description: insErr.message });
              } else {
                toast.success('Imported your local tasks to the cloud');
                localStorage.setItem(migratedFlag, '1');
                const { data: after } = await supabase
                  .from('weekly_tasks')
                  .select('*')
                  .order('position', { ascending: true });
                setTasks(((after as Row[]) || []).map(rowToTask));
                setLoading(false);
                return;
              }
            }
          }
          localStorage.setItem(migratedFlag, '1');
        } catch (e) {
          console.error('migration error', e);
        }
      }
      setTasks(rows.map(rowToTask));
      setLoading(false);
    })();
  }, [user]);

  const addTask = useCallback(async (name: string, interval?: number) => {
    if (!user) return;
    const position = tasks.length;
    const { data, error } = await supabase
      .from('weekly_tasks')
      .insert({
        user_id: user.id,
        name,
        interval: interval ?? null,
        position,
      })
      .select()
      .single();
    if (error) {
      toast.error('Failed to add task', { description: error.message });
      return;
    }
    setTasks((prev) => [...prev, rowToTask(data as Row)]);
  }, [user, tasks.length]);

  const updateTask = useCallback(async (id: string, patch: Partial<WeeklyTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const dbPatch: any = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.completedDays !== undefined) dbPatch.completed_days = patch.completedDays;
    if (patch.completionCounts !== undefined) dbPatch.completion_counts = patch.completionCounts;
    if (patch.interval !== undefined) dbPatch.interval = patch.interval ?? null;
    const { error } = await supabase.from('weekly_tasks').update(dbPatch).eq('id', id);
    if (error) toast.error('Failed to save', { description: error.message });
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from('weekly_tasks').delete().eq('id', id);
    if (error) toast.error('Failed to delete', { description: error.message });
  }, []);

  const reorder = useCallback(async (newOrder: WeeklyTask[]) => {
    setTasks(newOrder);
    const updates = newOrder.map((t, i) =>
      supabase.from('weekly_tasks').update({ position: i }).eq('id', t.id)
    );
    await Promise.all(updates);
  }, []);

  return { tasks, setTasks, loading, addTask, updateTask, deleteTask, reorder, reload };
}