import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { db, runBatched } from '../../lib/firebase.js';
import { useStore } from '../../state/store.jsx';
import { useUi } from '../../state/ui.jsx';
import { Card, Button, Toggle, SectionTitle, Select, Textarea, Segmented } from '../../components/ui.jsx';
import { userTone } from '../../lib/userColors.js';
import { cx, toDate, formatDateTime, mondayOf, dateKey, normalize, downloadBlob, isMenuEntry, euro, num, round2, plural } from '../../lib/utils.js';

const nameOf = (u) => (u && (u.displayName || (u.email || '').split('@')[0])) || '?';
const Avatar = ({ u, usersList, size = 'w-8 h-8 text-xs' }) => (
    <span className={cx('rounded-full flex-shrink-0 flex items-center justify-center font-bold', size, userTone(u.id, usersList).pill)}>{(u.email || u.displayName || '?')[0].toUpperCase()}</span>
);

// ================= Nieuwe gebruikers =================
// De beheerder onthoudt welke gebruikers hij al gezien heeft (users/{admin}.adminBekendeGebruikers).
export function useNewUsers() {
    const { usersList, me, meLoaded, isAdmin, actions } = useStore();
    const known = me.adminBekendeGebruikers;
    useEffect(() => {
        // Eerste keer: iedereen die nu bestaat geldt als gekend.
        if (isAdmin && meLoaded && !Array.isArray(known) && usersList.length) actions.setMine({ adminBekendeGebruikers: usersList.map(u => u.id) });
    }, [isAdmin, meLoaded, !!known, usersList.length]);
    const list = Array.isArray(known) ? usersList.filter(u => !known.includes(u.id)) : [];
    const markSeen = () => actions.setMine({ adminBekendeGebruikers: usersList.map(u => u.id) });
    return [list, markSeen];
}

export function NewUsersBanner() {
    const { usersList } = useStore();
    const { go } = useUi();
    const [list, markSeen] = useNewUsers();
    if (!list.length) return null;
    return (
        <Card className="p-4 border-teal-300 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/30">
            <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0"><Icon name="Sparkles" size={18} /></span>
                <p className="flex-1 min-w-0 font-bold self-center">{list.length === 1 ? 'Er is een nieuwe gebruiker' : `Er zijn ${list.length} nieuwe gebruikers`}</p>
                <Button size="sm" variant="secondary" icon="Check" onClick={markSeen}>Gezien</Button>
            </div>
                    <div className="mt-3 space-y-1.5">
                        {list.map(u => (
                            <div key={u.id} className="flex items-center gap-2">
                                <Avatar u={u} usersList={usersList} size="w-7 h-7 text-xs" />
                                <span className="text-sm truncate flex-1">{u.email || u.displayName}</span>
                                <Button size="sm" variant="ghost" icon="Box" onClick={() => go('admin/dashboard/' + u.id)}>Bekijk</Button>
                            </div>
                        ))}
                    </div>
        </Card>
    );
}

// ================= Inactieve gebruikers =================
export const inactiveUsers = (usersList, days = 30) => {
    const limit = Date.now() - days * 864e5;
    return usersList.filter(u => !u.disabled && (toDate(u.laatstGezien) || 0) < limit)
        .sort((a, b) => (toDate(a.laatstGezien) || 0) - (toDate(b.laatstGezien) || 0));
};

export function InactiveUsers() {
    const { usersList } = useStore();
    const { go } = useUi();
    const [days, setDays] = useState(30);
    const list = inactiveUsers(usersList, days);
    const ago = (u) => { const d = toDate(u.laatstGezien); return d ? `${Math.floor((Date.now() - d) / 864e5)} dagen geleden` : 'nooit ingelogd'; };
    return (
        <section>
            <SectionTitle action={<Segmented size="sm" className="w-44" value={days} onChange={setDays} options={[{ id: 30, label: '30 d' }, { id: 60, label: '60 d' }, { id: 90, label: '90 d' }]} />}>Inactieve gebruikers</SectionTitle>
            <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                {list.length === 0 && <p className="p-4 text-sm text-stone-500 flex items-center gap-2"><Icon name="Check" size={16} className="text-emerald-600" />Iedereen was de laatste {days} dagen actief.</p>}
                {list.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Avatar u={u} usersList={usersList} />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{u.email || u.displayName}</p>
                            <p className="text-xs text-stone-500">{ago(u)}</p>
                        </div>
                        <Button size="sm" variant="ghost" icon="Box" onClick={() => go('admin/dashboard/' + u.id)}>Bekijk</Button>
                    </div>
                ))}
            </Card>
        </section>
    );
}

// ================= Logs van de laatste weken =================
function useLogsSince(weeks) {
    const [logs, setLogs] = useState(null);
    useEffect(() => {
        const since = mondayOf(new Date(), -(weeks - 1));
        return db.collection('logs').where('timestamp', '>=', since).orderBy('timestamp', 'desc').limit(3000)
            .onSnapshot(s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))), (e) => { console.warn(e); setLogs([]); });
    }, [weeks]);
    return logs;
}

// Wat betekent een logregel? toegevoegd / opgegeten / weggegooid / anders
export const kindOf = (l) => {
    const d = (l.details || '').toLowerCase();
    if (l.action === 'Toevoegen' && !d.includes('ongedaan')) return 'added';
    if (l.action === 'Geconsumeerd' || (l.action === 'Verwijderd' && d.startsWith('opgegeten'))) return 'eaten';
    if (d.includes('weggegooid')) return 'wasted';
    return null;
};
const SERIES = [
    { id: 'added', label: 'Toegevoegd', cls: 'bg-emerald-500' },
    { id: 'eaten', label: 'Opgegeten', cls: 'bg-amber-500' },
    { id: 'wasted', label: 'Weggegooid', cls: 'bg-red-500' }
];

export function ActivityChart() {
    const { usersList } = useStore();
    const [weeks, setWeeks] = useState(12);
    const [who, setWho] = useState('');
    const logs = useLogsSince(weeks);
    const [hover, setHover] = useState(null);

    const data = useMemo(() => {
        const cols = Array.from({ length: weeks }, (_, i) => {
            const start = mondayOf(new Date(), i - weeks + 1);
            return { key: dateKey(start), start, added: 0, eaten: 0, wasted: 0 };
        });
        const byKey = Object.fromEntries(cols.map(c => [c.key, c]));
        (logs || []).forEach(l => {
            if (who && l.targetUserId !== who) return;
            const k = kindOf(l); const d = toDate(l.timestamp);
            if (!k || !d) return;
            const c = byKey[dateKey(mondayOf(d))];
            if (c) c[k]++;
        });
        return cols;
    }, [logs, weeks, who]);
    const max = Math.max(1, ...data.map(c => c.added + c.eaten + c.wasted));
    const totals = SERIES.map(s => [s, data.reduce((a, c) => a + c[s.id], 0)]);
    const wk = (d) => d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });

    return (
        <section>
            <SectionTitle>Activiteit per week</SectionTitle>
            <Card className="p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                    <Select value={who} onChange={e => setWho(e.target.value)} className="flex-1 min-w-[12rem]">
                        <option value="">Alle gebruikers samen</option>
                        {usersList.map(u => <option key={u.id} value={u.id}>{u.email || u.displayName}</option>)}
                    </Select>
                    <Segmented value={weeks} onChange={setWeeks} className="w-56" options={[{ id: 4, label: '4 w' }, { id: 12, label: '12 w' }, { id: 26, label: '26 w' }]} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {totals.map(([s, n]) => (
                        <div key={s.id} className="rounded-xl bg-stone-50 dark:bg-stone-800/60 px-3 py-2">
                            <p className="text-xl font-bold tabular-nums">{logs ? n : '…'}</p>
                            <p className="text-xs text-stone-500 flex items-center gap-1.5"><span className={cx('w-2.5 h-2.5 rounded-sm flex-shrink-0', s.cls)} />{s.label}</p>
                        </div>
                    ))}
                </div>
                {!logs ? <div className="h-44 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" /> : (
                    <div className="relative">
                        <div className="h-44 flex items-end gap-[3px] border-b border-stone-200 dark:border-stone-700" onMouseLeave={() => setHover(null)}>
                            {data.map((c, i) => {
                                const tot = c.added + c.eaten + c.wasted;
                                return (
                                    <button key={c.key} type="button" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(hover === i ? null : i)}
                                        aria-label={`Week van ${wk(c.start)}: ${c.added} toegevoegd, ${c.eaten} opgegeten, ${c.wasted} weggegooid`}
                                        className={cx('flex-1 h-full flex flex-col justify-end items-stretch rounded-t-md', hover === i && 'bg-stone-100 dark:bg-stone-800')}>
                                        {tot > 0 && <span className="flex flex-col-reverse gap-[2px] mx-[15%]" style={{ height: `${(tot / max) * 100}%` }}>
                                            {SERIES.map((s, si) => c[s.id] > 0 && (
                                                <span key={s.id} className={cx(s.cls, si === SERIES.length - 1 || SERIES.slice(si + 1).every(x => !c[x.id]) ? 'rounded-t' : '')} style={{ flexGrow: c[s.id], minHeight: 3 }} />
                                            ))}
                                        </span>}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex justify-between text-[11px] text-stone-400 mt-1.5">
                            <span>{wk(data[0].start)}</span><span>{wk(data[Math.floor(data.length / 2)].start)}</span><span>deze week</span>
                        </div>
                        {hover !== null && (
                            <div className="absolute top-0 right-0 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-lg rounded-xl px-3 py-2 text-xs pointer-events-none">
                                <p className="font-semibold mb-1">Week van {wk(data[hover].start)}</p>
                                {SERIES.map(s => <p key={s.id} className="flex items-center gap-1.5"><span className={cx('w-2 h-2 rounded-sm flex-shrink-0', s.cls)} />{s.label}: <b className="tabular-nums">{data[hover][s.id]}</b></p>)}
                            </div>
                        )}
                    </div>
                )}
                <p className="text-xs text-stone-400 mt-3">Gebaseerd op het logboek: producten toegevoegd, opgegeten en weggegooid.</p>
            </Card>
        </section>
    );
}

// ================= Verspilling =================
export function WasteRanking() {
    const { usersList } = useStore();
    const { go } = useUi();
    const logs = useLogsSince(26);
    const rows = usersList.map(u => {
        const s = u.stats || {};
        const wasted = num(s.wasted), eaten = num(s.consumed);
        return { u, wasted, eaten, value: num(s.wastedValue), pct: wasted + eaten ? Math.round((wasted / (wasted + eaten)) * 100) : null };
    }).sort((a, b) => b.wasted - a.wasted || (b.pct || 0) - (a.pct || 0));
    const topProducts = useMemo(() => {
        const m = {};
        (logs || []).filter(l => kindOf(l) === 'wasted').forEach(l => {
            const k = normalize(l.item); if (!k) return;
            m[k] = m[k] || { naam: l.item, n: 0, users: new Set() };
            m[k].n++; m[k].users.add(l.targetUserId);
        });
        return Object.values(m).sort((a, b) => b.n - a.n).slice(0, 10);
    }, [logs]);

    return (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
            <section>
                <SectionTitle>Verspilling per gebruiker</SectionTitle>
                <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                    {rows.map(({ u, wasted, eaten, value, pct }) => (
                        <button key={u.id} type="button" onClick={() => go(`admin/dashboard/${u.id}/stats`)} className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50">
                            <Avatar u={u} usersList={usersList} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{nameOf(u)}</p>
                                <div className="mt-1 h-2 rounded-full bg-amber-100 dark:bg-amber-900/40 overflow-hidden flex">
                                    {pct !== null && <span className="bg-red-500 h-full" style={{ width: pct + '%' }} />}
                                </div>
                                <p className="text-[11px] text-stone-500 mt-1">{wasted} weggegooid · {eaten} opgegeten{value ? ' · ' + euro(value) + ' verspild' : ''}</p>
                            </div>
                            <span className={cx('text-sm font-bold tabular-nums w-12 text-right', pct >= 25 ? 'text-red-600' : 'text-stone-600 dark:text-stone-300')}>{pct === null ? '–' : pct + '%'}</span>
                        </button>
                    ))}
                </Card>
                <p className="text-xs text-stone-400 mt-2">Percentage = weggegooid ten opzichte van alles wat opgebruikt werd (sinds het begin).</p>
            </section>
            <section>
                <SectionTitle>Vaakst weggegooid (6 maanden)</SectionTitle>
                <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                    {!logs && <div className="h-32 animate-pulse" />}
                    {logs && topProducts.length === 0 && <p className="p-4 text-sm text-stone-500">Niets weggegooid. Goed bezig!</p>}
                    {topProducts.map((p, i) => (
                        <div key={p.naam} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="w-6 text-sm font-bold text-stone-400 tabular-nums">{i + 1}</span>
                            <span className="flex-1 text-sm font-medium truncate">{p.naam}</span>
                            <span className="flex -space-x-1.5">{[...p.users].slice(0, 4).map(id => { const u = usersList.find(x => x.id === id) || { id }; return <span key={id} className="ring-2 ring-white dark:ring-stone-900 rounded-full"><Avatar u={u} usersList={usersList} size="w-6 h-6 text-[10px]" /></span>; })}</span>
                            <span className="text-sm font-bold tabular-nums w-10 text-right">{p.n}×</span>
                        </div>
                    ))}
                </Card>
            </section>
        </div>
    );
}

// ================= Mededeling =================
const ANN_TONES = {
    info: { label: 'Info', icon: 'Info', cls: 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/50 dark:border-sky-900 dark:text-sky-100' },
    nieuw: { label: 'Nieuw', icon: 'Sparkles', cls: 'bg-teal-50 border-teal-200 text-teal-900 dark:bg-teal-950/50 dark:border-teal-900 dark:text-teal-100' },
    let: { label: 'Let op', icon: 'Alert', cls: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-100' }
};
const ANN_KEY = 'voorraad-mededeling-weg';
const readDismissed = () => { try { return localStorage.getItem(ANN_KEY); } catch (e) { return null; } };

export function AnnouncementBanner({ preview }) {
    const { globalSettings } = useStore();
    const a = preview || globalSettings.mededeling;
    const [gone, setGone] = useState(readDismissed);
    if (!a || !a.active || !(a.text || '').trim()) return null;
    if (!preview && gone === String(a.versie)) return null;
    const t = ANN_TONES[a.tone] || ANN_TONES.info;
    const close = () => { try { localStorage.setItem(ANN_KEY, String(a.versie)); } catch (e) { } setGone(String(a.versie)); };
    return (
        <div className={cx('rounded-2xl border px-4 py-3 flex items-start gap-3', t.cls)} role="status">
            <Icon name={t.icon} size={18} className="mt-0.5 flex-shrink-0" />
            <p className="flex-1 text-sm whitespace-pre-line">{a.text}</p>
            {!preview && <button type="button" onClick={close} aria-label="Mededeling sluiten" className="w-7 h-7 -my-1 -mr-1 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"><Icon name="X" size={16} /></button>}
        </div>
    );
}

export function AnnouncementEditor() {
    const { globalSettings, actions } = useStore();
    const cur = globalSettings.mededeling || {};
    const [text, setText] = useState(cur.text || '');
    const [tone, setTone] = useState(cur.tone || 'info');
    useEffect(() => { setText(cur.text || ''); setTone(cur.tone || 'info'); }, [cur.versie]);
    const publish = async (active) => {
        await actions.setGlobal('mededeling', { text: text.trim(), tone, active, versie: Date.now() });
        actions.notify(active ? 'Mededeling staat bij iedereen bovenaan' : 'Mededeling verborgen');
    };
    return (
        <section>
            <SectionTitle>Mededeling aan iedereen</SectionTitle>
            <Card className="p-4 space-y-3">
                <Textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Bv. Nieuw: je kan nu per ¼ opmaken!" />
                <Segmented value={tone} onChange={setTone} options={Object.entries(ANN_TONES).map(([id, t]) => ({ id, label: t.label, icon: t.icon }))} />
                {text.trim() && <div><p className="text-xs text-stone-500 mb-1.5">Voorbeeld</p><AnnouncementBanner preview={{ text, tone, active: true }} /></div>}
                <div className="flex flex-wrap gap-2">
                    <Button icon="Bell" disabled={!text.trim()} onClick={() => publish(true)}>{cur.active ? 'Bijwerken' : 'Publiceren'}</Button>
                    {cur.active && <Button variant="secondary" icon="X" onClick={() => publish(false)}>Verbergen</Button>}
                </div>
                <p className="text-xs text-stone-500">{cur.active ? <>Staat nu online{cur.versie ? ' sinds ' + formatDateTime(cur.versie) : ''}. Gebruikers kunnen hem wegklikken; na bijwerken verschijnt hij opnieuw.</> : 'Er staat geen mededeling online.'}</p>
            </Card>
        </section>
    );
}

// ================= Back-up van alles =================
const BACKUP_COLLS = ['vriezers', 'lades', 'items', 'shoppingList', 'recepten'];
export function BackupAll() {
    const { usersList } = useStore();
    const [busy, setBusy] = useState(null);
    const run = async () => {
        const out = { app: 'Voorraad.', soort: 'volledige back-up (beheer)', gemaaktOp: new Date().toISOString(), gebruikers: [] };
        let n = 0;
        for (const u of usersList) {
            setBusy(`${++n}/${usersList.length}: ${u.email || u.id}`);
            const entry = { id: u.id, profiel: u };
            for (const c of BACKUP_COLLS) {
                try { entry[c] = (await db.collection(c).where('userId', '==', u.id).get()).docs.map(d => ({ id: d.id, ...d.data() })); }
                catch (e) { entry[c] = { fout: String(e.code || e.message || e) }; }
            }
            out.gebruikers.push(entry);
        }
        downloadBlob(JSON.stringify(out, (k, v) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v), 2), `voorraad-alles-${dateKey()}.json`, 'application/json');
        setBusy(null);
    };
    return (
        <section>
            <SectionTitle>Back-up van alles</SectionTitle>
            <Card className="p-4">
                <p className="text-sm text-stone-600 dark:text-stone-300">Download de gegevens van alle {usersList.length} gebruikers (profiel, locaties, lades, producten, boodschappen en recepten) in één JSON-bestand.</p>
                <Button className="mt-3" icon="Download" disabled={!!busy} onClick={run}>{busy ? 'Bezig… ' + busy : 'Download alles'}</Button>
            </Card>
        </section>
    );
}

// ================= Notitie per gebruiker =================
// Opgeslagen in adminNotes/{uid}: alleen leesbaar voor admins (zie firestore-beheer.rules).
export function AdminNote({ uid }) {
    const { user } = useStore();
    const [note, setNote] = useState(null);
    const [draft, setDraft] = useState('');
    const [err, setErr] = useState(false);
    useEffect(() => {
        setNote(null); setErr(false);
        return db.collection('adminNotes').doc(uid).onSnapshot(d => { const t = d.exists ? d.data().text || '' : ''; setNote(d.exists ? d.data() : {}); setDraft(t); }, () => { setErr(true); setNote({}); });
    }, [uid]);
    const dirty = note && draft !== (note.text || '');
    const save = () => db.collection('adminNotes').doc(uid).set({ text: draft, updatedAt: new Date(), updatedBy: user.email || '' }, { merge: true }).catch(() => setErr(true));
    return (
        <div className="mt-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 p-3">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5 mb-1.5"><Icon name="Lock" size={12} />Notitie (alleen voor beheerders)</p>
            <Textarea rows={2} value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => dirty && save()} placeholder="Bv. Mama, gebruikt vooral de vriezer in de garage" className="bg-white/80" />
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-stone-500">
                {err ? <span className="text-red-600">Kon de notitie niet opslaan: Firestore-regel voor adminNotes ontbreekt.</span>
                    : dirty ? <Button size="sm" variant="soft" icon="Check" onClick={save}>Opslaan</Button>
                        : note && note.updatedAt ? <span>Laatst bewaard {formatDateTime(note.updatedAt)}</span> : null}
            </div>
        </div>
    );
}

// ================= Opkuisen (per gebruiker) =================
// Werkt op de voorraad die nu geladen is (ownerId).
export function Cleanup() {
    const { items, vriezers, lades, locById, ladeById, actions } = useStore();
    const { confirm } = useUi();
    const [busy, setBusy] = useState(false);

    const emptyLocs = vriezers.filter(v => !items.some(i => i.vriezerId === v.id));
    const emptyLades = lades.filter(l => locById[l.vriezerId] && !emptyLocs.includes(locById[l.vriezerId]) && !items.some(i => i.ladeId === l.id));
    const orphanLades = lades.filter(l => !locById[l.vriezerId]);
    const noLoc = items.filter(i => !locById[i.vriezerId]);
    const badLade = items.filter(i => locById[i.vriezerId] && i.ladeId && (!ladeById[i.ladeId] || ladeById[i.ladeId].vriezerId !== i.vriezerId));
    const dupGroups = useMemo(() => {
        const g = {};
        items.forEach(i => {
            const k = [normalize(i.naam), i.vriezerId, i.ladeId || '', i.eenheid || '', i.ingevrorenOp || '', i.houdbaarheidsDatum || ''].join('|');
            (g[k] = g[k] || []).push(i);
        });
        return Object.values(g).filter(x => x.length > 1);
    }, [items]);
    const firstLoc = vriezers[0];

    const run = async (title, message, ops, done) => {
        if (!(await confirm({ title, message, confirmLabel: 'Oplossen' }))) return;
        setBusy(true);
        try { await runBatched(ops); actions.notify(done); } catch (e) { actions.notify('Opkuisen mislukt: ' + (e.message || e), 'error'); }
        setBusy(false);
    };
    const del = (c, id) => b => b.delete(db.collection(c).doc(id));
    const upd = (c, id, data) => b => b.update(db.collection(c).doc(id), data);

    const checks = [
        {
            id: 'locs', icon: 'Layers', title: 'Lege locaties', n: emptyLocs.length,
            detail: emptyLocs.map(v => v.naam).join(', '),
            fix: () => run('Lege locaties verwijderen?', `${plural(emptyLocs.length, 'locatie', 'locaties')} zonder producten (en hun lades) worden verwijderd.`,
                [...emptyLocs.map(v => del('vriezers', v.id)), ...lades.filter(l => emptyLocs.some(v => v.id === l.vriezerId)).map(l => del('lades', l.id))], 'Lege locaties verwijderd')
        },
        {
            id: 'lades', icon: 'Box', title: 'Lege lades', n: emptyLades.length + orphanLades.length,
            detail: [...emptyLades, ...orphanLades].map(l => l.naam).join(', '),
            fix: () => run('Lege lades verwijderen?', 'Lades zonder producten, of van een locatie die niet meer bestaat, worden verwijderd.',
                [...emptyLades, ...orphanLades].map(l => del('lades', l.id)), 'Lege lades verwijderd')
        },
        {
            id: 'noloc', icon: 'Alert', title: 'Producten zonder (bestaande) locatie', n: noLoc.length,
            detail: noLoc.map(i => i.naam).join(', '),
            fix: firstLoc ? () => run('Producten verplaatsen?', `Deze producten worden verplaatst naar "${firstLoc.naam}". Daarna kan je ze zelf verder verplaatsen.`,
                noLoc.map(i => upd('items', i.id, { vriezerId: firstLoc.id, ladeId: '', ladeNaam: '' })), 'Producten verplaatst') : null,
            hint: firstLoc ? `Verplaats naar ${firstLoc.naam}` : 'Maak eerst een locatie aan'
        },
        {
            id: 'lade', icon: 'Move', title: 'Producten in een lade die niet (meer) bestaat', n: badLade.length,
            detail: badLade.map(i => i.naam).join(', '),
            fix: () => run('Lade loskoppelen?', 'Deze producten blijven in hun locatie, maar zonder lade.',
                badLade.map(i => upd('items', i.id, { ladeId: '', ladeNaam: '' })), 'Opgelost')
        },
        {
            id: 'dups', icon: 'Copy', title: 'Dubbele producten', n: dupGroups.length,
            detail: dupGroups.map(g => `${g[0].naam} (${g.length}×)`).join(', '),
            fix: () => run('Dubbele producten samenvoegen?', 'Producten met dezelfde naam, plaats, eenheid en datum worden samengevoegd tot één product; de aantallen worden opgeteld.',
                dupGroups.flatMap(g => [upd('items', g[0].id, { aantal: round2(g.reduce((a, i) => a + num(i.aantal), 0)) }), ...g.slice(1).map(i => del('items', i.id))]), 'Dubbele producten samengevoegd')
        }
    ];
    const problems = checks.filter(c => c.n > 0).length;

    return (
        <div className="space-y-3">
            <Card className="p-4 flex items-center gap-3">
                <span className={cx('w-10 h-10 rounded-xl flex items-center justify-center', problems ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200')}><Icon name={problems ? 'Wrench' : 'Check'} size={20} /></span>
                <div><p className="font-bold">{problems ? `${plural(problems, 'ding', 'dingen')} om op te kuisen` : 'Alles is netjes'}</p><p className="text-sm text-stone-500">Controle van locaties, lades en producten van deze gebruiker.</p></div>
            </Card>
            <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                {checks.map(c => (
                    <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                        <Icon name={c.icon} size={18} className={cx('mt-0.5', c.n ? 'text-amber-600' : 'text-stone-300')} />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{c.title} <span className={cx('ml-1 text-xs font-bold px-1.5 rounded', c.n ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' : 'bg-stone-100 text-stone-500 dark:bg-stone-800')}>{c.n}</span></p>
                            {c.n > 0 && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{c.detail}</p>}
                        </div>
                        {c.n > 0 && (c.fix
                            ? <Button size="sm" variant="soft" icon="Wrench" disabled={busy} onClick={c.fix}>Oplossen</Button>
                            : <span className="text-xs text-stone-500">{c.hint}</span>)}
                    </div>
                ))}
            </Card>
        </div>
    );
}
