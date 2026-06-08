// Sends web push reminders for users whose scheduled time matches "now"
// in their timezone, when they still have due-today tasks with 0 sets.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const rawVapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "reminders@trackrdaily.app";
const VAPID_SUBJECT = rawVapidSubject.startsWith("mailto:") || rawVapidSubject.startsWith("https://")
  ? rawVapidSubject
  : rawVapidSubject.includes("@")
    ? `mailto:${rawVapidSubject}`
    : "mailto:reminders@trackrdaily.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const ENCOURAGEMENTS = [
  "You've got this — knock out a task or two!",
  "A small step now is still progress. Jump in!",
  "Future you will thank present you. Let's go!",
  "One tap. That's all it takes to start.",
  "Consistency beats intensity. Pop in for a moment.",
];

function localPartsForTz(tz: string, now: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hhmm: `${parts.hour}:${parts.minute}`,
    dow: weekdayMap[parts.weekday as string] ?? 0,
  };
}

function daysBetween(a: string, b: string) {
  return Math.floor((Date.parse(a) - Date.parse(b)) / 86400000);
}

function isTaskDueToday(task: any, todayStr: string): boolean {
  const counts: Record<string, number> = task.completion_counts ?? {};
  if ((counts[todayStr] ?? 0) > 0) return false; // already done today
  if (!task.interval) return true;
  const dates = Object.entries(counts)
    .filter(([_, v]) => (v as number) > 0)
    .map(([d]) => d)
    .sort();
  const last = dates[dates.length - 1];
  if (!last) return true;
  return daysBetween(todayStr, last) >= task.interval;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();

  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "1" || req.headers.get("x-test") === "1";

  // Instant test mode: push to every subscription for the calling user, ignoring schedule
  if (isTest) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: userErr?.message ?? "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userData.user.id);

    const payload = JSON.stringify({
      title: "TrackrDaily test",
      body: "If you see this, push notifications are working 🎉",
      url: "/",
      tag: `test-${Date.now()}`,
    });

    const results: any[] = [];
    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        results.push({ endpoint: sub.endpoint.slice(0, 40), ok: true });
      } catch (e: any) {
        results.push({
          endpoint: sub.endpoint.slice(0, 40),
          ok: false,
          statusCode: e?.statusCode,
          body: e?.body,
          message: e?.message,
        });
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
    return new Response(
      JSON.stringify({
        test: true,
        subscriptions: subs?.length ?? 0,
        vapid_public_prefix: VAPID_PUBLIC.slice(0, 16),
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: reminders, error } = await supabase
    .from("notification_reminders")
    .select("*")
    .eq("enabled", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  let sent = 0, skipped = 0, failed = 0;

  // Group reminders by user to avoid duplicate task fetches
  const userIds = [...new Set((reminders ?? []).map((r) => r.user_id))];
  const tasksByUser: Record<string, any[]> = {};
  if (userIds.length) {
    const { data: allTasks } = await supabase
      .from("weekly_tasks")
      .select("*")
      .in("user_id", userIds);
    for (const t of allTasks ?? []) {
      (tasksByUser[t.user_id] ??= []).push(t);
    }
  }

  for (const r of reminders ?? []) {
    let local;
    try { local = localPartsForTz(r.timezone || "UTC", now); }
    catch { local = localPartsForTz("UTC", now); }

    if (local.hhmm !== r.time_of_day) { skipped++; continue; }
    if (!r.days_of_week?.includes(local.dow)) { skipped++; continue; }
    if (r.last_sent_date === local.date) { skipped++; continue; }

    const tasks = tasksByUser[r.user_id] ?? [];
    const dueTasks = tasks.filter((t) => isTaskDueToday(t, local.date));
    if (!dueTasks.length) {
      // mark sent so we don't reconsider every minute, but don't push
      await supabase.from("notification_reminders")
        .update({ last_sent_date: local.date }).eq("id", r.id);
      skipped++;
      continue;
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", r.user_id);

    const body = r.message?.trim()
      || ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    const title = `${dueTasks.length} task${dueTasks.length > 1 ? "s" : ""} still waiting`;

    const payload = JSON.stringify({
      title,
      body,
      url: "/",
      tag: `reminder-${r.id}-${local.date}`,
    });

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        failed++;
        // Clean up gone subscriptions
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        console.error("push failed", e?.statusCode, e?.body ?? e?.message);
      }
    }

    await supabase.from("notification_reminders")
      .update({ last_sent_date: local.date }).eq("id", r.id);
  }

  return new Response(JSON.stringify({ sent, skipped, failed, evaluated: reminders?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});