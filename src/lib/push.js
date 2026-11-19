import { db, auth } from './firebase.js';

// ---------- Pushmeldingen (Web Push via de eigen server) ----------
const b64ToBytes = (s) => {
    const pad = '='.repeat((4 - (s.length % 4)) % 4);
    const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
};
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
async function docIdFor(endpoint) {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
    return [...new Uint8Array(h)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 'unsupported' | 'ios-home' (eerst op beginscherm zetten) | 'denied' | 'off' | 'on'
export async function pushState() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return isIos() && !standalone() ? 'ios-home' : 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    return sub ? 'on' : 'off';
}

export async function enablePush(uid, publicKey) {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Je hebt meldingen geweigerd. Zet ze aan in de instellingen van je gsm of browser.' : 'Geen toestemming gekregen.');
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
        // Sleutel van de server veranderd? Dan opnieuw inschrijven.
        const key = sub.options && sub.options.applicationServerKey;
        if (key && btoa(String.fromCharCode(...new Uint8Array(key))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== publicKey) { await sub.unsubscribe(); sub = null; }
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    const json = sub.toJSON();
    await db.collection('pushAbonnementen').doc(await docIdFor(json.endpoint)).set({
        uid, sub: { endpoint: json.endpoint, keys: json.keys }, toestel: deviceName(), gemaaktOp: new Date()
    });
}

export async function disablePush() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (!sub) return;
    await db.collection('pushAbonnementen').doc(await docIdFor(sub.endpoint)).delete().catch(() => { });
    await sub.unsubscribe();
}

export const sendTest = (uid, soort = 'test') => db.collection('pushTest').add({ uid, soort, op: new Date() });

export function deviceName() {
    const ua = navigator.userAgent;
    const os = /iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) ? 'iPad' : /android/i.test(ua) ? 'Android' : /mac/i.test(ua) ? 'Mac' : /windows/i.test(ua) ? 'Windows' : 'Toestel';
    const br = /edg\//i.test(ua) ? 'Edge' : /crios|chrome/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : '';
    return `${os}${br ? ' · ' + br : ''}${standalone() ? ' (app)' : ''}`;
}

// ---------- Foto-opslag op de eigen server ----------
export async function uploadPhoto(fotoUrl, dataUrl) {
    const user = auth.currentUser;
    if (!user) throw new Error('Niet ingelogd');
    const token = await user.getIdToken();
    const res = await fetch(fotoUrl.replace(/\/$/, '') + '/foto', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: dataUrl }) });
    if (!res.ok) throw new Error('Upload mislukt (' + res.status + ')');
    return (await res.json()).url;
}
