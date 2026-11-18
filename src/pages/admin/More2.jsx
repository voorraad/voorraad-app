import React, { useEffect, useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { db } from '../../lib/firebase.js';
import { useStore } from '../../state/store.jsx';
import { useUi } from '../../state/ui.jsx';
import { Card, Button, Input, Select, Toggle, SectionTitle } from '../../components/ui.jsx';
import { userTone } from '../../lib/userColors.js';
import { useAllUserData } from './data.js';
import { kindOf } from './Extra.jsx';
import { RIGHT_PRESETS, TYPE_BY_ID } from '../../lib/constants.js';
import { cx, toDate, formatDate, formatDateTime, todayKey, dateKey, addDays, euro, plural, normalize, sortLocaties, byName } from '../../lib/utils.js';

const nameOf = (u) => (u && (u.displayName || (u.email || '').split('@')[0])) || '?';
const Avatar = ({ u, usersList, size = 'w-8 h-8 text-xs' }) => (
    <span className={cx('rounded-full flex-shrink-0 flex items-center justify-center font-bold', size, userTone(u.id, usersList).pill)}>{((u.email || u.displayName || '?')[0] || '?').toUpperCase()}</span>
);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ================= 18. Wie werkt nu in de app =================
const ONLINE_MS = 3 * 60 * 1000;
export const isOnline = (u) => { const t = toDate(u.actiefOp); return !!t && Date.now() - t < ONLINE_MS; };
export function OnlineNow() {
    const { usersList } = useStore();
    const { go } = useUi();
    const [, tick] = useState(0);
    useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t); }, []);
    const online = usersList.filter(isOnline);
    return (
        <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="relative flex w-2.5 h-2.5"><span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" /><span className="relative w-2.5 h-2.5 rounded-full bg-emerald-500" /></span>
                <p className="font-bold text-sm flex-1">Nu in de app</p>
                <span className="text-sm font-bold tabular-nums">{online.length}</span>
            </div>
            {online.length === 0 ? <p className="text-sm text-stone-500">Niemand op dit moment.</p> : (
                <div className="flex flex-wrap gap-2">
                    {online.map(u => (
                        <button key={u.id} type="button" onClick={() => go('admin/dashboard/' + u.id)} className="h-10 pl-1 pr-3 rounded-full bg-stone-50 dark:bg-stone-800 flex items-center gap-2 text-sm">
                            <span className="relative"><Avatar u={u} usersList={usersList} size="w-8 h-8 text-xs" /><span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-stone-800" /></span>
                            <span className="font-medium">{nameOf(u)}</span><span className="text-xs text-stone-500">{u.actiefWaar || ''}</span>
                        </button>
                    ))}
                </div>
            )}
        </Card>
    );
}

// ================= 15. Vakantiemodus =================
export const onHoliday = (u) => !!(u && u.vakantieTot && u.vakantieTot >= todayKey());
export function HolidayMode({ u }) {
    const { actions } = useStore();
    const [date, setDate] = useState(u.vakantieTot || dateKey(addDays(new Date(), 14)));
    const on = onHoliday(u);
    return (
        <div className="rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/50 p-3 mt-3">
            <p className="text-sm font-semibold flex items-center gap-1.5"><Icon name="Sun" size={16} className="text-sky-600" />Vakantiemodus {on && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-sky-600 text-white">aan tot {formatDate(u.vakantieTot)}</span>}</p>
            <p className="text-xs text-stone-500 mt-0.5">Geen meldingen en geen "eerst opmaken"-waarschuwingen tot en met deze datum.</p>
            <div className="flex flex-wrap gap-2 mt-2">
                <Input type="date" value={date} min={todayKey()} onChange={e => setDate(e.target.value)} className="w-44 h-9" />
                <Button size="sm" icon="Sun" disabled={!date} onClick={() => { actions.setUserField(u.id, { vakantieTot: date }); actions.notify('Vakantiemodus aan tot ' + formatDate(date)); }}>{on ? 'Aanpassen' : 'Aanzetten'}</Button>
                {on && <Button size="sm" variant="secondary" onClick={() => { actions.setUserField(u.id, { vakantieTot: null }); actions.notify('Vakantiemodus uit'); }}>Uitzetten</Button>}
            </div>
        </div>
    );
}

// ================= 17. Opslag per gebruiker =================
const kb = (b) => !b ? '0 kB' : b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' kB';
export function StorageUsage() {
    const { usersList } = useStore();
    const data = useAllUserData(usersList);
    const rows = usersList.map(u => ({ u, o: data[u.id] && data[u.id].opslag })).sort((a, b) => ((b.o && b.o.bytes) || 0) - ((a.o && a.o.bytes) || 0));
    const total = rows.reduce((a, r) => a + ((r.o && r.o.bytes) || 0), 0);
    const max = Math.max(1, ...rows.map(r => (r.o && r.o.bytes) || 0));
    return (
        <section>
            <SectionTitle action={<span className="text-sm font-bold tabular-nums">{kb(total)}</span>}>Opslag & snelheid</SectionTitle>
            <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                {rows.map(({ u, o }) => {
                    const slow = o && o.bytes > 1048576;
                    return (
                        <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                            <Avatar u={u} usersList={usersList} />
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between gap-2"><p className="text-sm font-medium truncate">{nameOf(u)}</p><p className={cx('text-sm font-bold tabular-nums', slow && 'text-amber-600')}>{o ? kb(o.bytes) : '…'}</p></div>
                                <div className="mt-1 h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden flex">
                                    {o && <><span className="block h-full bg-teal-500" style={{ width: ((o.bytes - o.fotoBytes) / max) * 100 + '%' }} /><span className="block h-full bg-amber-400" style={{ width: (o.fotoBytes / max) * 100 + '%' }} /></>}
                                </div>
                                {o && <p className="text-[11px] text-stone-500 mt-1">{o.docs} items in de database · {plural(o.fotos, 'foto', "foto's")} ({kb(o.fotoBytes)}){slow ? ' · de app laadt trager' : ''}</p>}
                            </div>
                        </div>
                    );
                })}
            </Card>
            <p className="text-xs text-stone-400 mt-2 flex items-center gap-3"><span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-teal-500" />gegevens</span><span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />foto's</span><span>Boven 1 MB per gebruiker merk je dat de app trager opent.</span></p>
        </section>
    );
}

// ================= 16. Standaardinstellingen voor nieuwe gebruikers =================
export function NewUserDefaults() {
    const { usersList, user, actions } = useStore();
    const [cur, setCur] = useState(null);
    const [from, setFrom] = useState(user.uid);
    const [withCats, setWithCats] = useState(true);
    const [withLocs, setWithLocs] = useState(true);
    const [preset, setPreset] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => db.collection('settings').doc('standaard').onSnapshot(d => setCur(d.exists ? d.data() : {}), () => setCur({})), []);
    const save = async () => {
        setBusy(true);
        try {
            const src = usersList.find(u => u.id === from) || {};
            const patch = { actief: true, bron: src.email || '', op: new Date() };
            if (withCats) ['customCategories', 'customUnitsVries', 'customUnitsFrig', 'customUnitsVoorraad'].forEach(k => { patch[k] = Array.isArray(src[k]) ? src[k] : null; });
            else ['customCategories', 'customUnitsVries', 'customUnitsFrig', 'customUnitsVoorraad'].forEach(k => { patch[k] = null; });
            if (withLocs) {
                const [v, l] = await Promise.all([db.collection('vriezers').where('userId', '==', from).get(), db.collection('lades').where('userId', '==', from).get()]);
                const lades = l.docs.map(d => d.data());
                patch.locaties = sortLocaties(v.docs.map(d => ({ id: d.id, ...d.data() }))).map(x => ({ naam: x.naam, type: x.type || 'vriezer', color: x.color || 'blue', locatieGroep: x.locatieGroep || 'Thuis', lades: lades.filter(y => y.vriezerId === x.id).sort(byName).map(y => y.naam) }));
            } else patch.locaties = null;
            const p = RIGHT_PRESETS.find(x => x.id === preset);
            patch.hiddenTabs = p ? p.hidden : null;
            await db.collection('settings').doc('standaard').set(patch, { merge: true });
            actions.notify('Standaard voor nieuwe gebruikers bewaard');
        } catch (e) { actions.notify('Mislukt: ' + (e.message || e), 'error'); }
        setBusy(false);
    };
    const locs = (cur && cur.locaties) || [];
    return (
        <section>
            <SectionTitle>Standaard voor nieuwe gebruikers</SectionTitle>
            <Card className="p-4 space-y-3">
                {cur && cur.op && (
                    <div className="rounded-xl bg-stone-50 dark:bg-stone-800/60 p-3 text-sm">
                        <Toggle checked={!!cur.actief} onChange={c => db.collection('settings').doc('standaard').set({ actief: c }, { merge: true })} label="Toepassen bij nieuwe gebruikers" description={`Overgenomen van ${cur.bron || '?'} op ${formatDateTime(cur.op)}`} />
                        <ul className="text-xs text-stone-600 dark:text-stone-300 space-y-0.5 mt-1">
                            <li>• {cur.customCategories ? plural(cur.customCategories.length, 'categorie', 'categorieën') + ' en eenheden' : 'Gewone categorieën en eenheden'}</li>
                            <li>• {locs.length ? locs.map(l => `${l.naam} (${TYPE_BY_ID[l.type] ? TYPE_BY_ID[l.type].label : l.type}${l.lades.length ? ', ' + plural(l.lades.length, 'lade', 'lades') : ''})`).join(', ') : 'Geen locaties'}</li>
                            <li>• Rechten: {cur.hiddenTabs ? (RIGHT_PRESETS.find(p => p.hidden.length === cur.hiddenTabs.length && p.hidden.every(h => cur.hiddenTabs.includes(h))) || { label: plural(cur.hiddenTabs.length, 'recht uit', 'rechten uit') }).label : 'alles mag'}</li>
                        </ul>
                    </div>
                )}
                <p className="text-sm text-stone-600 dark:text-stone-300">Neem de instellingen van een bestaande gebruiker over. Een nieuwe gebruiker krijgt die bij de eerste keer inloggen (lege locaties en lades, zonder producten). Een uitnodiging met eigen rechten gaat voor.</p>
                <label className="block text-xs font-semibold text-stone-500">Overnemen van
                    <Select value={from} onChange={e => setFrom(e.target.value)} className="mt-1">{usersList.map(u => <option key={u.id} value={u.id}>{u.email || u.displayName}</option>)}</Select>
                </label>
                <Toggle checked={withCats} onChange={setWithCats} label="Categorieën en eenheden" />
                <Toggle checked={withLocs} onChange={setWithLocs} label="Locaties en lades (leeg)" />
                <label className="block text-xs font-semibold text-stone-500">Rechten
                    <Select value={preset} onChange={e => setPreset(e.target.value)} className="mt-1">
                        <option value="">Alles mag</option>
                        {RIGHT_PRESETS.filter(p => p.id !== 'alles').map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </Select>
                </label>
                <Button icon="Check" disabled={busy} onClick={save}>{busy ? 'Bezig…' : 'Opslaan als standaard'}</Button>
            </Card>
        </section>
    );
}

// ================= 14. Maandrapport =================
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export function MonthReport() {
    const { usersList, actions } = useStore();
    const data = useAllUserData(usersList);
    const now = new Date();
    const options = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); return { key: `${d.getFullYear()}-${d.getMonth()}`, d }; });
    const [month, setMonth] = useState(options[0].key);
    const [who, setWho] = useState('');
    const [busy, setBusy] = useState(false);
    const make = async () => {
        const w = window.open('', '_blank');
        if (!w) { actions.notify('Sta pop-ups toe om het rapport te openen.', 'error'); return; }
        w.document.write('<p style="font:16px sans-serif;padding:24px">Rapport maken…</p>');
        setBusy(true);
        try {
            const start = options.find(o => o.key === month).d, end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
            const s = await db.collection('logs').where('timestamp', '>=', start).where('timestamp', '<', end).orderBy('timestamp', 'desc').limit(5000).get();
            const logs = s.docs.map(d => d.data());
            const users = who ? usersList.filter(u => u.id === who) : usersList;
            const title = `Maandrapport ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
            const top = (list, n = 5) => { const m = {}; list.forEach(l => { const k = normalize(l.item); if (!k) return; m[k] = m[k] || [l.item, 0]; m[k][1]++; }); return Object.values(m).sort((a, b) => b[1] - a[1]).slice(0, n); };
            const tot = { added: 0, eaten: 0, wasted: 0 };
            const blocks = users.map(u => {
                const ul = logs.filter(l => l.targetUserId === u.id);
                const by = { added: [], eaten: [], wasted: [] };
                ul.forEach(l => { const k = kindOf(l); if (k) by[k].push(l); });
                Object.keys(tot).forEach(k => { tot[k] += by[k].length; });
                const d = data[u.id] || {};
                const pct = by.eaten.length + by.wasted.length ? Math.round(by.wasted.length / (by.eaten.length + by.wasted.length) * 100) : null;
                const list = (rows) => rows.length ? `<ol>${rows.map(([n, c]) => `<li>${esc(n)} <span class="m">${c}×</span></li>`).join('')}</ol>` : '<p class="m">—</p>';
                return `<section><h2>${esc(nameOf(u))} <span class="m">${esc(u.email || '')}</span></h2>
                    <div class="kpis"><div><b>${by.added.length}</b>toegevoegd</div><div><b>${by.eaten.length}</b>opgegeten</div><div><b class="r">${by.wasted.length}</b>weggegooid</div><div><b>${pct == null ? '–' : pct + '%'}</b>verspild</div><div><b>${d.items ?? '–'}</b>nu in voorraad</div><div><b>${d.value != null ? esc(euro(d.value)) : '–'}</b>waarde</div><div><b class="r">${d.expired ?? '–'}</b>nu verlopen</div></div>
                    <div class="cols"><div><h3>Meest toegevoegd</h3>${list(top(by.added))}</div><div><h3>Meest weggegooid</h3>${list(top(by.wasted))}</div><div><h3>Actiefste dagen</h3>${list(top(ul.map(l => ({ item: (toDate(l.timestamp) || new Date()).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'short' }) })), 3))}</div></div></section>`;
            }).join('');
            w.document.open();
            w.document.write(`<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
                @page { size: A4; margin: 14mm; } body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1c1917; margin: 0; padding: 24px; }
                h1 { font-size: 22px; margin: 0; } .sub { color: #78716c; margin: 4px 0 18px; } h2 { font-size: 16px; margin: 0 0 8px; } h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #78716c; margin: 0 0 4px; }
                .m { color: #78716c; font-weight: 400; font-size: 12px; } section { border: 1px solid #e7e5e4; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; break-inside: avoid; }
                .kpis { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 10px; } .kpis div { background: #f5f5f4; border-radius: 8px; padding: 6px 8px; font-size: 11px; color: #57534e; } .kpis b { display: block; font-size: 17px; color: #1c1917; } .kpis b.r { color: #dc2626; }
                .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; } ol { margin: 0; padding-left: 18px; font-size: 13px; } .tot { display: flex; gap: 18px; margin-bottom: 14px; font-size: 14px; }
                @media print { body { padding: 0; } .noprint { display: none; } }
            </style></head><body><h1>${esc(title)}</h1><p class="sub"><b style="color:#1c1917">Voorraad<span style="color:#0d9488">.</span></b> · ${users.length === 1 ? esc(nameOf(users[0])) : users.length + ' gebruikers'} · gemaakt op ${esc(formatDateTime(new Date()))}</p>
            ${users.length > 1 ? `<div class="tot"><span><b>${tot.added}</b> toegevoegd</span><span><b>${tot.eaten}</b> opgegeten</span><span><b style="color:#dc2626">${tot.wasted}</b> weggegooid</span></div>` : ''}
            ${blocks}<p class="noprint m">Bewaar als PDF via Afdrukken → "Opslaan als PDF".</p><script>setTimeout(function(){window.print()},500)<\/script></body></html>`);
            w.document.close();
        } catch (e) { w.close(); actions.notify('Rapport mislukt: ' + (e.message || e), 'error'); }
        setBusy(false);
    };
    return (
        <section>
            <SectionTitle>Maandrapport</SectionTitle>
            <Card className="p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-2">
                    <Select value={month} onChange={e => setMonth(e.target.value)}>{options.map(o => <option key={o.key} value={o.key}>{MONTHS[o.d.getMonth()]} {o.d.getFullYear()}</option>)}</Select>
                    <Select value={who} onChange={e => setWho(e.target.value)}><option value="">Alle gebruikers</option>{usersList.map(u => <option key={u.id} value={u.id}>{u.email || u.displayName}</option>)}</Select>
                </div>
                <Button icon="Printer" disabled={busy} onClick={make}>{busy ? 'Bezig…' : 'Rapport maken (afdrukken of PDF)'}</Button>
                <p className="text-xs text-stone-500">Per gebruiker: toegevoegd, opgegeten en weggegooid in die maand, de toppers, en hoe de voorraad er nu bij ligt.</p>
            </Card>
        </section>
    );
}
