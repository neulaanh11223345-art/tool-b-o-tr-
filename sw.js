// Service worker: mở app khi mất mạng.
// Trang: lấy mạng trước, quá 6 giây hoặc mất mạng thì dùng bản đã lưu.
// Thư viện CDN và phông chữ: dùng bản đã lưu trước.
const CACHE = 'baoduong-v1.3';
const LIBS = [
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'
];
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./']).catch(() => {})));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function netFirst(req) {
  return new Promise((resolve) => {
    let done = false;
    const fallback = () => caches.match(req, { ignoreSearch: true })
      .then((r) => r || caches.match('./'))
      .then((r) => r || new Response('Offline', { status: 503 }));
    const timer = setTimeout(() => { if (!done) { done = true; resolve(fallback()); } }, 6000);
    fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        const key = new URL(req.url); key.search = '';
        caches.open(CACHE).then((c) => c.put(key.toString(), copy)).catch(() => {});
      }
      if (!done) { done = true; clearTimeout(timer); resolve(res); }
    }).catch(() => { if (!done) { done = true; clearTimeout(timer); resolve(fallback()); } });
  });
}
function cacheFirst(req) {
  return caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
    return res;
  }));
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) { e.respondWith(netFirst(req)); return; }
  if (LIBS.indexOf(req.url) >= 0 || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) e.respondWith(cacheFirst(req));
});
