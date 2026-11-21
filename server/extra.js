// Extra taken van de server: automatische back-up, opruimen van de prullenbak en het dagrapport per mail.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const BACKUP_COLLS = ['vriezers', 'lades', 'items', 'shoppingList', 'recepten'];
const EXTRA_COLLS = ['settings', 'shares', 'toegang', 'berichten', 'pushAbonnementen', 'barcodes', 'adminNotes', 'beheer', 'prullenbak'];
const plain = (k, v) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v);

// ---------- Back-up (zelfde formaat als 'Back-up van alles' op de beheerpagina, dus terug te zetten) ----------
export async function maakBackup(db, dir, bewaarDagen = 30) {
    fs.mkdirSync(dir, { recursive: true });
    const out = { app: 'Voorraad.', soort: 'automatische back-up (server)', gemaaktOp: new Date().toISOString(), gebruikers: [], extra: {} };
    const users = await db.collection('users').get();
    const per = {};
    for (const c of BACKUP_COLLS) {
        const s = await db.collection(c).get();
        s.docs.forEach(d => { const x = d.data(); (per[x.userId] = per[x.userId] || {}); (per[x.userId][c] = per[x.userId][c] || []).push({ id: d.id, ...x }); });
    }
    users.docs.forEach(u => {
        const e = { id: u.id, profiel: { id: u.id, ...u.data() } };
        BACKUP_COLLS.forEach(c => { e[c] = (per[u.id] && per[u.id][c]) || []; });
        out.gebruikers.push(e);
    });
    for (const c of EXTRA_COLLS) {
        const s = await db.collection(c).get().catch(() => ({ docs: [] }));
        out.extra[c] = s.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    const naam = `voorraad-${new Date().toLocaleDateString('sv-SE')}.json.gz`;
    const buf = zlib.gzipSync(Buffer.from(JSON.stringify(out, plain)));
    fs.writeFileSync(path.join(dir, naam), buf);
    // Oude back-ups opruimen
    const grens = Date.now() - bewaarDagen * 86400000;
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (/^voorraad-.*\.json\.gz$/.test(f) && f !== naam && fs.statSync(p).mtimeMs < grens) fs.rmSync(p, { force: true });
    }
    const items = out.gebruikers.reduce((s, g) => s + g.items.length, 0);
    return { bestand: naam, grootte: buf.length, gebruikers: out.gebruikers.length, items };
}
export function lijstBackups(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => /^voorraad-.*\.json\.gz$/.test(f)).map(f => {
        const st = fs.statSync(path.join(dir, f));
        return { bestand: f, grootte: st.size, op: st.mtime.toISOString() };
    }).sort((a, b) => b.op.localeCompare(a.op));
}
export const leesBackup = (dir, naam) => zlib.gunzipSync(fs.readFileSync(path.join(dir, path.basename(naam))));

// ---------- Prullenbak: ouder dan 30 dagen definitief weg ----------
export async function ruimPrullenbakOp(db, dagen = 30) {
    const grens = new Date(Date.now() - dagen * 86400000);
    const s = await db.collection('prullenbak').where('verwijderdOp', '<', grens).get();
    for (const d of s.docs) await d.ref.delete();
    return s.size;
}

// ---------- Dagrapport per mail ----------
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EMOJI = (l) => {
    const d = l.details || '';
    if (l.action === 'Toevoegen') return /ongedaan|Teruggezet/i.test(d) ? '↩️' : '➕';
    if (l.action === 'Geconsumeerd') return '🍽️';
    if (l.action === 'Verwijderd') return /Opgegeten/.test(d) ? '🍽️' : /Weggegooid/.test(d) ? '🗑️' : '❌';
    if (l.action === 'Bewerkt') return /Verplaatst/.test(d) ? '📦' : /Ongedaan/.test(d) ? '↩️' : '✏️';
    return { Lijst: '🛒', Menu: '📅', Recept: '📖', Locatie: '📍', Lade: '🗄️', Delen: '👥', Instellingen: '⚙️' }[l.action] || '•';
};
const soortVan = (l) => {
    const d = l.details || '';
    if (l.action === 'Toevoegen' && !/ongedaan|Teruggezet/i.test(d)) return 'toe';
    if (l.action === 'Geconsumeerd' || (l.action === 'Verwijderd' && /Opgegeten/.test(d))) return 'op';
    if (/Weggegooid|weggegooid/.test(d)) return 'weg';
    return 'ander';
};

export async function bouwRapport(db, { users, itemStatus, appUrl, status, uren = 24 }) {
    const sinds = new Date(Date.now() - uren * 3600000);
    const logs = (await db.collection('logs').where('timestamp', '>=', sinds).get()).docs.map(d => d.data())
        .sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0));
    const naam = (id) => { const u = users.get(id) || {}; return u.displayName || (u.email || '?').split('@')[0]; };
    // Verlopen per gebruiker
    const [v, i] = await Promise.all([db.collection('vriezers').get(), db.collection('items').get()]);
    const types = Object.fromEntries(v.docs.map(d => [d.id, d.data().type || 'vriezer']));
    const verlopen = {};
    i.docs.forEach(d => { const it = d.data(); if (!types[it.vriezerId]) return; const st = itemStatus(it, types[it.vriezerId]); if (st.level === 'expired') (verlopen[it.userId] = verlopen[it.userId] || []).push(it.naam); });
    const nieuw = [...users.entries()].filter(([, u]) => { const c = u.aangemaaktOp || u.createdAt; const t = c && (c.toDate ? c.toDate() : new Date(c)); return t && t >= sinds; });
    const perActor = {};
    logs.forEach(l => (perActor[l.actorId] = perActor[l.actorId] || []).push(l));
    const tel = (list, s) => list.filter(l => soortVan(l) === s).length;
    const totaal = { toe: tel(logs, 'toe'), op: tel(logs, 'op'), weg: tel(logs, 'weg') };
    const blok = Object.entries(perActor).sort((a, b) => b[1].length - a[1].length).map(([id, list]) => `
        <h3 style="margin:22px 0 6px;font-size:16px">${esc(naam(id))} <span style="color:#78716c;font-weight:normal;font-size:13px">· ${list.length} acties · ➕ ${tel(list, 'toe')} · 🍽️ ${tel(list, 'op')} · 🗑️ ${tel(list, 'weg')}</span></h3>
        <table style="border-collapse:collapse;width:100%;font-size:13px">${list.slice(0, 40).map(l => `
            <tr><td style="padding:3px 6px;color:#78716c;white-space:nowrap;vertical-align:top">${l.timestamp?.toDate ? l.timestamp.toDate().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }) : ''}</td>
            <td style="padding:3px 6px;vertical-align:top">${EMOJI(l)} <b>${esc(l.item)}</b> ${esc(l.details)}${l.targetUserId && l.targetUserId !== l.actorId ? ` <span style="color:#a8a29e">(voorraad van ${esc(naam(l.targetUserId))})</span>` : ''}</td></tr>`).join('')}
        </table>${list.length > 40 ? `<p style="color:#78716c;font-size:12px">… en nog ${list.length - 40}, zie het logboek.</p>` : ''}`).join('');
    const verl = Object.entries(verlopen).filter(([, l]) => l.length).map(([id, l]) => `<li><b>${esc(naam(id))}</b>: ${l.length} (${esc(l.slice(0, 6).join(', '))}${l.length > 6 ? ', …' : ''})</li>`).join('');
    const datum = new Date().toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
    const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:640px;margin:auto;color:#1c1917">
        <h1 style="font-size:22px;margin:0 0 4px">Voorraad<span style="color:#0d9488">.</span> dagrapport</h1>
        <p style="color:#78716c;margin:0 0 18px">${esc(datum)} · laatste ${uren} uur</p>
        <table style="width:100%;border-collapse:separate;border-spacing:8px 0;margin:0 -8px 8px"><tr>
            ${[['Acties', logs.length], ['Toegevoegd', totaal.toe], ['Opgegeten', totaal.op], ['Weggegooid', totaal.weg]].map(([k, n]) => `<td style="background:#f5f5f4;border-radius:12px;padding:10px 12px"><div style="font-size:22px;font-weight:700">${n}</div><div style="font-size:12px;color:#78716c">${k}</div></td>`).join('')}
        </tr></table>
        ${nieuw.length ? `<p>👋 <b>Nieuwe gebruikers:</b> ${nieuw.map(([id]) => esc(naam(id))).join(', ')}</p>` : ''}
        ${blok || '<p style="color:#78716c">Geen activiteit.</p>'}
        ${verl ? `<h3 style="margin:24px 0 6px;font-size:16px">⚠️ Nu verlopen</h3><ul style="font-size:13px;padding-left:18px">${verl}</ul>` : ''}
        ${status ? `<p style="font-size:12px;color:#78716c;margin-top:24px">Server ${esc(status.versie)} · meldingen vandaag: ${status.verstuurd} verstuurd, ${status.mislukt} mislukt${status.backup ? ` · laatste back-up ${esc(status.backup)}` : ''}</p>` : ''}
        <p style="margin-top:20px"><a href="${appUrl}#/admin/logboek" style="background:#0d9488;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">Open het logboek</a></p>
    </div>`;
    const tekst = `Voorraad. dagrapport (${datum})\n${logs.length} acties: ${totaal.toe} toegevoegd, ${totaal.op} opgegeten, ${totaal.weg} weggegooid.\n\n` +
        Object.entries(perActor).map(([id, list]) => `${naam(id)}:\n` + list.slice(0, 40).map(l => `  ${EMOJI(l)} ${l.item} ${l.details || ''}`).join('\n')).join('\n\n');
    return { onderwerp: `Voorraad. dagrapport: ${logs.length} acties, ${totaal.weg} weggegooid`, html, tekst };
}

let transporter = null;
export async function mailer(env) {
    if (!env.SMTP_HOST || !env.SMTP_USER) return null;
    if (transporter) return transporter;
    const nodemailer = (await import('nodemailer')).default;
    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587), secure: Number(env.SMTP_PORT) === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
    });
    return transporter;
}
