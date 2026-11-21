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
import { maakBackup, lijstBackups, leesBackup, ruimPrullenbakOp, bouwRapport, mailer } from './extra.js';

const VERSIE = '1.6.0';
const DATA = process.env.DATA_DIR || '/data';
const CFG = {
    serviceAccount: process.env.SERVICE_ACCOUNT || path.join(DATA, 'service-account.json'),
    uur: process.env.MELDING_UUR || '08:00',
    appUrl: (process.env.APP_URL || 'https://voorraad.github.io/voorraad-app/').replace(/\/?$/, '/'),
    publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
    contact: process.env.CONTACT || 'mailto:beheer@example.com',
    origins: (process.env.ALLOWED_ORIGINS || 'https://voorraad.github.io').split(',').map(s => s.trim()).filter(Boolean),
    port: Number(process.env.PORT || 8080),
    maxFotoMb: Number(process.env.MAX_FOTO_MB || 8),
    backupUur: process.env.BACKUP_UUR || '03:00',
    backupDagen: Number(process.env.BACKUP_DAGEN || 30)
};
const BACKUPS = path.join(process.env.DATA_DIR || '/data', 'backups');
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
const gestart = new Date();
async function heartbeat(extra = {}) {
    await pushDoc.set({ publicKey: vapid.publicKey, serverOp: FV.serverTimestamp(), versie: VERSIE, meldingUur: CFG.uur, fotoUrl: CFG.publicUrl,
        status: { ...stats, gestartOp: gestart.toISOString(), backupUur: CFG.backupUur, mail: !!(process.env.SMTP_HOST && process.env.SMTP_USER) }, ...extra }, { merge: true })
        .catch(e => log('Status bijwerken mislukt:', e.message));
}

// ---------- Status van vandaag (beheerpagina → Server) ----------
const stats = { dag: '', verstuurd: 0, mislukt: 0, verlopen: 0, fouten: [] };
function tel(soort, fout) {
    const d = new Date().toLocaleDateString('sv-SE');
    if (stats.dag !== d) Object.assign(stats, { dag: d, verstuurd: 0, mislukt: 0, verlopen: 0, fouten: [] });
    stats[soort]++;
    if (fout) { stats.fouten.unshift({ op: new Date().toISOString(), fout }); stats.fouten.length = Math.min(stats.fouten.length, 15); }
}
function logFout(fout) { tel('mislukt', fout); }

// ---------- Versturen ----------
async function sendToUser(uid, payload, subId = null) {
    const subs = subId
        ? { docs: [await db.collection('pushAbonnementen').doc(subId).get()].filter(d => d.exists && d.data().uid === uid) }
        : await db.collection('pushAbonnementen').where('uid', '==', uid).get();
    let ok = 0;
    await Promise.all(subs.docs.map(async d => {
        try {
            await webpush.sendNotification(d.data().sub, JSON.stringify(payload), { TTL: 60 * 60 * 20 });
            ok++; tel('verstuurd');
        } catch (e) {
            if (e.statusCode === 404 || e.statusCode === 410) { await d.ref.delete().catch(() => { }); log('Verlopen abonnement verwijderd', d.id); tel('verlopen'); }
            else { log('Versturen mislukt', uid, e.statusCode || '', e.body || e.message); tel('mislukt', `${d.data().toestel || 'toestel'}: ${e.statusCode || ''} ${(e.body || e.message || '').toString().slice(0, 120)}`); }
        }
    }));
    return ok;
}

const today = () => new Date().toLocaleDateString('sv-SE'); // JJJJ-MM-DD in de tijdzone van de container
const dateKey = (d) => d.toLocaleDateString('sv-SE');
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

const started = new Date();

// ---------- Meldingvoorkeuren per gebruiker (users/{uid}.meldingen) ----------
// Zelfde standaarden als in de app (src/lib/meldingen.js).
const STANDAARD = { tijd: '', verlopen: true, bijna: true, lang: true, menu: true, lijst: false, lijstDag: 6, week: false, uitnodiging: true, bericht: true, wijziging: false, locaties: [], activiteit: false, activiteitVan: [] };
const prefsOf = (u) => {
    const p = { ...STANDAARD, ...((u && u.meldingen) || {}) };
    if (u && u.notificationsEnabled === false && !(u.meldingen)) { p.verlopen = p.bijna = p.lang = p.menu = false; } // oude schakelaar
    return p;
};
const shortList = (names, max = 5) => names.slice(0, max).join(', ') + (names.length > max ? ` en nog ${names.length - max}` : '');
const plural = (n, een, meer) => `${n} ${n === 1 ? een : meer}`;

// Gebruikers en abonnementen live bijhouden (klein aantal, scheelt veel lezen)
const users = new Map();
const verzoekGemeld = new Set();
db.collection('users').onSnapshot(s => s.docChanges().forEach(c => {
    if (c.type === 'removed') return users.delete(c.doc.id);
    const u = c.doc.data();
    users.set(c.doc.id, u);
    // Vraag om een vergrendelde melding uit te zetten → beheerders verwittigen
    Object.entries(u.meldingVerzoek || {}).forEach(([soort, op]) => {
        const d = op && (op.toDate ? op.toDate() : new Date(op));
        const key = c.doc.id + soort + (d ? d.getTime() : '');
        if (!d || d < started || verzoekGemeld.has(key)) return;
        verzoekGemeld.add(key);
        naarBeheerders({ title: 'Vraag over meldingen', body: `${u.displayName || u.email || 'Een gebruiker'} vraagt om ${soort === 'bericht' ? 'berichten' : 'uitnodigingen'} uit te zetten.`, url: CFG.appUrl + '#/admin/dashboard/' + c.doc.id + '/meldingen', tag: 'verzoek-' + c.doc.id });
    });
}), e => log('Gebruikers volgen mislukt:', e.message));
async function naarBeheerders(msg) {
    const a = await db.collection('admins').get().catch(() => ({ docs: [] }));
    for (const d of a.docs) await sendToUser(d.id, msg);
}
// Wie kan aan welke voorraad? (eigenaar + toegang)
const toegang = new Map(); // ownerId → Set(uid)
db.collection('toegang').onSnapshot(s => {
    toegang.clear();
    s.docs.forEach(d => { const t = d.data(); if (!toegang.has(t.ownerId)) toegang.set(t.ownerId, new Set()); toegang.get(t.ownerId).add(t.uid); });
}, e => log('Toegang volgen mislukt:', e.message));
const subUids = new Set();
db.collection('pushAbonnementen').onSnapshot(s => { subUids.clear(); s.docs.forEach(d => subUids.add(d.data().uid)); }, e => log('Abonnementen volgen mislukt:', e.message));

async function ownersOf(uid) {
    const owners = new Set([uid]);
    const t = await db.collection('toegang').where('uid', '==', uid).get().catch(() => ({ docs: [] }));
    t.docs.forEach(d => owners.add(d.data().ownerId));
    return [...owners];
}
async function dataFor(uid) {
    const out = { urgent: [], menu: [], lijst: [] };
    for (const owner of await ownersOf(uid)) {
        const [v, i, l] = await Promise.all([
            db.collection('vriezers').where('userId', '==', owner).get(),
            db.collection('items').where('userId', '==', owner).get(),
            db.collection('shoppingList').where('userId', '==', owner).get()]);
        const types = Object.fromEntries(v.docs.map(d => [d.id, d.data().type || 'vriezer']));
        i.docs.forEach(d => {
            const it = { id: d.id, ...d.data() };
            if (it.geplandeDatum) out.menu.push({ naam: it.naam, dag: it.geplandeDatum, type: types[it.vriezerId] || null });
            if (it.vriezerId === 'custom_menu' || !types[it.vriezerId]) return;
            const st = itemStatus(it, types[it.vriezerId]);
            if (st.level !== 'ok') out.urgent.push({ id: it.id, naam: it.naam, st, type: types[it.vriezerId] });
        });
        l.docs.forEach(d => { const x = d.data(); if (!x.checked) out.lijst.push(x.naam); });
    }
    out.urgent.sort((a, b) => (a.st.days ?? 0) - (b.st.days ?? 0));
    return out;
}

// Alle meldingen die deze gebruiker vandaag krijgt (elk apart, zodat lange lijsten niet wegvallen)
async function dailyMessages(uid, opts = {}) {
    const u = users.get(uid) || {};
    const p = prefsOf(u);
    const d = await dataFor(uid);
    const msgs = [];
    const lvl = (l) => d.urgent.filter(x => x.st.level === l);
    const urgentMsg = (list, key, title, groep) => {
        if (!list.length) return;
        msgs.push({
            title, tag: 'voorraad-' + key, url: CFG.appUrl + '#/eerst/' + groep,
            body: list.length === 1 ? `${list[0].naam} (${shortText(list[0].st)}). Tik om te bekijken.`
                : `${shortList(list.map(x => x.naam))}. Tik voor de volledige lijst.`
        });
    };
    if (p.verlopen || opts.alles) urgentMsg(lvl('expired'), 'verlopen', lvl('expired').length === 1 ? '1 product is verlopen' : `${lvl('expired').length} producten zijn verlopen`, 'now');
    if (p.bijna || opts.alles) urgentMsg(lvl('soon'), 'bijna', lvl('soon').length === 1 ? '1 product vervalt binnenkort' : `${lvl('soon').length} producten vervallen binnenkort`, 'soon');
    if (p.lang || opts.alles) urgentMsg(lvl('veryold'), 'lang', lvl('veryold').length === 1 ? '1 product ligt al lang in de vriezer' : `${lvl('veryold').length} producten liggen al lang in de vriezer`, 'now');
    if (p.menu || opts.alles) {
        const vandaag = d.menu.filter(x => x.dag === today()).map(x => x.naam);
        const ontdooien = d.menu.filter(x => x.dag === dateKey(addDays(1)) && x.type === 'vriezer').map(x => x.naam);
        if (vandaag.length || ontdooien.length) msgs.push({
            title: vandaag.length ? 'Vandaag op het menu' : 'Morgen op het menu',
            body: [vandaag.length ? shortList(vandaag, 4) + '.' : '', ontdooien.length ? `Haal ${shortList(ontdooien, 3)} vandaag al uit de diepvries voor morgen.` : ''].filter(Boolean).join(' '),
            url: CFG.appUrl + '#/menu/week', tag: 'voorraad-menu'
        });
    }
    if ((p.lijst && new Date().getDay() === Number(p.lijstDag)) || (opts.alles && d.lijst.length)) {
        if (d.lijst.length) msgs.push({ title: `Boodschappen: ${plural(d.lijst.length, 'ding', 'dingen')} op je lijstje`, body: shortList(d.lijst, 6) + '.', url: CFG.appUrl + '#/lijst', tag: 'voorraad-lijst' });
    }
    if ((p.week && new Date().getDay() === 0) || opts.alles) {
        const w = await weekSummary(uid);
        if (w) msgs.push(w);
    }
    return msgs;
}

// Weekoverzicht uit het logboek (laatste 7 dagen, alle voorraden waar je bij kan)
let logCache = { dag: '', docs: [] };
async function weekSummary(uid) {
    if (logCache.dag !== today()) {
        const s = await db.collection('logs').where('timestamp', '>=', addDays(-7)).get().catch(() => ({ docs: [] }));
        logCache = { dag: today(), docs: s.docs.map(d => d.data()) };
    }
    const owners = new Set(await ownersOf(uid));
    const mine = logCache.docs.filter(l => owners.has(l.targetUserId));
    const n = (f) => mine.filter(f).length;
    const toe = n(l => l.action === 'Toevoegen' && !/ongedaan/i.test(l.details || ''));
    const op = n(l => l.action === 'Verwijderd' && /Opgegeten/.test(l.details || ''));
    const weg = n(l => l.action === 'Verwijderd' && /Weggegooid/.test(l.details || ''));
    if (!toe && !op && !weg) return null;
    return {
        title: 'Je week in Voorraad.',
        body: `${plural(toe, 'product', 'producten')} toegevoegd, ${op} opgegeten, ${weg} weggegooid.` + (weg === 0 && op > 0 ? ' Niets verspild, goed bezig!' : ''),
        url: CFG.appUrl + '#/meer/statistieken', tag: 'voorraad-week'
    };
}

async function dailyFor(uid) {
    const u = users.get(uid) || {};
    if (u.disabled || (u.vakantieTot && u.vakantieTot >= today())) return 0;
    let sent = 0;
    for (const m of await dailyMessages(uid)) sent += await sendToUser(uid, m);
    return sent;
}

// Elke 30 s: wie heeft zijn meldingsuur bereikt en kreeg vandaag nog niets?
state.dag = state.dag || {};
let busy = false;
setInterval(async () => {
    if (busy || !users.size) return;
    busy = true;
    try {
        const hm = new Date().toTimeString().slice(0, 5);
        let sent = 0, n = 0;
        for (const uid of subUids) {
            if (state.dag[uid] === today()) continue;
            // Bijgewerkt van een oudere server die vandaag al een ronde deed: niet opnieuw sturen.
            if (state.laatsteDag === today() && state.dag[uid] === undefined && !state.perGebruiker) { state.dag[uid] = today(); continue; }
            const tijd = prefsOf(users.get(uid)).tijd || CFG.uur;
            if (hm < tijd) continue;
            state.dag[uid] = today(); saveState();
            try { sent += await dailyFor(uid); n++; } catch (e) { log('Melding mislukt', uid, e.message); }
        }
        if (subUids.size && !state.perGebruiker) { state.perGebruiker = true; saveState(); }
        if (n) { log(`Dagelijkse meldingen: ${sent} naar ${n} gebruikers`); await heartbeat({ laatsteRonde: { op: FV.serverTimestamp(), verstuurd: sent, gebruikers: n } }); }
    } finally { busy = false; }
}, 30000);
setInterval(() => heartbeat(), 5 * 60 * 1000);

// Persoonlijke berichten van een beheerder → meteen een melding
db.collection('berichten').where('gemaaktOp', '>', started).onSnapshot(s => {
    s.docChanges().filter(c => c.type === 'added').forEach(c => {
        const m = c.doc.data();
        if (!prefsOf(users.get(m.userId)).bericht) return;
        sendToUser(m.userId, { title: 'Bericht van Voorraad.', body: m.text, url: CFG.appUrl, tag: 'bericht-' + c.doc.id })
            .then(n => log('Bericht-melding', m.userId, n));
    });
}, e => log('Berichten volgen mislukt:', e.message));

// Uitnodiging om samen een voorraad te beheren → melding naar wie uitgenodigd wordt
db.collection('shares').where('status', '==', 'pending').onSnapshot(s => {
    s.docChanges().filter(c => c.type === 'added').forEach(c => {
        const sh = c.doc.data();
        if (new Date(sh.createdAt || 0) < started) return;
        const email = (sh.sharedWithEmail || '').toLowerCase();
        for (const [uid, u] of users) {
            if ((u.email || '').toLowerCase() !== email || !prefsOf(u).uitnodiging) continue;
            const van = (users.get(sh.ownerId) || {}).displayName || sh.ownerEmail || 'Iemand';
            sendToUser(uid, { title: 'Uitnodiging om samen te beheren', body: `${van} nodigt je uit om samen de voorraad bij te houden. Tik om te antwoorden.`, url: CFG.appUrl + '#/voorraad', tag: 'uitnodiging-' + c.doc.id })
                .then(n => log('Uitnodiging-melding', uid, n));
        }
    });
}, e => log('Uitnodigingen volgen mislukt:', e.message));

// Wijzigingen in een locatie → melding naar wie die locatie volgt (niet naar wie het zelf deed).
// Wijzigingen worden 90 s gebundeld, zodat je niet per product een melding krijgt.
const bundels = new Map(); // uid|locId → { list, timer }
const werkwoord = (l) => l.action === 'Toevoegen' ? (/ongedaan/i.test(l.details || '') ? 'teruggezet' : 'toegevoegd')
    : l.action === 'Geconsumeerd' ? 'deels gebruikt'
        : l.action === 'Verwijderd' ? (/Opgegeten/.test(l.details || '') ? 'opgegeten' : /Weggegooid/.test(l.details || '') ? 'weggegooid' : 'verwijderd')
            : /Verplaatst/.test(l.details || '') ? 'verplaatst' : 'aangepast';
db.collection('logs').where('timestamp', '>', started).onSnapshot(s => {
    s.docChanges().filter(c => c.type === 'added').forEach(c => {
        const l = c.doc.data();
        if (!l.locId || !l.targetUserId) return;
        const wie = new Set([l.targetUserId, ...(toegang.get(l.targetUserId) || [])]);
        for (const uid of wie) {
            if (uid === l.actorId || !subUids.has(uid)) continue;
            const p = prefsOf(users.get(uid));
            if (!p.wijziging || !(p.locaties || []).includes(l.locId)) continue;
            const key = uid + '|' + l.locId;
            if (!bundels.has(key)) bundels.set(key, { list: [], timer: setTimeout(() => stuurBundel(key).catch(e => log('Wijziging-melding mislukt', e.message)), 90000) });
            bundels.get(key).list.push(l);
        }
    });
}, e => log('Logboek volgen mislukt:', e.message));
async function stuurBundel(key) {
    const b = bundels.get(key); bundels.delete(key);
    if (!b || !b.list.length) return;
    const [uid, locId] = key.split('|');
    const loc = (await db.collection('vriezers').doc(locId).get().catch(() => null));
    const ld = loc && loc.exists ? loc.data() : {};
    const naam = (l) => (l.gezinslid || (l.actorName || '').split(/[ @]/)[0] || 'Iemand');
    const regels = b.list.map(l => `${l.item} ${werkwoord(l)}`);
    const door = [...new Set(b.list.map(naam))].join(' en ');
    await sendToUser(uid, {
        title: `${ld.naam || 'Locatie'}: ${b.list.length === 1 ? '1 wijziging' : b.list.length + ' wijzigingen'}`,
        body: `${door}: ${shortList(regels, 5)}.`,
        url: CFG.appUrl + '#/voorraad/' + (ld.type || 'vriezer'), tag: 'wijziging-' + locId
    });
}

// ---------- Beheerders: alles wat gebruikers doen ----------
// Per beheerder en per gebruiker 60 s gebundeld; elke regel met een duidelijk icoon en alle details.
const adminUids = new Set();
db.collection('admins').onSnapshot(s => { adminUids.clear(); s.docs.forEach(d => adminUids.add(d.id)); }, e => log('Beheerders volgen mislukt:', e.message));
const activiteit = new Map(); // adminUid|actorId → { list, timer }
const EMOJI = (l) => {
    const d = (l.details || '');
    if (l.action === 'Toevoegen') return /ongedaan/i.test(d) ? '↩️' : '➕';
    if (l.action === 'Geconsumeerd') return /weggegooid/.test(d) ? '🗑️' : '🍽️';
    if (l.action === 'Verwijderd') return /Opgegeten/.test(d) ? '🍽️' : /Weggegooid/.test(d) ? '🗑️' : '❌';
    if (l.action === 'Bewerkt') return /Verplaatst/.test(d) ? '📦' : /Ongedaan/.test(d) ? '↩️' : '✏️';
    return { Lijst: '🛒', Menu: '📅', Recept: '📖', Locatie: '📍', Lade: '🗄️', Delen: '👥', Instellingen: '⚙️' }[l.action] || '•';
};
const WAT = (l) => {
    const d = (l.details || '');
    if (l.action === 'Toevoegen') return /ongedaan/i.test(d) ? 'teruggezet' : 'toegevoegd: ' + d;
    if (l.action === 'Geconsumeerd') return 'gebruikt: ' + d.replace(/^- /, '');
    if (l.action === 'Verwijderd') return /Opgegeten/.test(d) ? 'opgegeten' : /Weggegooid/.test(d) ? 'weggegooid' : 'verwijderd' + (d && d !== 'Verwijderd' ? ' (' + d + ')' : '');
    if (l.action === 'Bewerkt') return d || 'aangepast';
    return d;
};
db.collection('logs').where('timestamp', '>', started).onSnapshot(s => {
    s.docChanges().filter(c => c.type === 'added').forEach(c => {
        const l = c.doc.data();
        for (const admin of adminUids) {
            if (admin === l.actorId || !subUids.has(admin)) continue;
            const p = prefsOf(users.get(admin));
            if (!p.activiteit) continue;
            const van = p.activiteitVan || [];
            if (van.length && !van.includes(l.actorId) && !van.includes(l.targetUserId)) continue;
            const key = admin + '|' + l.actorId;
            if (!activiteit.has(key)) activiteit.set(key, { list: [], timer: setTimeout(() => stuurActiviteit(key).catch(e => log('Activiteit-melding mislukt', e.message)), 60000) });
            activiteit.get(key).list.push(l);
        }
    });
}, e => log('Logboek (beheer) volgen mislukt:', e.message));
async function stuurActiviteit(key) {
    const b = activiteit.get(key); activiteit.delete(key);
    if (!b || !b.list.length) return;
    const [admin] = key.split('|');
    const l0 = b.list[0];
    const actor = users.get(l0.actorId) || {};
    const wie = l0.gezinslid ? `${l0.gezinslid} (${actor.displayName || l0.actorName || '?'})` : (actor.displayName || l0.actorName || actor.email || 'Iemand');
    const doelen = [...new Set(b.list.map(l => l.targetUserId))].filter(t => t !== l0.actorId);
    const waar = doelen.length ? ' in voorraad van ' + doelen.map(t => { const u = users.get(t) || {}; return u.displayName || (u.email || '?').split('@')[0]; }).join(', ') : '';
    const regels = b.list.map(l => `${EMOJI(l)} ${l.item ? l.item + ' ' : ''}${WAT(l)}`.trim());
    const max = 8;
    await sendToUser(admin, {
        title: `${wie}${waar}: ${b.list.length === 1 ? '1 wijziging' : b.list.length + ' wijzigingen'}`,
        body: regels.slice(0, max).join('\n') + (regels.length > max ? `\n… en nog ${regels.length - max} (zie logboek)` : ''),
        url: CFG.appUrl + '#/admin/logboek', tag: 'activiteit-' + l0.actorId
    });
}

// Belangrijke mededeling (niet weg te klikken) → meteen een melding naar iedereen
let laatsteMededeling = null;
db.collection('settings').doc('mededeling').onSnapshot(d => {
    const m = d.exists ? d.data() : null;
    const first = laatsteMededeling === null; laatsteMededeling = m ? m.versie : 0;
    if (first || !m || !m.active || !m.vast || !(m.text || '').trim()) return;
    for (const uid of subUids) {
        if (!prefsOf(users.get(uid)).bericht) continue;
        sendToUser(uid, { title: 'Belangrijk bericht van Voorraad.', body: m.text, url: CFG.appUrl, tag: 'mededeling' });
    }
    log('Mededeling als melding verstuurd naar', subUids.size, 'gebruikers');
}, e => log('Mededeling volgen mislukt:', e.message));

// Testmeldingen vanuit de app (pushTest/{id} = { uid, soort: 'test' | 'voorraad' })
// ---------- Back-up, prullenbak en dagrapport ----------
async function doeBackup(reden) {
    try {
        const r = await maakBackup(db, BACKUPS, CFG.backupDagen);
        const weg = await ruimPrullenbakOp(db).catch(() => 0);
        log(`Back-up (${reden}): ${r.bestand}, ${Math.round(r.grootte / 1024)} kB, ${r.gebruikers} gebruikers; prullenbak: ${weg} opgeruimd`);
        await heartbeat({ laatsteBackup: { op: FV.serverTimestamp(), ...r, reden } });
        return r;
    } catch (e) { log('Back-up mislukt:', e.message); logFout('Back-up: ' + e.message); await heartbeat({ laatsteBackup: { op: FV.serverTimestamp(), fout: e.message } }); throw e; }
}
let rapportCfg = {};
db.collection('beheer').doc('dagrapport').onSnapshot(d => {
    const vorige = rapportCfg.testOp; rapportCfg = d.exists ? d.data() : {};
    const t = rapportCfg.testOp && (rapportCfg.testOp.toMillis ? rapportCfg.testOp.toMillis() : 0);
    if (t && t > gestart.getTime() && (!vorige || (vorige.toMillis && vorige.toMillis() !== t))) stuurRapport(true).catch(() => { });
}, e => log('Dagrapport volgen mislukt:', e.message));
async function stuurRapport(test = false) {
    const aan = (rapportCfg.aan || []).filter(Boolean);
    const mail = await mailer(process.env).catch(e => { log('Mail instellen mislukt', e.message); return null; });
    const melden = (x) => db.collection('beheer').doc('dagrapport').set({ laatste: { op: FV.serverTimestamp(), test, ...x } }, { merge: true }).catch(() => { });
    if (!mail) return melden({ ok: false, fout: 'Geen mailserver ingesteld op de server (SMTP_HOST, SMTP_USER en SMTP_PASS in .env).' });
    if (!aan.length) return melden({ ok: false, fout: 'Geen ontvangers gekozen.' });
    try {
        const r = await bouwRapport(db, { users, itemStatus, appUrl: CFG.appUrl, status: { versie: VERSIE, verstuurd: stats.verstuurd, mislukt: stats.mislukt, backup: state.laatsteBackupNaam || '' } });
        await mail.sendMail({ from: process.env.MAIL_VAN || process.env.SMTP_USER, to: aan.join(', '), subject: (test ? '[Test] ' : '') + r.onderwerp, html: r.html, text: r.tekst });
        log('Dagrapport verstuurd naar', aan.join(', '));
        return melden({ ok: true, aan });
    } catch (e) { log('Dagrapport mislukt:', e.message); logFout('Dagrapport: ' + e.message); return melden({ ok: false, fout: e.message }); }
}
setInterval(() => {
    const hm = new Date().toTimeString().slice(0, 5), dag = today();
    if (hm >= CFG.backupUur && state.backupDag !== dag) {
        state.backupDag = dag; saveState();
        doeBackup('nachtelijk').then(r => { state.laatsteBackupNaam = r.bestand; saveState(); }).catch(() => { });
    }
    if (rapportCfg.actief && hm >= (rapportCfg.uur || '20:00') && state.rapportDag !== dag) {
        state.rapportDag = dag; saveState();
        stuurRapport().catch(() => { });
    }
}, 30000);
// Na een herstart (stroompanne, update…) de beheerders even verwittigen.
setTimeout(() => {
    if (!adminUids.size) return;
    const kort = Date.now() - (state.laatsteHartslag || 0) < 15 * 60000;
    if (!kort) naarBeheerders({ title: 'Voorraad.-server is weer online', body: `Versie ${VERSIE} draait opnieuw${state.laatsteHartslag ? ' (offline sinds ' + new Date(state.laatsteHartslag).toLocaleString('nl-BE') + ')' : ''}.`, url: CFG.appUrl + '#/admin/app', tag: 'server-online' });
}, 20000);
setInterval(() => { state.laatsteHartslag = Date.now(); saveState(); }, 60000);

// Voorbeelden om elke soort melding te testen (beheerpagina)
const DAGELIJKS = ['verlopen', 'bijna', 'lang', 'menu', 'lijst', 'week'];
const VOORBEELD = {
    verlopen: { title: '2 producten zijn verlopen', body: 'Yoghurt, Sla. Tik voor de volledige lijst.', url: '#/eerst/now' },
    bijna: { title: '1 product vervalt binnenkort', body: 'Melk (nog 2 d). Tik om te bekijken.', url: '#/eerst/soon' },
    lang: { title: '1 product ligt al lang in de vriezer', body: 'Gehakt (7 mnd ingevroren). Tik om te bekijken.', url: '#/eerst/now' },
    menu: { title: 'Vandaag op het menu', body: 'Spaghetti. Haal Kipfilet vandaag al uit de diepvries voor morgen.', url: '#/menu/week' },
    lijst: { title: 'Boodschappen: 3 dingen op je lijstje', body: 'Melk, Brood, Eieren.', url: '#/lijst' },
    week: { title: 'Je week in Voorraad.', body: '12 producten toegevoegd, 9 opgegeten, 1 weggegooid.', url: '#/meer/statistieken' },
    wijziging: { title: 'Diepvries keuken: 2 wijzigingen', body: 'Marie: Gehakt toegevoegd, Kip opgegeten.', url: '#/voorraad/vriezer' },
    uitnodiging: { title: 'Uitnodiging om samen te beheren', body: 'Marie nodigt je uit om samen de voorraad bij te houden. Tik om te antwoorden.', url: '#/voorraad' },
    bericht: { title: 'Bericht van Voorraad.', body: 'Dit is een testbericht van de beheerder.', url: '' },
    activiteit: { title: 'Marie: 3 wijzigingen', body: '➕ Gehakt toegevoegd: 3 pak in Diepvries keuken › Lade 1\n🍽️ Kip opgegeten\n✏️ Melk: Aantal: 2 ➔ 1', url: '#/admin/logboek' },
    mededeling: { title: 'Belangrijk bericht van Voorraad.', body: 'Morgen tussen 9 en 10 u onderhoud aan de app.', url: '' }
};
db.collection('pushTest').onSnapshot(s => {
    s.docChanges().filter(c => c.type === 'added').forEach(async c => {
        const { uid, soort, subId } = c.doc.data();
        const toestel = subId ? ((await db.collection('pushAbonnementen').doc(subId).get().catch(() => null))?.data()?.toestel || '') : '';
        let msg = { title: 'Testmelding', body: (toestel ? `Meldingen werken op ${toestel}` : 'Meldingen werken op dit toestel') + ' 🎉', url: CFG.appUrl, tag: 'test' };
        let n = 0;
        if (soort === 'voorraad') {
            const list = await dailyMessages(uid, { alles: true });
            for (const m of list) n += await sendToUser(uid, m, subId || null);
            if (!list.length) n = await sendToUser(uid, { title: 'Alles in orde', body: 'Er moet vandaag niets dringend op.', url: CFG.appUrl, tag: 'test' }, subId || null);
        } else if (VOORBEELD[soort]) {
            // Eén soort melding testen: met de echte gegevens als die er zijn, anders een voorbeeld.
            const echt = DAGELIJKS.includes(soort) ? (await dailyMessages(uid, { alles: true })).find(m => m.tag === 'voorraad-' + soort) : null;
            const m = echt || { ...VOORBEELD[soort], body: 'Voorbeeld: ' + VOORBEELD[soort].body, url: CFG.appUrl + VOORBEELD[soort].url };
            n = await sendToUser(uid, { ...m, tag: 'test-' + soort }, subId || null);
        } else n = await sendToUser(uid, msg, subId || null);
        await pushDoc.set({ laatsteTest: { uid, soort: soort || 'test', verstuurd: n, op: FV.serverTimestamp(), ...(toestel ? { toestel } : {}) } }, { merge: true }).catch(() => { });
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
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
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
// Welke foto's worden nog gebruikt? Zoekt in alle documenten naar /fotos/<uid>/<naam>.
const FOTO_RE = /\/fotos\/([A-Za-z0-9_-]+\/[a-f0-9]{32}\.(?:jpg|png|webp))/g;
async function fotosInGebruik() {
    const used = new Set();
    for (const c of ['items', 'lades', 'vriezers', 'barcodes', 'users', 'recepten', 'prullenbak']) {
        const snap = await db.collection(c).get();
        snap.forEach(d => { for (const m of JSON.stringify(d.data()).matchAll(FOTO_RE)) used.add(m[1]); });
    }
    return used;
}
function alleFotos() {
    const out = [];
    if (!fs.existsSync(FOTOS)) return out;
    for (const dir of fs.readdirSync(FOTOS)) {
        const p = path.join(FOTOS, dir);
        if (!fs.statSync(p).isDirectory()) continue;
        for (const f of fs.readdirSync(p)) out.push({ key: dir + '/' + f, file: path.join(p, f), size: fs.statSync(path.join(p, f)).size, mtime: fs.statSync(path.join(p, f)).mtimeMs });
    }
    return out;
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
            // Een foto mag weg zodra niets in de app hem nog gebruikt (ook als iemand anders hem uploadde,
            // bv. in een gedeelde voorraad). Wordt hij nog gebruikt, dan blijft hij staan.
            if ((await fotosInGebruik()).has(fm[1] + '/' + fm[2])) return json(res, 409, { fout: 'Foto wordt nog gebruikt' });
            fs.rmSync(path.join(FOTOS, fm[1], fm[2]), { force: true });
            log('Foto verwijderd', fm[1] + '/' + fm[2]);
            return json(res, 200, { ok: true });
        }

        // Beheer: back-ups bekijken, downloaden en meteen maken
        if (url.pathname === '/backups' || url.pathname.startsWith('/backups/')) {
            const user = await userFrom(req);
            if (!user) return json(res, 401, { fout: 'Niet ingelogd' });
            if (!(await db.collection('admins').doc(user.uid).get()).exists) return json(res, 403, { fout: 'Enkel voor beheerders' });
            if (req.method === 'GET' && url.pathname === '/backups') return json(res, 200, { lijst: lijstBackups(BACKUPS) });
            if (req.method === 'POST' && url.pathname === '/backups/nu') { const r = await doeBackup('met de hand'); state.laatsteBackupNaam = r.bestand; saveState(); return json(res, 200, r); }
            const bm = /^\/backups\/(voorraad-[0-9-]+\.json\.gz)$/.exec(url.pathname);
            if (req.method === 'GET' && bm) {
                const body = leesBackup(BACKUPS, bm[1]);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${bm[1].replace('.gz', '')}"` });
                return res.end(body);
            }
            return json(res, 404, { fout: 'Niet gevonden' });
        }

        // Beheer: hoeveel foto's staan er, en welke worden niet meer gebruikt? (?wis=1 ruimt ze op)
        if (req.method === 'POST' && url.pathname === '/opruimen') {
            const user = await userFrom(req);
            if (!user) return json(res, 401, { fout: 'Niet ingelogd' });
            if (!(await db.collection('admins').doc(user.uid).get()).exists) return json(res, 403, { fout: 'Enkel voor beheerders' });
            const used = await fotosInGebruik(), all = alleFotos();
            // Heel recente foto's niet aanraken: misschien is iemand net een product aan het bewaren.
            const weg = all.filter(f => !used.has(f.key) && Date.now() - f.mtime > 10 * 60 * 1000);
            if (url.searchParams.get('wis') === '1') { weg.forEach(f => fs.rmSync(f.file, { force: true })); log('Opgeruimd', weg.length, "foto's"); }
            const mb = (l) => Math.round(l.reduce((s, f) => s + f.size, 0) / 104857.6) / 10;
            return json(res, 200, { totaal: all.length, totaalMb: mb(all), ongebruikt: weg.length, ongebruiktMb: mb(weg), gewist: url.searchParams.get('wis') === '1' });
        }
        res.writeHead(404); res.end();
    } catch (e) {
        log('Fout', req.method, url.pathname, e.message);
        json(res, e.code === 413 ? 413 : 500, { fout: e.code === 413 ? 'Te groot' : 'Serverfout' });
    }
}).listen(CFG.port, () => log(`Voorraad.-server ${VERSIE} luistert op poort ${CFG.port}${CFG.publicUrl ? ' (foto\'s via ' + CFG.publicUrl + ')' : ' (foto-opslag uit: PUBLIC_URL niet ingesteld)'}; dagelijkse melding om ${CFG.uur}`));

heartbeat();
