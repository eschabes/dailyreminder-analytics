import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BOeKW2iTgsDjcMMKEzJrrUa-f51DSrSdt3QAPmwAMTXWIftC9TO7iee01UUhiymPJMr7Wbaq4mqqz3ZZCBTWXEU";

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

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
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function registerPushSW(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  } catch (e) {
    console.error("SW register failed", e);
    return null;
  }
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "Push not supported in this browser." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "Notification permission denied." };

  const reg = (await navigator.serviceWorker.getRegistration("/")) || (await registerPushSW());
  if (!reg) return { ok: false, reason: "Could not register service worker." };
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { ok: false, reason: "Not signed in." };

  const json = sub.toJSON();
  const endpoint = json.endpoint!;
  const p256dh = (json.keys as any)?.p256dh ?? abToB64Url(sub.getKey?.("p256dh") ?? null);
  const auth = (json.keys as any)?.auth ?? abToB64Url(sub.getKey?.("auth") ?? null);

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint, p256dh, auth, user_agent: navigator.userAgent },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}