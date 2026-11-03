// えにし神社 service worker：ホーム画面に追加できるように＋願いの日の通知
const API = "https://enishi-rooms.thanhduy8vn.workers.dev";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
// ページ（HTML）はいつも最新を確かめる：GitHub Pages の10分キャッシュで古い版が出ないように
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request, { cache: "no-cache" }).catch(() => fetch(e.request)));
});
self.addEventListener("push", (e) => e.waitUntil((async () => {
  let m = { title: "えにし神社", body: "境内でお待ちしています。", url: "./" };
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (sub) m = await (await fetch(API + "/msg", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) })).json();
  } catch (_) {}
  await self.registration.showNotification(m.title, { body: m.body, icon: "img/icon-192.png", badge: "img/icon-192.png", tag: "enishi", data: { url: m.url } });
})()));
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if (c.url.startsWith(self.registration.scope) && "focus" in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
