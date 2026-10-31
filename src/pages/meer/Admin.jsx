import React, { useEffect, useState } from 'react';
import Icon, { ICON_NAMES } from '../../lib/icons.jsx';
import { db } from '../../lib/firebase.js';
import { useStore } from '../../state/store.jsx';
import { useUi } from '../../state/ui.jsx';
import { Card, Button, Toggle, Select, Input, Textarea, Field, IconButton, EmptyState, Chip } from '../../components/ui.jsx';
import { TYPES, TOUR_COLORS, TOUR_TONE, DEFAULT_TOUR_STEPS } from '../../lib/constants.js';
import { cx, formatDateTime, sortLocaties, byName, emojiFor, formatAantal, smartMatch } from '../../lib/utils.js';

const TAB_OPTIONS = [['frig', 'Frigo'], ['voorraad', 'Stock'], ['weekmenu', 'Weekmenu'], ['recepten', 'Recepten'], ['balans', 'Controle-knop']];

export function Gebruikers() {
    const { usersList, ownerId, user, actions } = useStore();
    const { go, confirm } = useUi();
    const [open, setOpen] = useState(null);
    const [q, setQ] = useState('');
    const list = usersList.filter(u => smartMatch(u.email || u.displayName || '', q));
    const toggleTab = (u, tab) => {
        const hidden = u.hiddenTabs || [];
        actions.setUserField(u.id, { hiddenTabs: hidden.includes(tab) ? hidden.filter(t => t !== tab) : [...hidden, tab] });
    };
    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={`Zoek in ${usersList.length} gebruikers…`} className="flex-1" />
                <Button variant="secondary" onClick={async () => { if (await confirm({ title: 'Rondleiding resetten voor iedereen?', message: 'Alle gebruikers zien de rondleiding opnieuw bij de volgende keer openen.', confirmLabel: 'Resetten', danger: true })) actions.resetTourForEveryone(); }}>Reset tour</Button>
            </div>
            <Card className="overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                {list.map(u => {
                    const isOpen = open === u.id;
                    return (
                        <div key={u.id}>
                            <button type="button" onClick={() => setOpen(isOpen ? null : u.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                <span className={cx('w-2.5 h-2.5 rounded-full flex-shrink-0', u.disabled ? 'bg-red-500' : 'bg-emerald-500')} />
                                <span className="flex-1 min-w-0">
                                    <span className="block font-medium truncate">{u.email || u.displayName || u.id}{u.id === user.uid && <span className="text-xs text-stone-400"> (jij)</span>}</span>
                                    <span className="block text-xs text-stone-400">Laatst gezien {u.laatstGezien ? formatDateTime(u.laatstGezien) : 'nooit'}</span>
                                </span>
                                {u.id === ownerId && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">actief</span>}
                                <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={18} className="text-stone-400" />
                            </button>
                            {isOpen && (
                                <div className="px-4 pb-4 space-y-3 bg-stone-50/70 dark:bg-stone-800/30">
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <Button size="sm" variant="secondary" icon="Dashboard" onClick={() => go('meer/dashboard/' + u.id)}>Dashboard</Button>
                                        {u.id !== ownerId && <Button size="sm" variant="soft" icon="Swap" onClick={() => { actions.switchAccount(u.id); go('overzicht'); }}>Beheer deze voorraad</Button>}
                                        <Button size="sm" variant="secondary" icon="Help" onClick={() => { actions.setUserField(u.id, { hasSeenTutorial: false, tourDisabled: false }); actions.notify('Rondleiding staat klaar'); }}>Toon tour opnieuw</Button>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-stone-500 mb-1.5">Verborgen onderdelen</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {TAB_OPTIONS.map(([id, lbl]) => <Chip key={id} active={(u.hiddenTabs || []).includes(id)} onClick={() => toggleTab(u, id)}>{(u.hiddenTabs || []).includes(id) && <Icon name="Lock" size={12} />}{lbl}</Chip>)}
                                        </div>
                                    </div>
                                    <div>
                                        <Toggle checked={!!u.showBalans} onChange={c => actions.setUserField(u.id, { showBalans: c })} label="Controle-modus aan" />
                                        <Toggle checked={!!u.showHelpButton} onChange={c => actions.setUserField(u.id, { showHelpButton: c })} label="Hulpknop tonen" description="Toont een ?-knop bovenaan om de rondleiding te openen" />
                                        <Toggle checked={!!u.tourDisabled} onChange={c => actions.setUserField(u.id, { tourDisabled: c })} label="Rondleiding uitschakelen" />
                                        <Toggle checked={u.notificationsEnabled !== false} onChange={c => actions.setUserField(u.id, { notificationsEnabled: c })} label="Meldingen toestaan" />
                                        {u.id !== user.uid && <Toggle checked={!!u.disabled} onChange={c => actions.setUserField(u.id, { disabled: c })} label="Account blokkeren" description="De gebruiker kan de app niet meer gebruiken" />}
                                    </div>
                                    <p className="text-[11px] font-mono text-stone-400 break-all">{u.id}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
                {list.length === 0 && <p className="p-4 text-sm text-stone-500">Geen gebruikers gevonden.</p>}
            </Card>
        </div>
    );
}

export function Dashboard() {
    const { usersList, actions, ownerId } = useStore();
    const { route, go } = useUi();
    const uid = route.extra || '';
    const [data, setData] = useState(null);
    const [openLades, setOpenLades] = useState(new Set());
    useEffect(() => {
        if (!uid) { setData(null); return; }
        let live = true;
        setData('loading'); setOpenLades(new Set());
        const q = (c) => db.collection(c).where('userId', '==', uid).get().then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
        Promise.all([q('vriezers'), q('lades'), q('items')]).then(([v, l, i]) => live && setData({ v, l, i })).catch(() => live && setData({ v: [], l: [], i: [] }));
        return () => { live = false; };
    }, [uid]);
    return (
        <div className="space-y-4">
            <Select value={uid} onChange={e => go('meer/dashboard/' + e.target.value)}>
                <option value="">Kies een gebruiker…</option>
                {usersList.map(u => <option key={u.id} value={u.id}>{u.email || u.displayName || u.id}</option>)}
            </Select>
            {data === 'loading' && <div className="h-40 rounded-2xl bg-stone-200/60 dark:bg-stone-800/60 animate-pulse" />}
            {data && data !== 'loading' && (
                data.v.length === 0 ? <Card><EmptyState icon="Box" title="Nog geen locaties" /></Card> : (
                    <>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-stone-500">{data.i.filter(i => i.vriezerId !== 'custom_menu').length} producten in {data.v.length} locaties</p>
                            {uid !== ownerId && <Button size="sm" variant="soft" icon="Swap" onClick={() => { actions.switchAccount(uid); go('overzicht'); }}>Beheer deze voorraad</Button>}
                        </div>
                        {TYPES.map(t => {
                            const locs = sortLocaties(data.v.filter(v => (v.type || 'vriezer') === t.id));
                            if (!locs.length) return null;
                            return (
                                <section key={t.id}>
                                    <h3 className="text-[13px] font-semibold uppercase tracking-wide text-stone-500 mb-2 flex items-center gap-1.5"><Icon name={t.icon} size={14} />{t.label}</h3>
                                    <div className="space-y-2">
                                        {locs.map(loc => (
                                            <Card key={loc.id} className="overflow-hidden">
                                                <p className="px-4 pt-3 pb-1 font-semibold">{loc.naam}</p>
                                                {data.l.filter(l => l.vriezerId === loc.id).sort(byName).map(l => {
                                                    const li = data.i.filter(i => i.ladeId === l.id).sort(byName);
                                                    const o = openLades.has(l.id);
                                                    return (
                                                        <div key={l.id} className="border-t border-stone-100 dark:border-stone-800">
                                                            <button type="button" onClick={() => setOpenLades(s => { const n = new Set(s); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n; })} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left">
                                                                <Icon name={o ? 'ChevronDown' : 'ChevronRight'} size={16} className="text-stone-400" />{l.naam}<span className="text-xs text-stone-400">{li.length}</span>
                                                            </button>
                                                            {o && <ul className="pb-2">{li.map(i => <li key={i.id} className="flex items-center gap-2 px-10 py-1 text-sm"><span>{emojiFor(i)}</span><span className="flex-1 truncate">{i.naam}</span><span className="text-stone-500 tabular-nums">{formatAantal(i.aantal)} {i.eenheid}</span></li>)}</ul>}
                                                        </div>
                                                    );
                                                })}
                                            </Card>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </>
                )
            )}
        </div>
    );
}

export function TourEditor() {
    const { globalSettings, actions } = useStore();
    const [steps, setSteps] = useState(() => JSON.parse(JSON.stringify(globalSettings.tourSteps || DEFAULT_TOUR_STEPS)));
    const set = (i, patch) => setSteps(s => s.map((x, j) => j === i ? { ...x, ...patch } : x));
    const mv = (i, d) => setSteps(s => { const a = [...s]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
    const save = async () => { await actions.setGlobal('tourSteps', { steps }); actions.notify('Rondleiding opgeslagen'); };
    return (
        <div className="space-y-3">
            {steps.map((s, i) => (
                <Card key={i} className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center', TOUR_TONE[s.colorName] || TOUR_TONE.blue)}><Icon name={s.icon} size={18} /></span>
                        <p className="font-semibold flex-1">Stap {i + 1}</p>
                        <IconButton icon="ChevronUp" label="Omhoog" onClick={() => mv(i, -1)} disabled={i === 0} />
                        <IconButton icon="ChevronDown" label="Omlaag" onClick={() => mv(i, 1)} disabled={i === steps.length - 1} />
                        <IconButton icon="Trash" label="Verwijder stap" className="text-red-500" onClick={() => setSteps(st => st.filter((_, j) => j !== i))} />
                    </div>
                    <Field label="Titel"><Input value={s.title} onChange={e => set(i, { title: e.target.value })} /></Field>
                    <Field label="Tekst"><Textarea rows={3} value={s.content} onChange={e => set(i, { content: e.target.value })} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Icoon"><Select value={s.icon} onChange={e => set(i, { icon: e.target.value })}>{!ICON_NAMES.includes(s.icon) && <option>{s.icon}</option>}{ICON_NAMES.map(n => <option key={n}>{n}</option>)}</Select></Field>
                        <Field label="Kleur"><Select value={s.colorName} onChange={e => set(i, { colorName: e.target.value })}>{TOUR_COLORS.map(c => <option key={c}>{c}</option>)}</Select></Field>
                    </div>
                </Card>
            ))}
            <div className="flex gap-2">
                <Button variant="secondary" icon="Plus" onClick={() => setSteps(s => [...s, { title: 'Nieuwe stap', content: '', icon: 'Info', colorName: 'blue' }])}>Stap</Button>
                <Button variant="ghost" onClick={() => setSteps(JSON.parse(JSON.stringify(DEFAULT_TOUR_STEPS)))}>Standaard</Button>
                <Button className="flex-1" icon="Check" onClick={save}>Opslaan</Button>
            </div>
        </div>
    );
}
