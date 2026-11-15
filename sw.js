// Service worker voor Voorraad.
// - Eigen bestanden (HTML/JS/CSS/iconen): eerst netwerk, bij geen internet de laatst bewaarde versie.
//   Zo krijg je altijd meteen de nieuwste versie, en werkt de app toch offline.
// - Firebase-scripts en lettertypes van CDN: uit de cache (die veranderen niet per versie).
// - Firestore/inloggen worden NIET onderschept; Firestore heeft zijn eigen offline-opslag.
const BUILD = 'mwhkb29w';
const CACHE = 'voorraad-' + BUILD;
const CDN_CACHE = 'voorraad-cdn-v1';

const SHELL = ['./', './index.html', './assets/app.js', './assets/app.css', './site.webmanifest.json', './favicon.ico', './icon_180x180.png', './icon_192x192.png', './icon_512x512.png'];
const CDN = [
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const c = await caches.open(CACHE);
        await Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => { })));
        const cdn = await caches.open(CDN_CACHE);
        await Promise.all(CDN.map(u => cdn.match(u).then(hit => hit || cdn.add(u)).catch(() => { })));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE && k !== CDN_CACHE).map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

const isCdn = (url) => url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')
    || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
    || url.hostname === 'cdnjs.cloudflare.com'
    || ((url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'unpkg.com') && url.pathname.includes('@zxing/library'))
    || (url.hostname === 'www.google.com' && url.pathname === '/s2/favicons') || /^t\d\.gstatic\.com$/.test(url.hostname);

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    let url;
    try { url = new URL(req.url); } catch (e) { return; }

    if (url.origin === self.location.origin) {
        // Network-first, met cache als vangnet (offline).
        event.respondWith((async () => {
            const c = await caches.open(CACHE);
            try {
                const res = await fetch(req);
                if (res && res.ok && res.type === 'basic') c.put(req, res.clone());
                return res;
            } catch (e) {
                const hit = await c.match(req, { ignoreSearch: true });
                if (hit) return hit;
                if (req.mode === 'navigate') return (await c.match('./index.html')) || (await c.match('./'));
                throw e;
            }
        })());
        return;
    }

    if (isCdn(url)) {
        // Cache-first voor vaste CDN-bestanden.
        event.respondWith((async () => {
            const c = await caches.open(CDN_CACHE);
            const hit = await c.match(req);
            if (hit) return hit;
            const res = await fetch(req);
            if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
            return res;
        })());
    }
});

// Klik op een melding opent of focust de app.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
        for (const c of list) if ('focus' in c) return c.focus();
        return self.clients.openWindow('./');
    }));
});

// Pushmelding van de eigen server (zie server/)
self.addEventListener('push', (event) => {
    let d = {};
    try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'Voorraad.', body: event.data ? event.data.text() : '' }; }
    event.waitUntil(self.registration.showNotification(d.title || 'Voorraad.', {
        body: d.body || '', icon: './icon_192x192.png', badge: './icon_192x192.png', tag: d.tag || 'voorraad', data: { url: d.url || './' }
    }));
});
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
    event.waitUntil((async () => {
        const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const open = all.find(c => c.url.startsWith(self.registration.scope));
        if (open) { await open.focus(); if ('navigate' in open) return open.navigate(url); return; }
        return self.clients.openWindow(url);
    })());
});
