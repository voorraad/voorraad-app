import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Sheet, Button, Field, Input, Select, Stepper, Segmented, StorePicker } from './ui.jsx';
import { WINKELS, TYPES, TYPE_BY_ID, APP_VERSION, VERSION_HISTORY, TOUR_TONE } from '../lib/constants.js';
import { cx, num, emojiFor, formatAantal, sortLocaties, byName, mondayOf, addDays, dateKey, weekdayLabel, smartMatch, isMenuEntry, todayKey } from '../lib/utils.js';

// ---------- Bevestigen / vraag ----------
export function ConfirmDialog() {
    const { confirmState, setConfirmState } = useUi();
    if (!confirmState) return null;
    const done = (ok) => { confirmState.resolve(ok); setConfirmState(null); };
    return (
        <Sheet open size="sm" onClose={() => done(false)} title={confirmState.title || 'Ben je zeker?'}>
            {confirmState.message && <p className="text-sm text-stone-600 dark:text-stone-300 -mt-1">{confirmState.message}</p>}
            <div className="flex gap-2 mt-5">
                <Button variant="secondary" className="flex-1" onClick={() => done(false)}>{confirmState.cancelLabel || 'Annuleren'}</Button>
                <Button variant={confirmState.danger ? 'danger' : 'primary'} className="flex-1" onClick={() => done(true)}>{confirmState.confirmLabel || 'OK'}</Button>
            </div>
        </Sheet>
    );
}

export function PromptDialog() {
    const { promptState, setPromptState } = useUi();
    const [val, setVal] = useState('');
    useEffect(() => { if (promptState) setVal(promptState.value || ''); }, [promptState]);
    if (!promptState) return null;
    const done = (v) => { promptState.resolve(v); setPromptState(null); };
    return (
        <Sheet open size="sm" onClose={() => done(null)} title={promptState.title}>
            <form onSubmit={e => { e.preventDefault(); if (val.trim()) done(val.trim()); }}>
                {promptState.message && <p className="text-sm text-stone-600 dark:text-stone-300 -mt-1 mb-3">{promptState.message}</p>}
                <Input autoFocus value={val} placeholder={promptState.placeholder} onChange={e => setVal(e.target.value)} />
                <div className="flex gap-2 mt-4">
                    <Button variant="secondary" className="flex-1" onClick={() => done(null)}>Annuleren</Button>
                    <Button type="submit" className="flex-1" disabled={!val.trim()}>{promptState.confirmLabel || 'Opslaan'}</Button>
                </div>
            </form>
        </Sheet>
    );
}

// ---------- Verwijderen met reden + optioneel op lijstje ----------
export function RemoveDialog() {
    const { removeFor, closeRemove } = useUi();
    const { actions, shopping } = useStore();
    const item = removeFor && removeFor.item;
    const [reason, setReason] = useState('consumed');
    const [toList, setToList] = useState(false);
    const [aantal, setAantal] = useState(1);
    const [winkel, setWinkel] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!item) return;
        setReason(removeFor.reason || 'consumed');
        const onList = shopping.some(s => !s.checked && s.naam.toLowerCase() === item.naam.toLowerCase());
        setToList(num(item.minimumVoorraad) > 0 && !onList);
        setAantal(num(item.minimumVoorraad) > 0 ? num(item.minimumVoorraad) : Math.max(1, num(item.aantal, 1)));
        setWinkel('');
    }, [removeFor]);
    if (!item) return null;
    const go = async () => {
        setBusy(true);
        try { await actions.removeItem(item, reason, toList ? { aantal, winkel } : null); closeRemove(); }
        catch (e) { actions.notify('Verwijderen mislukt', 'error'); }
        finally { setBusy(false); }
    };
    const reasons = [
        { id: 'consumed', label: 'Opgegeten', icon: 'Utensils' },
        { id: 'wasted', label: 'Weggegooid', icon: 'Trash' },
        { id: 'other', label: 'Foutje / anders', icon: 'X' }
    ];
    return (
        <Sheet open onClose={closeRemove} title={`${item.naam} verwijderen`} subtitle={`${formatAantal(item.aantal)} ${item.eenheid}`}>
            <p className="text-sm font-semibold text-stone-500 mb-2">Wat is er mee gebeurd?</p>
            <div className="grid grid-cols-3 gap-2">
                {reasons.map(r => (
                    <button key={r.id} type="button" onClick={() => setReason(r.id)}
                        className={cx('h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 text-sm font-semibold transition-colors',
                            reason === r.id
                                ? (r.id === 'wasted' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200')
                                : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300')}>
                        <Icon name={r.icon} size={20} />{r.label}
                    </button>
                ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">Dit telt mee in je statistieken (opgegeten vs. verspild).</p>

            <div className={cx('mt-4 rounded-2xl border p-3 transition-colors', toList ? 'border-teal-300 bg-teal-50/60 dark:border-teal-800 dark:bg-teal-950/30' : 'border-stone-200 dark:border-stone-700')}>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={toList} onChange={e => setToList(e.target.checked)} className="w-5 h-5 accent-teal-600" />
                    <span className="font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2"><Icon name="Cart" size={18} /> Op boodschappenlijst zetten</span>
                </label>
                {toList && (
                    <div className="space-y-2 mt-3">
                        <Stepper value={aantal} onChange={setAantal} min={0.25} className="w-40" />
                        <StorePicker value={winkel} onChange={setWinkel} />
                    </div>
                )}
            </div>
            <div className="flex gap-2 mt-5">
                <Button variant="secondary" className="flex-1" onClick={closeRemove}>Annuleren</Button>
                <Button variant={reason === 'wasted' ? 'danger' : 'primary'} className="flex-1" onClick={go} disabled={busy}>Verwijderen</Button>
            </div>
        </Sheet>
    );
}

// ---------- Verplaatsen ----------
export function MoveSheet() {
    const { moveIds, closeMove } = useUi();
    const { vriezers, lades, items, typeOf, actions } = useStore();
    const first = moveIds && items.find(i => i.id === moveIds[0]);
    const [type, setType] = useState('vriezer');
    const [locId, setLocId] = useState('');
    const [ladeId, setLadeId] = useState('');
    useEffect(() => {
        if (!first) return;
        setType(typeOf(first)); setLocId(first.vriezerId); setLadeId(first.ladeId || '');
    }, [moveIds]);
    if (!moveIds) return null;
    const locs = sortLocaties(vriezers.filter(v => v.type === type));
    const locLades = lades.filter(l => l.vriezerId === locId).sort(byName);
    const go = async () => { await actions.moveItems(moveIds, locId, ladeId); closeMove(); };
    return (
        <Sheet open onClose={closeMove} title={moveIds.length === 1 && first ? `${first.naam} verplaatsen` : `${moveIds.length} producten verplaatsen`}>
            <div className="space-y-4">
                <Segmented value={type} onChange={t => { setType(t); const l = sortLocaties(vriezers.filter(v => v.type === t))[0]; setLocId(l ? l.id : ''); setLadeId(''); }}
                    options={TYPES.map(t => ({ id: t.id, label: t.label, icon: t.icon }))} />
                {locs.length === 0 ? <p className="text-sm text-stone-500">Nog geen locaties van dit type. Maak er een aan via Meer › Locaties.</p> : (
                    <>
                        <Field group label="Locatie">
                            <div className="grid grid-cols-2 gap-2">
                                {locs.map(l => (
                                    <button key={l.id} type="button" onClick={() => { setLocId(l.id); setLadeId(''); }}
                                        className={cx('h-12 px-3 rounded-xl border-2 text-sm font-semibold text-left truncate', locId === l.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200' : 'border-stone-200 dark:border-stone-700')}>{l.naam}</button>
                                ))}
                            </div>
                        </Field>
                        <Field group label="Lade">
                            <div className="grid grid-cols-2 gap-2">
                                {[{ id: '', naam: 'Geen lade' }, ...locLades].map(l => (
                                    <button key={l.id || 'none'} type="button" onClick={() => setLadeId(l.id)}
                                        className={cx('h-11 px-3 rounded-xl border-2 text-sm font-medium text-left truncate', ladeId === l.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200' : 'border-stone-200 dark:border-stone-700', !l.id && 'italic text-stone-500')}>{l.naam}</button>
                                ))}
                            </div>
                        </Field>
                    </>
                )}
            </div>
            <div className="flex gap-2 mt-5">
                <Button variant="secondary" className="flex-1" onClick={closeMove}>Annuleren</Button>
                <Button className="flex-1" onClick={go} disabled={!locId} icon="Move">Verplaatsen</Button>
            </div>
        </Sheet>
    );
}

// ---------- Inplannen in weekmenu ----------
// plan = { item } → kies een dag;  plan = { date } → kies wat je die dag eet
export function PlanSheet() {
    const { plan, closePlan } = useUi();
    const { items, recepten, typeOf, actions, canSee } = useStore();
    const [q, setQ] = useState('');
    const [week, setWeek] = useState(0);
    useEffect(() => { setQ(''); setWeek(0); }, [plan]);
    if (!plan) return null;

    if (plan.item) {
        const mon = mondayOf(new Date(), week);
        const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
        return (
            <Sheet open onClose={closePlan} title={`${plan.item.naam} inplannen`} subtitle="Op welke dag eet je dit?">
                <div className="flex items-center justify-between mb-3">
                    <Button variant="ghost" size="sm" icon="ChevronLeft" onClick={() => setWeek(w => w - 1)} disabled={week <= 0}>Vorige</Button>
                    <span className="text-sm font-semibold text-stone-600 dark:text-stone-300">{week === 0 ? 'Deze week' : week === 1 ? 'Volgende week' : `Over ${week} weken`}</span>
                    <Button variant="ghost" size="sm" onClick={() => setWeek(w => w + 1)}>Volgende <Icon name="ChevronRight" size={16} /></Button>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                    {days.map(d => {
                        const k = dateKey(d);
                        const past = k < todayKey();
                        const on = plan.item.geplandeDatum === k;
                        return (
                            <button key={k} type="button" disabled={past} onClick={async () => { await actions.planItem(plan.item, k); actions.notify(`Ingepland op ${weekdayLabel(d)}`); closePlan(); }}
                                className={cx('h-12 px-4 rounded-xl flex items-center justify-between text-left font-medium disabled:opacity-40', on ? 'bg-pink-50 text-pink-800 ring-2 ring-pink-400 dark:bg-pink-950/40 dark:text-pink-200' : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700')}>
                                <span>{weekdayLabel(d)}{k === todayKey() && <span className="ml-2 text-xs font-bold text-pink-600">vandaag</span>}</span>
                                <span className="text-sm text-stone-400">{d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}</span>
                            </button>
                        );
                    })}
                </div>
                {plan.item.geplandeDatum && <Button variant="ghost" block className="mt-3" onClick={async () => { await actions.planItem(plan.item, null); closePlan(); }}>Niet meer inplannen</Button>}
            </Sheet>
        );
    }

    const date = plan.date;
    const avail = items.filter(i => !i.geplandeDatum && (typeOf(i) === 'vriezer' || typeOf(i) === 'frig') && smartMatch(i.naam, q)).sort(byName);
    const recs = canSee('recepten') ? recepten.filter(r => smartMatch(r.naam, q)).sort(byName) : [];
    const addFree = async () => { if (!q.trim()) return; await actions.addMenuEntry(dateKey(date), q); closePlan(); };
    return (
        <Sheet open onClose={closePlan} title={`Wat eten we ${weekdayLabel(date).toLowerCase()}?`} subtitle={date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })}>
            <form onSubmit={e => { e.preventDefault(); addFree(); }} className="flex gap-2 sticky top-0 bg-white dark:bg-stone-900 pb-3 z-10">
                <Input autoFocus placeholder="Zoek of typ een gerecht…" value={q} onChange={e => setQ(e.target.value)} />
                <Button type="submit" disabled={!q.trim()} icon="Plus" className="flex-shrink-0">Zet op menu</Button>
            </form>
            {recs.length > 0 && (
                <>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mt-1 mb-1.5">Recepten</p>
                    <ul className="mb-3">
                        {recs.slice(0, 20).map(r => (
                            <li key={r.id}><button type="button" onClick={async () => { await actions.addMenuEntry(dateKey(date), r.naam, { receptId: r.id, emoji: '📖' }); closePlan(); }}
                                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 text-left">
                                <span className="text-xl w-8 text-center">📖</span><span className="font-medium flex-1 truncate">{r.naam}</span><span className="text-xs text-stone-400">{r.categorie}</span>
                            </button></li>
                        ))}
                    </ul>
                </>
            )}
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mt-1 mb-1.5">Uit vriezer & frigo</p>
            {avail.length === 0 ? <p className="text-sm text-stone-500 py-3">Niets gevonden{q ? ` voor "${q}"` : ''}.</p> : (
                <ul>
                    {avail.slice(0, 60).map(i => (
                        <li key={i.id}><button type="button" onClick={async () => { await actions.planItem(i, dateKey(date)); closePlan(); }}
                            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 text-left">
                            <span className="text-xl w-8 text-center">{emojiFor(i)}</span>
                            <span className="font-medium flex-1 truncate">{i.naam}</span>
                            <span className="text-xs text-stone-400 flex-shrink-0">{formatAantal(i.aantal)} {i.eenheid} · {TYPE_BY_ID[typeOf(i)].label}</span>
                        </button></li>
                    ))}
                </ul>
            )}
        </Sheet>
    );
}

// ---------- Wat is er nieuw ----------
export function NewsSheet() {
    const { showNews, setShowNews } = useUi();
    if (!showNews) return null;
    return (
        <Sheet open onClose={() => setShowNews(false)} title="Wat is er nieuw" subtitle={`Versie ${APP_VERSION}`} size="lg">
            <div className="space-y-6">
                {VERSION_HISTORY.map((v, i) => (
                    <div key={v.version}>
                        <p className={cx('font-bold mb-2', i === 0 ? 'text-teal-700 dark:text-teal-300' : 'text-stone-400')}>Versie {v.version}</p>
                        <ul className="space-y-2">
                            {v.changes.map((c, j) => {
                                const idx = c.indexOf(': ');
                                const head = idx > 0 && idx < 24 ? c.slice(0, idx) : null;
                                const body = head ? c.slice(idx + 2) : c;
                                return (
                                    <li key={j} className="flex gap-3 text-sm">
                                        <span className={cx('mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0', i === 0 ? 'bg-teal-500' : 'bg-stone-300')} />
                                        <span className="text-stone-700 dark:text-stone-300">{head && <b className="text-stone-900 dark:text-stone-100">{head}: </b>}{body}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>
        </Sheet>
    );
}

// ---------- Rondleiding ----------
export function Tour() {
    const { showTour, setShowTour } = useUi();
    const { globalSettings, actions } = useStore();
    const steps = globalSettings.tourSteps || [];
    const [i, setI] = useState(0);
    const [touchX, setTouchX] = useState(null);
    useEffect(() => { if (showTour) setI(0); }, [showTour]);
    if (!showTour || !steps.length) return null;
    const s = steps[Math.min(i, steps.length - 1)];
    const finish = () => { setShowTour(false); actions.setMine({ hasSeenTutorial: true }); };
    const next = () => (i < steps.length - 1 ? setI(i + 1) : finish());
    const prev = () => setI(Math.max(0, i - 1));
    return (
        <Sheet open size="sm" onClose={finish} title={null} dismissable={false}>
            <div className="text-center pt-6 select-none"
                onTouchStart={e => setTouchX(e.touches[0].clientX)}
                onTouchEnd={e => { if (touchX == null) return; const d = touchX - e.changedTouches[0].clientX; if (d > 50) next(); else if (d < -50) prev(); setTouchX(null); }}>
                <div className={cx('w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-5', TOUR_TONE[s.colorName] || TOUR_TONE.blue)}>
                    <Icon name={s.icon} size={38} />
                </div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-white">{s.title}</h2>
                <p className="text-stone-600 dark:text-stone-300 mt-2 leading-relaxed whitespace-pre-line">{s.content}</p>
                <div className="flex justify-center gap-1.5 my-6">
                    {steps.map((_, j) => <span key={j} className={cx('h-1.5 rounded-full transition-all', j === i ? 'w-6 bg-teal-600' : 'w-1.5 bg-stone-300 dark:bg-stone-600')} />)}
                </div>
                <div className="flex gap-2">
                    {i > 0 ? <Button variant="secondary" className="flex-1" onClick={prev}>Vorige</Button> : <Button variant="ghost" className="flex-1" onClick={finish}>Overslaan</Button>}
                    <Button className="flex-1" onClick={next}>{i < steps.length - 1 ? 'Volgende' : 'Aan de slag'}</Button>
                </div>
            </div>
        </Sheet>
    );
}
