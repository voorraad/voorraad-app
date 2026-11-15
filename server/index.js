// Voorraad.-server: pushmeldingen + foto-opslag. Draait in Docker op je eigen server (bv. Proxmox).
// - Leest/schrijft Firestore met een servicesleutel (firebase-admin), werkt met het gratis Spark-abonnement.
// - Pushmeldingen gaan via de gewone pushdiensten van Apple/Google (Web Push, VAPID): enkel uitgaand verkeer.
// - Foto-opslag (optioneel) heeft wél een publiek HTTPS-adres nodig, bv. via een Cloudflare Tunnel.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import webpush from 'web-push';
import { itemStatus, shortText } from './status.js';

const VERSIE = '1.0.0';
const DATA = process.env.DATA_DIR || '/data';
const CFG = {
    serviceAccount: process.env.SERVICE_ACCOUNT || path.join(DATA, 'service-account.json'),
    uur: process.env.MELDING_UUR || '08:00',
    appUrl: (process.env.APP_URL || 'https://voorraad.github.io/voorraad-app/').replace(/\/?$/, '/'),
    publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
    contact: process.env.CONTACT || 'mailto:beheer@example.com',
    origins: (process.env.ALLOWED_ORIGINS || 'https://voorraad.github.io').split(',').map(s => s.trim()).filter(Boolean),
    port: Number(process.env.PORT || 8080),
    maxFotoMb: Number(process.env.MAX_FOTO_MB || 8)
};
const FOTOS = path.join(DATA, 'fotos');
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------- Firebase ----------
if (!fs.existsSync(CFG.serviceAccount)) {
    console.error(`Servicesleutel niet gevonden op ${CFG.serviceAccount}. Zie INSTALLEREN.md, stap 2.`);
    process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(CFG.serviceAccount, 'utf8'))) });
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

// ---------- VAPID-sleutels (eenmalig aangemaakt en bewaard) ----------
fs.mkdirSync(FOTOS, { recursive: true });
const vapidFile = path.join(DATA, 'vapid.json');
if (!fs.existsSync(vapidFile)) { fs.writeFileSync(vapidFile, JSON.stringify(webpush.generateVAPIDKeys(), null, 2)); log('Nieuwe VAPID-sleutels aangemaakt'); }
const vapid = JSON.parse(fs.readFileSync(vapidFile, 'utf8'));
webpush.setVapidDetails(CFG.contact, vapid.publicKey, vapid.privateKey);

// ---------- Status in Firestore (beheerpagina toont of de server online is) ----------
const stateFile = path.join(DATA, 'state.json');
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
const saveState = () => fs.writeFileSync(stateFile, JSON.stringify(state));
const pushDoc = db.collection('settings').doc('push');
async function heartbeat(extra = {}) {
    await pushDoc.set({ publicKey: vapid.publicKey, serverOp: FV.serverTimestamp(), versie: VERSIE, meldingUur: CFG.uur, fotoUrl: CFG.publicUrl, ...extra }, { merge: true })
        .catch(e => log('Status bijwerken mislukt:', e.message));
}

// ---------- Versturen ----------
async function sendToUser(uid, payload) {
    const subs = await db.collection('pushAbonnementen').where('uid', '==', uid).get();
    let ok = 0;
    await Promise.all(subs.docs.map(async d => {
        try {
            await webpush.sendNotification(d.data().sub, JSON.stringify(payload), { TTL: 60 * 60 * 20 });
            ok++;
        } catch (e) {
            if (e.statusCode === 404 || e.statusCode === 410) { await d.ref.delete().catch(() => { }); log('Verlopen abonnement verwijderd', d.id); }
            else log('Versturen mislukt', uid, e.statusCode || '', e.body || e.message);
        }
    }));
    return ok;
}

const today = () => new Date().toLocaleDateString('sv-SE'); // JJJJ-MM-DD in de tijdzone van de container
async function urgentFor(uid) {
    const owners = new Set([uid]);
    const t = await db.collection('toegang').where('uid', '==', uid).get().catch(() => ({ docs: [] }));
    t.docs.forEach(d => owners.add(d.data().ownerId));
    const out = [];
    for (const owner of owners) {
        const [v, i] = await Promise.all([db.collection('vriezers').where('userId', '==', owner).get(), db.collection('items').where('userId', '==', owner).get()]);
        const types = Object.fromEntries(v.docs.map(d => [d.id, d.data().type || 'vriezer']));
        i.docs.forEach(d => {
            const it = d.data();
            if (it.vriezerId === 'custom_menu' || !types[it.vriezerId]) return;
            const st = itemStatus(it, types[it.vriezerId]);
            if (st.level !== 'ok') out.push({ naam: it.naam, st, type: types[it.vriezerId] });
        });
    }
    const order = { expired: 0, veryold: 1, soon: 2 };
    return out.sort((a, b) => order[a.st.level] - order[b.st.level]);
}
async function stockMessage(uid) {
    const list = await urgentFor(uid);
    if (!list.length) return null;
    const n = list.length;
    return {
        title: n === 1 ? '1 product moet op' : `${n} producten moeten op`,
        body: list.slice(0, 4).map(x => `${x.naam} (${shortText(x.st)})`).join(', ') + (n > 4 ? ` en nog ${n - 4}` : ''),
        url: CFG.appUrl + '#/voorraad/' + list[0].type, tag: 'voorraad-dagelijks'
    };
}

async function dailyRound() {
    const subs = await db.collection('pushAbonnementen').get();
    const uids = [...new Set(subs.docs.map(d => d.data().uid))];
    let sent = 0;
    for (const uid of uids) {
        const u = (await db.collection('users').doc(uid).get()).data() || {};
        if (u.disabled || u.notificationsEnabled === false || (u.vakantieTot && u.vakantieTot >= today())) continue;
        const msg = await stockMessage(uid);
        if (msg) sent += await sendToUser(uid, msg);
    }
    log(`Dagelijkse ronde: ${sent} meldingen naar ${uids.length} gebruikers`);
    await heartbeat({ laatsteRonde: { op: FV.serverTimestamp(), verstuurd: sent, gebruikers: uids.length } });
}

// Elke 30 s kijken of het tijd is voor de dagelijkse ronde
setInterval(() => {
    const now = new Date();
    const hm = now.toTimeString().slice(0, 5);
    if (hm >= CFG.uur && state.laatsteDag !== today()) {
        state.laatsteDag = today(); saveState();
        dailyRound().catch(e => log('Ronde mislukt:', e.message));
    }
}, 30000);
setInterval(() => heartbeat(), 5 * 60 * 1000);

// Persoonlijke berichten van een beheerder → meteen een melding
const started = new Date();
db.collection('berichten').where('gemaaktOp', '>', started).onSnapshot(s => {
    s.docChanges().filter(c => c.type === 'added').forEach(c => {
        const m = c.doc.data();
        sendToUser(m.userId, { title: `Bericht van ${m.doorNaam || 'de beheerder'}`, body: m.text, url: CFG.appUrl, tag: 'bericht-' + c.doc.id })
            .then(n => log('Bericht-melding', m.userId, n));
    });
}, e => log('Berichten volgen mislukt:', e.message));

// Testmeldingen vanuit de app (pushTest/{id} = { uid, soort: 'test' | 'voorraad' })
db.collection('pushTest').onSnapshot(s => {
    s.docChanges().filter(c => c.type === 'added').forEach(async c => {
        const { uid, soort } = c.doc.data();
        let msg = { title: 'Testmelding', body: 'Meldingen werken op dit toestel 🎉', url: CFG.appUrl, tag: 'test' };
        if (soort === 'voorraad') msg = (await stockMessage(uid)) || { title: 'Alles in orde', body: 'Er moet vandaag niets dringend op.', url: CFG.appUrl, tag: 'test' };
        const n = await sendToUser(uid, msg);
        await pushDoc.set({ laatsteTest: { uid, soort: soort || 'test', verstuurd: n, op: FV.serverTimestamp() } }, { merge: true }).catch(() => { });
        await c.doc.ref.delete().catch(() => { });
        log('Testmelding', uid, soort, n);
    });
}, e => log('Testmeldingen volgen mislukt:', e.message));

// ---------- Foto-opslag (HTTP) ----------
const cors = (req, res) => {
    const o = req.headers.origin;
    if (o && (CFG.origins.includes(o) || CFG.origins.includes('*'))) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
};
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = (req, max) => new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > max) { reject(Object.assign(new Error('Te groot'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
});
async function userFrom(req) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m) return null;
    try { return await admin.auth().verifyIdToken(m[1]); } catch (e) { return null; }
}
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

http.createServer(async (req, res) => {
    cors(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const url = new URL(req.url, 'http://x');
    try {
        if (req.method === 'GET' && url.pathname === '/gezond') return json(res, 200, { ok: true, versie: VERSIE, fotos: !!CFG.publicUrl });

        if (req.method === 'POST' && url.pathname === '/foto') {
            const user = await userFrom(req);
            if (!user) return json(res, 401, { fout: 'Niet ingelogd' });
            const body = JSON.parse((await readBody(req, CFG.maxFotoMb * 1.4 * 1048576)).toString('utf8') || '{}');
            const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(body.data || '');
            if (!m || !TYPES[m[1]]) return json(res, 400, { fout: 'Geen geldige afbeelding' });
            const buf = Buffer.from(m[2], 'base64');
            if (buf.length > CFG.maxFotoMb * 1048576) return json(res, 413, { fout: 'Foto te groot' });
            const dir = path.join(FOTOS, user.uid.replace(/[^A-Za-z0-9_-]/g, ''));
            fs.mkdirSync(dir, { recursive: true });
            const name = crypto.randomBytes(16).toString('hex') + '.' + TYPES[m[1]];
            fs.writeFileSync(path.join(dir, name), buf);
            return json(res, 200, { url: `${CFG.publicUrl}/fotos/${path.basename(dir)}/${name}` });
        }

        const fm = /^\/fotos\/([A-Za-z0-9_-]+)\/([a-f0-9]{32}\.(jpg|png|webp))$/.exec(url.pathname);
        if (fm && req.method === 'GET') {
            const file = path.join(FOTOS, fm[1], fm[2]);
            if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
            res.writeHead(200, { 'Content-Type': MIME[fm[3]], 'Cache-Control': 'public, max-age=31536000, immutable', 'Access-Control-Allow-Origin': '*' });
            return fs.createReadStream(file).pipe(res);
        }
        if (fm && req.method === 'DELETE') {
            const user = await userFrom(req);
            if (!user) return json(res, 401, { fout: 'Niet ingelogd' });
            const isAdmin = (await db.collection('admins').doc(user.uid).get()).exists;
            if (fm[1] !== user.uid && !isAdmin) return json(res, 403, { fout: 'Niet jouw foto' });
            fs.rmSync(path.join(FOTOS, fm[1], fm[2]), { force: true });
            return json(res, 200, { ok: true });
        }
        res.writeHead(404); res.end();
    } catch (e) {
        log('Fout', req.method, url.pathname, e.message);
        json(res, e.code === 413 ? 413 : 500, { fout: e.code === 413 ? 'Te groot' : 'Serverfout' });
    }
}).listen(CFG.port, () => log(`Voorraad.-server ${VERSIE} luistert op poort ${CFG.port}${CFG.publicUrl ? ' (foto\'s via ' + CFG.publicUrl + ')' : ' (foto-opslag uit: PUBLIC_URL niet ingesteld)'}; dagelijkse melding om ${CFG.uur}`));

heartbeat();
