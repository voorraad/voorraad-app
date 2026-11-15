import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { db, runBatched } from '../../lib/firebase.js';
import { useStore } from '../../state/store.jsx';
import { useUi } from '../../state/ui.jsx';
import { Card, Button, Input, Select, Toggle, SectionTitle, Chip, ColorPicker } from '../../components/ui.jsx';
import { TAB_OPTIONS } from '../meer/Admin.jsx';
import { userTone, USER_TONE_DOTS, USER_TONE_NAMES } from '../../lib/userColors.js';
import { useAllUserData, refreshAllUserData } from './data.js';
import { MessageComposer } from '../../components/Berichten.jsx';
import { TYPE_BY_ID } from '../../lib/constants.js';
import { cx, smartMatch, formatAantal, formatDateTime, euro, plural, itemStatus, statusText, STATUS_TONE, sortLocaties, byName, emojiFor, toDate } from '../../lib/utils.js';

const nameOf = (u) => (u && (u.displayName || (u.email || '').split('@')[0])) || '?';
const Avatar = ({ u, usersList, size = 'w-8 h-8 text-xs' }) => (
    <span className={cx('rounded-full flex-shrink-0 flex items-center justify-center font-bold', size, userTone(u.id, usersList).pill)}>{((u.email || u.displayName || '?')[0] || '?').toUpperCase()}</span>
);
const Loading = () => <div className="h-24 rounded-2xl bg-stone-200/60 dark:bg-stone-800/60 animate-pulse" />;

// ================= 5. Zoeken over alle voorraden =================
export function GlobalSearch() {
    const { usersList } = useStore();
    const { go } = useUi();
    const data = useAllUserData(usersList);
    const [q, setQ] = useState('');
    const done = usersList.every(u => data[u.id]);
    const results = useMemo(() => {
        if (q.trim().length < 2) return [];
        const out = [];
        usersList.forEach(u => {
            const d = data[u.id]; if (!d || d.error) return;
            d.list.forEach(i => { if (smartMatch(i.naam || '', q)) out.push({ u, i, loc: d.locById[i.vriezerId] }); });
        });
        return out;
    }, [q, data, usersList]);
    const perUser = usersList.map(u => [u, results.filter(r => r.u.id === u.id)]).filter(([, r]) => r.length);
    return (
        <section>
            <SectionTitle>Zoeken bij alle gebruikers</SectionTitle>
            <div className="relative">
                <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Bv. gehakt, soep, pizza…"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 text-[15px]" />
            </div>
            {q.trim().length >= 2 && (
                <Card className="mt-3 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
                    {!done && <p className="px-4 py-2 text-xs text-stone-500">Nog niet alle voorraden geladen…</p>}
                    {done && !results.length && <p className="p-4 text-sm text-stone-500">Niemand heeft "{q}".</p>}
                    {perUser.map(([u, rs]) => (
                        <div key={u.id}>
                            <button type="button" onClick={() => go(`admin/dashboard/${u.id}/voorraad`)} className="w-full flex items-center gap-2 px-4 pt-3 pb-1 text-left">
                                <Avatar u={u} usersList={usersList} size="w-6 h-6 text-[10px]" />
                                <span className="text-sm font-bold flex-1 truncate">{nameOf(u)}</span>
                                <span className="text-xs text-stone-400">{plural(rs.length, 'product', 'producten')}</span>
                                <Icon name="ChevronRight" size={16} className="text-stone-400" />
                            </button>
                            {rs.slice(0, 20).map(({ i, loc }) => {
                                const st = itemStatus(i, (loc && loc.type) || 'vriezer');
                                return (
                                    <div key={i.id} className="flex items-center gap-3 px-4 py-1.5 pl-12">
                                        <span className="text-lg">{emojiFor(i)}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{i.naam}</p>
                                            <p className="text-xs text-stone-500 truncate">{formatAantal(i.aantal)} {i.eenheid} · {loc ? loc.naam : '?'}{i.ladeNaam ? ' › ' + i.ladeNaam : ''}{statusText(st) ? <span className={cx(' font-medium', STATUS_TONE[st.level])}> · {statusText(st)}</span> : null}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </Card>
            )}
        </section>
    );
}

// ================= 6. Waarde van de voorraad =================
export function StockValue() {
    const { usersList } = useStore();
    const data = useAllUserData(usersList);
    const rows = usersList.map(u => ({ u, d: data[u.id] })).sort((a, b) => ((b.d && b.d.value) || 0) - ((a.d && a.d.value) || 0));
    const total = rows.reduce((a, r) => a + ((r.d && r.d.value) || 0), 0);
    const max = Math.max(1, ...rows.map(r => (r.d && r.d.value) || 0));
    return (
        <section>
            <SectionTitle action={<span className="text-sm font-bold tabular-nums">{euro(total)}</span>}>Waarde van de voorraad</SectionTitle>
            <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                {rows.map(({ u, d }) => (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Avatar u={u} usersList={usersList} />
                        <div className="min-w-0 flex-1">
                            <div className="flex justify-between gap-2"><p className="text-sm font-medium truncate">{nameOf(u)}</p><p className="text-sm font-bold tabular-nums">{d ? (d.error ? '–' : euro(d.value)) : '…'}</p></div>
                            <div className="mt-1 h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden"><span className="block h-full bg-teal-500 rounded-full" style={{ width: d && !d.error ? (d.value / max) * 100 + '%' : 0 }} /></div>
                            {d && !d.error && <p className="text-[11px] text-stone-500 mt-1">{d.priced} van {d.items} producten hebben een prijs</p>}
                        </div>
                    </div>
                ))}
            </Card>
            <p className="text-xs text-stone-400 mt-2">Som van de prijzen die bij de producten ingevuld zijn.</p>
        </section>
    );
}
export function useTotalValue() {
    const { usersList } = useStore();
    const data = useAllUserData(usersList);
    const done = usersList.every(u => data[u.id]);
    return done ? usersList.reduce((a, u) => a + ((data[u.id] && data[u.id].value) || 0), 0) : null;
}

// ================= 7. Welke onderdelen worden gebruikt =================
export function FeatureUsage() {
    const { usersList } = useStore();
    const data = useAllUserData(usersList);
    const [shares, setShares] = useState([]);
    useEffect(() => { db.collection('shares').where('status', '==', 'accepted').get().then(s => setShares(s.docs.map(d => d.data()))).catch(() => { }); }, []);
    const done = usersList.every(u => data[u.id]);
    const g = (u, k) => ((u.gebruik || {})[k] || 0);
    const d = (u) => data[u.id] || {};
    const FEATURES = [
        ['Vriezer', 'Snowflake', u => (d(u).vriezers || []).some(v => (v.type || 'vriezer') === 'vriezer' && d(u).list.some(i => i.vriezerId === v.id))],
        ['Frigo', 'Fridge', u => (d(u).vriezers || []).some(v => v.type === 'frig' && d(u).list.some(i => i.vriezerId === v.id))],
        ['Stock', 'Box', u => (d(u).vriezers || []).some(v => v.type === 'voorraad' && d(u).list.some(i => i.vriezerId === v.id))],
        ['Boodschappenlijst', 'Cart', u => (d(u).shopping || []).length > 0],
        ['Weekmenu', 'Calendar', u => (d(u).menu || []).length > 0 || (d(u).list || []).some(i => i.geplandeDatum)],
        ['Recepten', 'Book', u => (d(u).recepten || []).length > 0],
        ['Barcode scannen', 'Scan', u => g(u, 'scans') > 0 || (d(u).list || []).some(i => i.barcode), u => g(u, 'scans') ? `${g(u, 'scans')}×` : ''],
        ['Etiketten', 'Printer', u => g(u, 'etiketten') > 0, u => g(u, 'etiketten') ? `${g(u, 'etiketten')}×` : ''],
        ["Foto's", 'Camera', u => g(u, 'fotos') > 0 || (d(u).list || []).some(i => i.foto) || (d(u).lades || []).some(l => l.foto)],
        ['Controle-knop', 'CheckSquare', u => !!u.showBalans],
        ['Samen beheren', 'Users', u => shares.some(s => s.ownerId === u.id || (s.sharedWithEmail || '') === (u.email || '').toLowerCase())],
        ['Bekijk-link', 'Link', u => !!u.publicShareEnabled],
        ['Donkere modus', 'Moon', u => !!u.darkMode]
    ];
    if (!done) return <section><SectionTitle>Gebruik van onderdelen</SectionTitle><Loading /></section>;
    return (
        <section>
            <SectionTitle>Gebruik van onderdelen</SectionTitle>
            <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                {FEATURES.map(([label, icon, test, extra]) => {
                    const who = usersList.filter(u => { try { return !d(u).error && test(u); } catch (e) { return false; } });
                    const pct = usersList.length ? Math.round((who.length / usersList.length) * 100) : 0;
                    return (
                        <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                            <Icon name={icon} size={18} className="text-stone-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between gap-2"><p className="text-sm font-medium">{label}</p><p className="text-xs text-stone-500 tabular-nums">{who.length}/{usersList.length}</p></div>
                                <div className="mt-1 h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden"><span className="block h-full bg-teal-500 rounded-full" style={{ width: pct + '%' }} /></div>
                            </div>
                            <span className="flex -space-x-1.5 w-20 justify-end">{who.slice(0, 4).map(u => <span key={u.id} title={nameOf(u) + (extra && extra(u) ? ' · ' + extra(u) : '')} className="ring-2 ring-white dark:ring-stone-900 rounded-full"><Avatar u={u} usersList={usersList} size="w-6 h-6 text-[10px]" /></span>)}{who.length > 4 && <span className="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-stone-900">+{who.length - 4}</span>}</span>
                        </div>
                    );
                })}
            </Card>
            <p className="text-xs text-stone-400 mt-2">Scans, etiketten en foto's worden geteld vanaf deze versie.</p>
        </section>
    );
}

// ================= 8. Geblokkeerde pogingen =================
export function BlockedAttempts() {
    const { usersList, actions } = useStore();
    const { confirm } = useUi();
    const [list, setList] = useState(null);
    useEffect(() => db.collection('blockedAttempts').orderBy('op', 'desc').limit(40)
        .onSnapshot(s => setList(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setList([])), []);
    const clear = async () => {
        if (!(await confirm({ title: 'Lijst leegmaken?', confirmLabel: 'Leegmaken', danger: true }))) return;
        await runBatched(list.map(x => b => b.delete(db.collection('blockedAttempts').doc(x.id))));
    };
    return (
        <section>
            <SectionTitle action={list && list.length ? <button type="button" onClick={clear} className="text-sm font-semibold text-stone-500 hover:text-red-600">Leegmaken</button> : null}>Geweigerde pogingen</SectionTitle>
            <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                {!list && <div className="h-16 animate-pulse" />}
                {list && !list.length && <p className="p-4 text-sm text-stone-500 flex items-center gap-2"><Icon name="Check" size={16} className="text-emerald-600" />Niemand werd geweigerd.</p>}
                {(list || []).map(x => {
                    const u = usersList.find(y => y.id === x.uid);
                    return (
                        <div key={x.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className={cx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', x.reden === 'onderhoud' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300')}><Icon name={x.reden === 'onderhoud' ? 'Wrench' : 'Lock'} size={15} /></span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{x.email || x.naam || x.uid}</p>
                                <p className="text-xs text-stone-500">{x.reden === 'onderhoud' ? 'Tijdens onderhoud' : 'Geblokkeerd account'} · {formatDateTime(x.op)}</p>
                            </div>
                            {u && u.disabled && <Button size="sm" variant="soft" icon="Lock" onClick={() => actions.setUserField(u.id, { disabled: false })}>Deblokkeer</Button>}
                        </div>
                    );
                })}
            </Card>
        </section>
    );
}

// ================= 1. Rechten voor meerdere gebruikers =================
export function BulkRights() {
    const { usersList, user, actions } = useStore();
    const [sel, setSel] = useState(new Set());
    const [busy, setBusy] = useState(false);
    const others = usersList.filter(u => u.id !== user.uid);
    const toggle = (id) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const chosen = others.filter(u => sel.has(u.id));
    const apply = async (patchFor, msg) => {
        setBusy(true);
        try {
            await runBatched(chosen.map(u => b => b.set(db.collection('users').doc(u.id), patchFor(u), { merge: true })));
            actions.notify(`${msg} voor ${plural(chosen.length, 'gebruiker', 'gebruikers')}`);
        } catch (e) { actions.notify('Mislukt: ' + (e.message || e), 'error'); }
        setBusy(false);
    };
    const setTab = (tab, hide) => apply(u => {
        const h = new Set(u.hiddenTabs || []); hide ? h.add(tab) : h.delete(tab);
        return { hiddenTabs: [...h] };
    }, `${TAB_OPTIONS.find(t => t[0] === tab)[1]} ${hide ? 'verborgen' : 'zichtbaar'}`);
    return (
        <section>
            <SectionTitle>Rechten voor meerdere gebruikers</SectionTitle>
            <Card className="p-4 space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold">1. Kies gebruikers</p>
                        <button type="button" className="text-sm font-semibold text-teal-700 dark:text-teal-300" onClick={() => setSel(sel.size === others.length ? new Set() : new Set(others.map(u => u.id)))}>{sel.size === others.length ? 'Niemand' : 'Iedereen'}</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {others.map(u => (
                            <button key={u.id} type="button" onClick={() => toggle(u.id)} aria-pressed={sel.has(u.id)}
                                className={cx('h-9 pl-1 pr-3 rounded-full border-2 text-sm font-semibold inline-flex items-center gap-1.5', sel.has(u.id) ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40' : 'border-stone-200 dark:border-stone-700')}>
                                <Avatar u={u} usersList={usersList} size="w-6 h-6 text-[10px]" />{nameOf(u)}{sel.has(u.id) && <Icon name="Check" size={14} className="text-teal-700" />}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-sm font-semibold mb-2">2. Wat aanpassen?</p>
                    <div className="divide-y divide-stone-100 dark:divide-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                        {TAB_OPTIONS.map(([id, lbl]) => {
                            const hidden = chosen.filter(u => (u.hiddenTabs || []).includes(id)).length;
                            return (
                                <div key={id} className="flex items-center gap-2 px-3 py-2">
                                    <span className="flex-1 text-sm">{lbl}<span className="text-xs text-stone-400 ml-2">{chosen.length ? `nu verborgen bij ${hidden}/${chosen.length}` : ''}</span></span>
                                    <Button size="sm" variant="secondary" disabled={!chosen.length || busy} onClick={() => setTab(id, true)}>Verberg</Button>
                                    <Button size="sm" variant="soft" disabled={!chosen.length || busy} onClick={() => setTab(id, false)}>Toon</Button>
                                </div>
                            );
                        })}
                        <div className="flex items-center gap-2 px-3 py-2">
                            <span className="flex-1 text-sm">Toegang tot de app</span>
                            <Button size="sm" variant="danger-soft" disabled={!chosen.length || busy} onClick={() => apply(() => ({ disabled: true }), 'Geblokkeerd')}>Blokkeer</Button>
                            <Button size="sm" variant="soft" disabled={!chosen.length || busy} onClick={() => apply(() => ({ disabled: false }), 'Gedeblokkeerd')}>Deblokkeer</Button>
                        </div>
                    </div>
                </div>
                <div>
                    <p className="text-sm font-semibold mb-2">3. Of stuur hen een persoonlijk bericht</p>
                    <MessageComposer compact userIds={chosen.map(u => u.id)} />
                </div>
            </Card>
        </section>
    );
}

// ================= 2. Uitnodigen =================
export function Invites() {
    const { usersList, user, actions } = useStore();
    const { confirm } = useUi();
    const [list, setList] = useState([]);
    const [email, setEmail] = useState('');
    const [naam, setNaam] = useState('');
    const [hidden, setHidden] = useState([]);
    const [kleur, setKleur] = useState('');
    const [made, setMade] = useState(null);
    useEffect(() => db.collection('invites').onSnapshot(s => setList(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (toDate(b.gemaaktOp) || 0) - (toDate(a.gemaaktOp) || 0))), () => { }), []);
    const link = `${location.origin}${location.pathname}`;
    const message = (inv) => `Hoi${inv.naam ? ' ' + inv.naam : ''}!\n\nIk nodig je uit voor Voorraad., de app om je vriezer, frigo en voorraadkast bij te houden.\n\nOpen ${link} en log in met je Google-account (${inv.email}).\n\nTip: zet de app op je beginscherm via Deel → Zet op beginscherm.`;
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const exists = usersList.find(u => (u.email || '').toLowerCase() === email.trim().toLowerCase());
    const create = async () => {
        const em = email.trim().toLowerCase();
        const inv = { email: em, naam: naam.trim(), hiddenTabs: hidden, ...(kleur ? { adminKleur: kleur } : {}), gemaaktOp: new Date(), door: user.email || '' };
        await db.collection('invites').doc(em).set(inv);
        setMade(inv); setEmail(''); setNaam(''); setHidden([]); setKleur('');
    };
    const share = async (inv) => {
        const text = message(inv);
        if (navigator.share) { try { await navigator.share({ title: 'Uitnodiging Voorraad.', text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
        try { await navigator.clipboard.writeText(text); actions.notify('Bericht gekopieerd'); } catch (e) { actions.notify('Kopiëren lukte niet', 'error'); }
    };
    const mail = (inv) => `mailto:${encodeURIComponent(inv.email)}?subject=${encodeURIComponent('Uitnodiging voor Voorraad.')}&body=${encodeURIComponent(message(inv))}`;
    return (
        <section>
            <SectionTitle>Iemand uitnodigen</SectionTitle>
            <Card className="p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-2">
                    <Input type="email" placeholder="E-mailadres (Google-account)" value={email} onChange={e => setEmail(e.target.value)} />
                    <Input placeholder="Naam (optioneel)" value={naam} onChange={e => setNaam(e.target.value)} />
                </div>
                {exists && <p className="text-xs text-amber-700 dark:text-amber-300">{exists.email} heeft al een account.</p>}
                <div>
                    <p className="text-xs font-semibold text-stone-500 mb-1.5">Meteen verbergen bij de eerste keer inloggen</p>
                    <div className="flex flex-wrap gap-1.5">
                        {TAB_OPTIONS.map(([id, lbl]) => <Chip key={id} active={hidden.includes(id)} onClick={() => setHidden(h => h.includes(id) ? h.filter(x => x !== id) : [...h, id])}>{hidden.includes(id) && <Icon name="Lock" size={12} />}{lbl}</Chip>)}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-500">Kleur</span>
                    <ColorPicker value={kleur || 'sky'} colors={USER_TONE_DOTS} names={USER_TONE_NAMES} label="Kleur van de nieuwe gebruiker" onChange={setKleur} />
                    <div className="flex-1" />
                    <Button icon="Plus" disabled={!valid || !!exists} onClick={create}>Uitnodiging maken</Button>
                </div>
                {made && (
                    <div className="rounded-xl bg-teal-50 dark:bg-teal-950/40 p-3">
                        <p className="text-sm font-semibold">Uitnodiging voor {made.email} klaar. Stuur ze door:</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <a href={mail(made)} className="h-9 px-3 rounded-xl text-sm font-semibold bg-teal-600 text-white inline-flex items-center gap-1.5"><Icon name="Message" size={16} />Mail</a>
                            <Button size="sm" variant="secondary" icon="Share" onClick={() => share(made)}>Delen / kopiëren</Button>
                        </div>
                    </div>
                )}
            </Card>
            {list.length > 0 && (
                <Card className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
                    {list.map(inv => {
                        const joined = inv.gebruiktOp || usersList.some(u => (u.email || '').toLowerCase() === inv.email);
                        return (
                            <div key={inv.id} className="flex items-center gap-3 px-4 py-2.5">
                                <Icon name={joined ? 'Check' : 'Clock'} size={16} className={joined ? 'text-emerald-600' : 'text-amber-500'} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{inv.naam ? inv.naam + ' · ' : ''}{inv.email}</p>
                                    <p className="text-xs text-stone-500">{joined ? (inv.gebruiktOp ? 'Ingelogd op ' + formatDateTime(inv.gebruiktOp) : 'Heeft een account') : 'Nog niet ingelogd'}{(inv.hiddenTabs || []).length ? ' · ' + (inv.hiddenTabs || []).length + ' verborgen' : ''}</p>
                                </div>
                                {!joined && <a href={mail(inv)} aria-label="Opnieuw mailen" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800"><Icon name="Message" size={16} /></a>}
                                <button type="button" aria-label="Verwijderen" onClick={async () => { if (await confirm({ title: 'Uitnodiging verwijderen?', confirmLabel: 'Verwijderen', danger: true })) db.collection('invites').doc(inv.id).delete(); }} className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-stone-800"><Icon name="Trash" size={16} /></button>
                            </div>
                        );
                    })}
                </Card>
            )}
        </section>
    );
}

// ================= 4. Eén gebruiker terugzetten uit de back-up =================
const COLLS = [['vriezers', 'locaties'], ['lades', 'lades'], ['items', 'producten'], ['shoppingList', 'boodschappen'], ['recepten', 'recepten']];
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;
const revive = (o) => {
    if (Array.isArray(o)) return o.map(revive);
    if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, revive(v)]));
    return typeof o === 'string' && ISO.test(o) ? new Date(o) : o;
};
const PROFILE_FIELDS = ['customCategories', 'customUnits', 'customUnitsVries', 'customUnitsFrig', 'customUnitsVoorraad'];

export function RestoreUser() {
    const { usersList, actions } = useStore();
    const { confirm } = useUi();
    const fileRef = useRef(null);
    const [backup, setBackup] = useState(null);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [wipe, setWipe] = useState(false);
    const [profile, setProfile] = useState(true);
    const [busy, setBusy] = useState(null);
    const load = async (e) => {
        const f = e.target.files && e.target.files[0]; e.target.value = '';
        if (!f) return;
        try {
            const j = JSON.parse(await f.text());
            if (!Array.isArray(j.gebruikers)) throw new Error('Dit is geen volledige back-up van de beheerpagina.');
            setBackup(j); setFrom(j.gebruikers[0] ? j.gebruikers[0].id : ''); setTo(j.gebruikers[0] ? j.gebruikers[0].id : '');
        } catch (err) { actions.notify(err.message || 'Kon het bestand niet lezen', 'error'); }
    };
    const src = backup && backup.gebruikers.find(g => g.id === from);
    const target = usersList.find(u => u.id === to);
    const counts = src ? COLLS.map(([c, l]) => [l, Array.isArray(src[c]) ? src[c].length : 0]) : [];
    const sameUser = from === to;

    const run = async () => {
        const who = nameOf(target || { email: to });
        const msg = `${counts.filter(c => c[1]).map(c => `${c[1]} ${c[0]}`).join(', ') || 'Niets'} terugzetten bij ${who}.` + (wipe ? ' De huidige locaties, lades, producten, boodschappen en recepten van deze gebruiker worden EERST gewist.' : sameUser ? ' Bestaande items met dezelfde id worden overschreven.' : ' Alles wordt als nieuwe items toegevoegd.');
        if (!(await confirm({ title: 'Terugzetten?', message: msg, confirmLabel: 'Terugzetten', danger: wipe }))) return;
        setBusy('Bezig…');
        try {
            if (wipe) {
                for (const [c] of COLLS) {
                    const s = await db.collection(c).where('userId', '==', to).get();
                    await runBatched(s.docs.map(d => b => b.delete(d.ref)));
                }
            }
            // Bij een andere gebruiker: nieuwe ids en verwijzingen omzetten
            const idMap = {};
            const newId = (c, id) => sameUser ? id : (idMap[c + id] = idMap[c + id] || db.collection(c).doc().id);
            const ops = [];
            COLLS.forEach(([c]) => (Array.isArray(src[c]) ? src[c] : []).forEach(raw => {
                const { id, ...rest } = revive(raw);
                const data = { ...rest, userId: to };
                if (!sameUser) {
                    if (data.vriezerId && data.vriezerId !== 'custom_menu') data.vriezerId = newId('vriezers', data.vriezerId);
                    if (data.ladeId) data.ladeId = newId('lades', data.ladeId);
                }
                ops.push(b => b.set(db.collection(c).doc(newId(c, id)), data));
            }));
            await runBatched(ops);
            if (profile && src.profiel) {
                const p = Object.fromEntries(PROFILE_FIELDS.filter(k => src.profiel[k] !== undefined).map(k => [k, src.profiel[k]]));
                if (Object.keys(p).length) await db.collection('users').doc(to).set(p, { merge: true });
            }
            refreshAllUserData();
            actions.notify(`Teruggezet bij ${who}`);
            setBackup(null);
        } catch (e) { actions.notify('Terugzetten mislukt: ' + (e.message || e), 'error'); }
        setBusy(null);
    };

    return (
        <section>
            <SectionTitle>Eén gebruiker terugzetten</SectionTitle>
            <Card className="p-4 space-y-3">
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={load} />
                {!backup ? (
                    <>
                        <p className="text-sm text-stone-600 dark:text-stone-300">Kies een bestand van "Download alles" en zet de gegevens van één gebruiker terug.</p>
                        <Button variant="secondary" icon="Upload" onClick={() => fileRef.current.click()}>Back-up kiezen</Button>
                    </>
                ) : (
                    <>
                        <p className="text-xs text-stone-500">Back-up van {formatDateTime(backup.gemaaktOp)} · {plural(backup.gebruikers.length, 'gebruiker', 'gebruikers')}</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                            <label className="text-xs font-semibold text-stone-500">Gegevens van
                                <Select value={from} onChange={e => { setFrom(e.target.value); if (usersList.some(u => u.id === e.target.value)) setTo(e.target.value); }} className="mt-1">
                                    {backup.gebruikers.map(g => <option key={g.id} value={g.id}>{(g.profiel && (g.profiel.email || g.profiel.displayName)) || g.id}</option>)}
                                </Select>
                            </label>
                            <label className="text-xs font-semibold text-stone-500">Terugzetten bij
                                <Select value={to} onChange={e => setTo(e.target.value)} className="mt-1">
                                    {!usersList.some(u => u.id === to) && <option value={to}>{to} (bestaat niet meer)</option>}
                                    {usersList.map(u => <option key={u.id} value={u.id}>{u.email || u.displayName}</option>)}
                                </Select>
                            </label>
                        </div>
                        <p className="text-sm">{counts.map(([l, n]) => `${n} ${l}`).join(' · ')}</p>
                        <Toggle checked={wipe} onChange={setWipe} label="Eerst de huidige gegevens wissen" description="Anders worden de items toegevoegd (of bij dezelfde gebruiker overschreven)." />
                        <Toggle checked={profile} onChange={setProfile} label="Ook categorieën en eenheden terugzetten" />
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setBackup(null)}>Annuleren</Button>
                            <Button icon="Undo" variant={wipe ? 'danger' : 'primary'} disabled={!src || !to || !!busy} onClick={run}>{busy || 'Terugzetten'}</Button>
                        </div>
                    </>
                )}
            </Card>
        </section>
    );
}

// ================= 9. Gedeelde barcodes =================
export function SharedBarcodes() {
    const { usersList, globalSettings, actions } = useStore();
    const { confirm } = useUi();
    const [list, setList] = useState(null);
    const [q, setQ] = useState('');
    useEffect(() => db.collection('barcodes').limit(500).onSnapshot(s => setList(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (toDate(b.op) || 0) - (toDate(a.op) || 0))), () => setList([])), []);
    const shown = (list || []).filter(b => !q || smartMatch(b.naam || '', q) || b.id.includes(q.trim()));
    const on = globalSettings.barcodesDelen !== false;
    return (
        <section>
            <SectionTitle>Barcodes</SectionTitle>
            <Card className="px-4 py-2">
                <Toggle checked={on} onChange={c => actions.setGlobal('barcodes', { gedeeld: c })} label="Barcodes delen tussen gebruikers"
                    description="Wat iemand bij een gescande barcode invult, herkent de app ook bij de anderen (handig voor huismerken)." />
            </Card>
            <Card className="mt-3 overflow-hidden">
                <div className="p-3 border-b border-stone-100 dark:border-stone-800 flex items-center gap-2">
                    <Input type="search" placeholder={`Zoek in ${list ? list.length : '…'} barcodes`} value={q} onChange={e => setQ(e.target.value)} />
                </div>
                <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-[28rem] overflow-y-auto">
                    {list && !shown.length && <p className="p-4 text-sm text-stone-500">{list.length ? 'Niets gevonden.' : 'Nog geen gedeelde barcodes. Ze verschijnen hier zodra iemand een product met barcode bewaart.'}</p>}
                    {shown.slice(0, 200).map(b => {
                        const u = usersList.find(x => x.id === b.door);
                        return (
                            <div key={b.id} className="flex items-center gap-2 px-3 py-2">
                                <span className="text-lg w-7 text-center">{b.emoji || '📦'}</span>
                                <div className="min-w-0 flex-1">
                                    <input defaultValue={b.naam} aria-label={`Naam voor ${b.id}`} onBlur={e => { const v = e.target.value.trim(); if (v && v !== b.naam) db.collection('barcodes').doc(b.id).set({ naam: v }, { merge: true }); }}
                                        className="w-full bg-transparent text-sm font-medium outline-none focus:bg-stone-50 dark:focus:bg-stone-800 rounded px-1 -mx-1" />
                                    <p className="text-[11px] text-stone-400 font-mono">{b.id}{u ? <span className="font-sans"> · {nameOf(u)}</span> : null}</p>
                                </div>
                                <button type="button" aria-label="Verwijderen" onClick={async () => { if (await confirm({ title: `Barcode van "${b.naam}" verwijderen?`, confirmLabel: 'Verwijderen', danger: true })) db.collection('barcodes').doc(b.id).delete(); }} className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-stone-800"><Icon name="Trash" size={16} /></button>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </section>
    );
}

// ================= 3. Locatie kopiëren naar een andere gebruiker =================
export function CopyLocation() {
    const { vriezers, lades, items, ownerId, usersList, actions } = useStore();
    const { confirm } = useUi();
    const locs = sortLocaties(vriezers);
    const [locId, setLocId] = useState(locs[0] ? locs[0].id : '');
    const others = usersList.filter(u => u.id !== ownerId);
    const [to, setTo] = useState(others[0] ? others[0].id : '');
    const [withItems, setWithItems] = useState(true);
    const [move, setMove] = useState(false);
    const [busy, setBusy] = useState(false);
    const loc = vriezers.find(v => v.id === locId);
    const locLades = lades.filter(l => l.vriezerId === locId);
    const locItems = items.filter(i => i.vriezerId === locId);
    const target = usersList.find(u => u.id === to);
    if (!locs.length) return <Card className="p-4 text-sm text-stone-500">Deze gebruiker heeft nog geen locaties.</Card>;
    const run = async () => {
        if (!(await confirm({ title: `${loc.naam} ${move ? 'verplaatsen' : 'kopiëren'}?`, message: `Naar ${nameOf(target)}: de locatie, ${plural(locLades.length, 'lade', 'lades')}${withItems ? ' en ' + plural(locItems.length, 'product', 'producten') : ''}.${move ? ' Daarna wordt alles hier verwijderd.' : ''}`, confirmLabel: move ? 'Verplaatsen' : 'Kopiëren', danger: move }))) return;
        setBusy(true);
        try {
            const vRef = db.collection('vriezers').doc();
            const { id: _v, ...vData } = loc;
            const ladeMap = {};
            const ops = [b => b.set(vRef, { ...vData, userId: to })];
            locLades.forEach(l => { const r = db.collection('lades').doc(); ladeMap[l.id] = r.id; const { id: _l, ...d } = l; ops.push(b => b.set(r, { ...d, vriezerId: vRef.id, userId: to })); });
            if (withItems || move) locItems.forEach(i => { const { id: _i, ...d } = i; ops.push(b => b.set(db.collection('items').doc(), { ...d, vriezerId: vRef.id, ladeId: ladeMap[i.ladeId] || '', ladeNaam: ladeMap[i.ladeId] ? i.ladeNaam || '' : '', userId: to })); });
            if (move) {
                locItems.forEach(i => ops.push(b => b.delete(db.collection('items').doc(i.id))));
                locLades.forEach(l => ops.push(b => b.delete(db.collection('lades').doc(l.id))));
                ops.push(b => b.delete(db.collection('vriezers').doc(loc.id)));
            }
            await runBatched(ops);
            refreshAllUserData();
            actions.notify(`${loc.naam} ${move ? 'verplaatst' : 'gekopieerd'} naar ${nameOf(target)}`);
        } catch (e) { actions.notify('Mislukt: ' + (e.message || e), 'error'); }
        setBusy(false);
    };
    return (
        <Card className="p-4 space-y-4 max-w-2xl">
            <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-stone-500">Locatie
                    <Select value={locId} onChange={e => setLocId(e.target.value)} className="mt-1">
                        {locs.map(l => <option key={l.id} value={l.id}>{TYPE_BY_ID[l.type || 'vriezer'].label} · {l.naam}</option>)}
                    </Select>
                </label>
                <label className="text-xs font-semibold text-stone-500">Naar gebruiker
                    <Select value={to} onChange={e => setTo(e.target.value)} className="mt-1">
                        {others.map(u => <option key={u.id} value={u.id}>{u.email || u.displayName}</option>)}
                    </Select>
                </label>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300">{plural(locLades.length, 'lade', 'lades')} · {plural(locItems.length, 'product', 'producten')}</p>
            <Toggle checked={withItems || move} disabled={move} onChange={setWithItems} label="Met alle producten" description="Uit: enkel de locatie en de lades (leeg)." />
            <Toggle checked={move} onChange={setMove} label="Verplaatsen in plaats van kopiëren" description="Bv. bij een verhuis: alles verdwijnt hier en komt bij de andere gebruiker." />
            <Button icon={move ? 'Move' : 'Copy'} variant={move ? 'danger' : 'primary'} disabled={!loc || !to || busy} onClick={run}>{busy ? 'Bezig…' : move ? 'Verplaatsen' : 'Kopiëren'}</Button>
        </Card>
    );
}

// ================= 10. Etiketten afdrukken voor een gebruiker =================
export function LabelPicker() {
    const { vriezers, lades, items } = useStore();
    const { openLabels } = useUi();
    const [sel, setSel] = useState(new Set());
    const locs = sortLocaties(vriezers).filter(l => items.some(i => i.vriezerId === l.id));
    const toggle = (ids, on) => setSel(s => { const n = new Set(s); ids.forEach(id => on ? n.add(id) : n.delete(id)); return n; });
    if (!items.length) return <Card className="p-4 text-sm text-stone-500">Geen producten om etiketten voor te maken.</Card>;
    return (
        <div className="space-y-3">
            <Card className="p-3 flex flex-wrap items-center gap-2 sticky top-16 z-10">
                <span className="text-sm font-semibold flex-1">{plural(sel.size, 'product', 'producten')} gekozen</span>
                <Button size="sm" variant="secondary" onClick={() => toggle(items.map(i => i.id), sel.size !== items.length)}>{sel.size === items.length ? 'Niets' : 'Alles'}</Button>
                <Button size="sm" icon="Printer" disabled={!sel.size} onClick={() => openLabels([...sel])}>Etiketten afdrukken</Button>
            </Card>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 items-start">
                {locs.map(l => {
                    const li = items.filter(i => i.vriezerId === l.id).sort((a, b) => (a.ladeNaam || '').localeCompare(b.ladeNaam || '') || byName(a, b));
                    const all = li.every(i => sel.has(i.id));
                    return (
                        <Card key={l.id} className="overflow-hidden">
                            <button type="button" onClick={() => toggle(li.map(i => i.id), !all)} className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-stone-100 dark:border-stone-800 text-left">
                                <span className={cx('w-5 h-5 rounded-md border-2 flex items-center justify-center', all ? 'bg-teal-600 border-teal-600 text-white' : 'border-stone-300 dark:border-stone-600')}>{all && <Icon name="Check" size={13} strokeWidth={3} />}</span>
                                <span className="font-semibold flex-1 truncate">{l.naam}</span><span className="text-xs text-stone-400">{li.length}</span>
                            </button>
                            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                                {li.map(i => (
                                    <li key={i.id}>
                                        <button type="button" onClick={() => toggle([i.id], !sel.has(i.id))} className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span className={cx('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0', sel.has(i.id) ? 'bg-teal-600 border-teal-600 text-white' : 'border-stone-300 dark:border-stone-600')}>{sel.has(i.id) && <Icon name="Check" size={13} strokeWidth={3} />}</span>
                                            <span className="text-lg">{emojiFor(i)}</span>
                                            <span className="min-w-0 flex-1"><span className="block text-sm font-medium truncate">{i.naam}</span><span className="block text-xs text-stone-500">{formatAantal(i.aantal)} {i.eenheid}{i.ladeNaam ? ' · ' + i.ladeNaam : ''}</span></span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
