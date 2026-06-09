import { supabase } from "@/integrations/supabase/client";

const PUSH_CONFIG_URL =
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminders?config=1`;

let cachedVapidPublicKey: string | null = null;

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

type EnablePushOptions = {
  forceRefresh?: boolean;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function abToB64Url(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++)
    str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function keysMatch(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a) return false;
  const current = new Uint8Array(a);
  if (current.byteLength !== b.byteLength) return false;
  for (let i = 0; i < current.byteLength; i++) {
    if (current[i] !== b[i]) return false;
  }
  return true;
}

async function upsertSubscription(userId: string, sub: PushSubscription) {
  const json = sub.toJSON();
  const endpoint = json.endpoint!;
  const p256dh =
    (json.keys as any)?.p256dh ?? abToB64Url(sub.getKey?.("p256dh") ?? null);
  const auth =
    (json.keys as any)?.auth ?? abToB64Url(sub.getKey?.("auth") ?? null);

  return supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" },
  );
}

export async function getVapidPublicKey(forceRefresh = false): Promise<string> {
  if (cachedVapidPublicKey && !forceRefresh) return cachedVapidPublicKey;

  const res = await fetch(PUSH_CONFIG_URL, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  if (!res.ok) {
    throw new Error("Could not load notification configuration.");
  }

  const json = await res.json();
  if (!json?.publicKey) {
    throw new Error("Notification configuration is missing a public key.");
  }

  cachedVapidPublicKey = json.publicKey;
  return cachedVapidPublicKey;
}

export async function registerPushSW(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/push-sw.js", {
      scope: "/",
    });
  } catch (e) {
    console.error("SW register failed", e);
    return null;
  }
}

export async function enablePush(
  options: EnablePushOptions = {},
): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported())
    return { ok: false, reason: "Push not supported in this browser." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return { ok: false, reason: "Notification permission denied." };

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { ok: false, reason: "Not signed in." };

  const reg =
    (await navigator.serviceWorker.getRegistration("/")) ||
    (await registerPushSW());
  if (!reg) return { ok: false, reason: "Could not register service worker." };
  await navigator.serviceWorker.ready;

  const serverKey = urlBase64ToUint8Array(
    await getVapidPublicKey(options.forceRefresh),
  );

  let sub = await reg.pushManager.getSubscription();
  const staleKey =
    !!sub && !keysMatch(sub.options?.applicationServerKey ?? null, serverKey);

  if (sub && (options.forceRefresh || staleKey)) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
    sub = null;
  }

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: serverKey,
    });
  }

  const { error } = await upsertSubscription(userId, sub);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function syncPushSubscription(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;

  const reg =
    (await navigator.serviceWorker.getRegistration("/")) ||
    (await registerPushSW());
  if (!reg) return false;
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;

  const serverKey = urlBase64ToUint8Array(await getVapidPublicKey());
  if (!keysMatch(sub.options?.applicationServerKey ?? null, serverKey)) {
    return false;
  }

  const { error } = await upsertSubscription(userId, sub);
  if (error) {
    console.error("Push subscription sync failed", error);
    return false;
  }

  return true;
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return false;
  return keysMatch(
    sub.options?.applicationServerKey ?? null,
    urlBase64ToUint8Array(await getVapidPublicKey()),
  );
}
