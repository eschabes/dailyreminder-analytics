import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, BellOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  disablePush,
  enablePush,
  getVapidPublicKey,
  isPushEnabled,
  pushSupported,
  syncPushSubscription,
} from "@/lib/push";
import { cn } from "@/lib/utils";

type Reminder = {
  id: string;
  time_of_day: string;
  days_of_week: number[];
  timezone: string;
  message: string | null;
  enabled: boolean;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Settings = () => {
  const { user } = useAuth();
  const [pushOn, setPushOn] = useState(false);
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSupported(pushSupported());
    isPushEnabled().then(async (enabled) => {
      if (enabled) {
        await syncPushSubscription();
      }
      setPushOn(enabled);
    });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_reminders")
      .select("*")
      .order("time_of_day", { ascending: true });
    if (error) toast.error(error.message);
    setReminders((data ?? []) as Reminder[]);
    setLoading(false);
  };

  const togglePush = async (next: boolean) => {
    setBusy(true);
    if (next) {
      const r = await enablePush();
      if (!r.ok) toast.error(r.reason || "Could not enable notifications");
      else toast.success("Notifications enabled on this device");
      setPushOn(await isPushEnabled());
    } else {
      await disablePush();
      toast.success("Notifications disabled on this device");
      setPushOn(false);
    }
    setBusy(false);
  };

  const refreshSubscription = async () => {
    setBusy(true);
    try {
      const r = await enablePush({ forceRefresh: true });
      if (!r.ok) {
        toast.error(r.reason || "Could not refresh notifications");
        return;
      }
      setPushOn(await isPushEnabled());
      toast.success("Notification subscription refreshed on this device");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        toast.error("Not signed in");
        return;
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminders?test=1`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );
      const json = await res.json();
      const vapidKey = await getVapidPublicKey();
      console.log(
        "[push test]",
        json,
        "client vapid prefix:",
        vapidKey.slice(0, 16),
      );
      if (!res.ok) {
        toast.error(json.error || "Test failed");
        return;
      }
      if (!json.subscriptions) {
        toast.error(
          "No push subscription on this device. Enable notifications first.",
        );
        return;
      }
      const okCount = (json.results || []).filter((r: any) => r.ok).length;
      const failed = (json.results || []).filter((r: any) => !r.ok);
      if (failed.length) {
        toast.error(
          `Push failed: ${failed[0].statusCode} ${failed[0].body || failed[0].message || ""}`,
        );
      } else {
        toast.success(`Sent test to ${okCount} device(s)`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addReminder = async () => {
    if (!user) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const { data, error } = await supabase
      .from("notification_reminders")
      .insert({
        user_id: user.id,
        time_of_day: "18:00",
        days_of_week: [1, 2, 3, 4, 5],
        timezone: tz,
        enabled: true,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setReminders((r) => [...r, data as Reminder]);
  };

  const updateReminder = async (id: string, patch: Partial<Reminder>) => {
    setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    // Reset last_sent_date so updated time can fire today
    const { error } = await supabase
      .from("notification_reminders")
      .update({ ...patch, last_sent_date: null })
      .eq("id", id);
    if (error) toast.error(error.message);
  };

  const deleteReminder = async (id: string) => {
    setReminders((rs) => rs.filter((r) => r.id !== id));
    const { error } = await supabase
      .from("notification_reminders")
      .delete()
      .eq("id", id);
    if (error) toast.error(error.message);
  };

  const toggleDay = (r: Reminder, day: number) => {
    const set = new Set(r.days_of_week);
    set.has(day) ? set.delete(day) : set.add(day);
    const days = [...set].sort();
    updateReminder(r.id, { days_of_week: days });
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background text-foreground pb-10">
      <header className="w-full bg-background pt-4 pb-2 px-2 sm:px-4 border-b border-border/40 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          <h1 className="text-base font-semibold">Settings</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="w-full max-w-2xl mx-auto px-3 sm:px-4 mt-6 space-y-6 flex-1">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold">
                {pushOn ? (
                  <Bell className="h-4 w-4 text-primary" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                Push notifications
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {supported
                  ? "Enable to receive reminders on this device, even when the app is closed."
                  : "This browser doesn't support push notifications. Try the installed PWA or a different browser."}
              </p>
            </div>
            <Switch
              checked={pushOn}
              disabled={!supported || busy}
              onCheckedChange={togglePush}
            />
          </div>
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Send a test notification right now.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={refreshSubscription}
                disabled={busy || !supported}
              >
                Refresh device
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={sendTest}
                disabled={busy || !pushOn}
              >
                Send test
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Reminders
          </h2>
          <Button size="sm" variant="outline" onClick={addReminder}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground px-1">Loading…</p>
        ) : reminders.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No reminders yet. Add one to get nudged when you still have due
            tasks.
          </Card>
        ) : (
          <div className="space-y-3">
            {reminders.map((r) => (
              <Card
                key={r.id}
                className={cn("p-4 space-y-3", !r.enabled && "opacity-60")}
              >
                <div className="flex items-center justify-between gap-3">
                  <Input
                    type="time"
                    value={r.time_of_day}
                    onChange={(e) =>
                      updateReminder(r.id, { time_of_day: e.target.value })
                    }
                    className="w-32 text-lg font-medium"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.enabled}
                      onCheckedChange={(v) =>
                        updateReminder(r.id, { enabled: v })
                      }
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete reminder?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This reminder will stop firing. You can always add a
                            new one.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteReminder(r.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Days</Label>
                  <div className="flex gap-1 mt-1.5">
                    {DAY_LABELS.map((lbl, i) => {
                      const active = r.days_of_week.includes(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-label={DAY_FULL[i]}
                          onClick={() => toggleDay(r, i)}
                          className={cn(
                            "flex-1 h-9 rounded-md text-xs font-semibold border transition-colors",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:bg-muted",
                          )}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">
                    Custom message (optional)
                  </Label>
                  <Textarea
                    value={r.message ?? ""}
                    onChange={(e) =>
                      updateReminder(r.id, { message: e.target.value })
                    }
                    placeholder="Leave empty to use a random encouraging message"
                    rows={2}
                    className="mt-1.5 resize-none"
                  />
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Timezone: {r.timezone} · Only fires when you still have
                  unfinished due tasks.
                </p>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
