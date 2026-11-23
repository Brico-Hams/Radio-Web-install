"use strict";
// Offline shell for the remote consoles (agent console and the desktop "remoto" page): caches only the static assets listed below.
// API calls, event streams, audio sockets and anything carrying a query string or token are never cached or intercepted.
const CACHE = "bricohams-remote-shell-v1";
const COMMON = ["ui-i18n.js", "ui-translations.js", "bricohams-logo.png"];
const SHELLS = {
  agent: ["", "remote.css", "remote-ui.js", "remote-tune-ui.js", "remote-audio-core.js", "remote-digital.js", "remote-ftx-ui.js", "remote-audio-worklet.js", "manifest.webmanifest", ...COMMON],
  remoto: ["remoto.html", "remoto.css", "remoto-ui.js", "remoto.webmanifest", ...COMMON]
};
// The desktop page registers this worker as remote-sw.js scoped to remoto.html; the agent serves it as sw.js.
const SHELL = self.registration.scope.endsWith("remoto.html") ? SHELLS.remoto : SHELLS.agent;
const BASE = new URL("./", self.location.href).pathname;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(SHELL.map(path => new Request(`${BASE}${path}`, { cache: "reload", credentials: "omit" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

function cacheable(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.search || !url.pathname.startsWith(BASE)) return false;
  return SHELL.includes(url.pathname.slice(BASE.length));
}

self.addEventListener("fetch", event => {
  if (!cacheable(event.request)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(hit => hit || Response.error())));
});
