import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Sheet, Button, Field, Input, Select, Stepper, Segmented, Chip, Toggle, Textarea } from './ui.jsx';
import { TYPES, AVAILABLE_TAGS, EMOJI_CATEGORIES, UNIT_FIELD } from '../lib/constants.js';
import {
    cx, num, dateKey, todayKey, addDays, categoriesFor, unitsFor, guessProduct, normalize, emojiForCategory,
    sortLocaties, byName, mondayOf, weekdayLabel
} from '../lib/utils.js';

const LAST_LOC_KEY = 'voorraad_laatste_plaats';
const readLast = () => { try { return JSON.parse(localStorage.getItem(LAST_LOC_KEY) || 'null'); } catch (e) { return null; } };

const THT_SHORTCUTS = [['+3 d', 3], ['+1 w', 7], ['+1 m', 30], ['+3 m', 91], ['+1 j', 365]];

export default function ItemForm() {
    const { form, closeForm } = useUi();
    if (!form) return null;
    return <ItemFormInner key={(form.item && form.item.id) || 'new' + (form.nonce || '')} form={form} close={closeForm} />;
}

function ItemFormInner({ form, close }) {
    const { vriezers, lades, items, shopping, owner, typeOf, canSee, actions } = useStore();
    const editing = form.item || null;
    const source = editing || form.duplicateOf || null;

    const initialType = source ? typeOf(source) : (form.type || (form.prefill && form.prefill.type) || 'vriezer');
    const last = readLast();
    const [remember, setRemember] = useState(!!last);

    const firstLocOf = (t) => {
        const locs = sortLocaties(vriezers.filter(v => v.type === t));
        if (!source && last && last.type === t && locs.some(l => l.id === last.vriezerId)) return last.vriezerId;
        return locs.length ? locs[0].id : '__new';
    };

    const [v, setV] = useState(() => {
        const p = form.prefill || {};
        const base = source ? {
            naam: form.duplicateOf ? source.naam : source.naam, emoji: source.emoji || '', aantal: num(source.aantal, 1), eenheid: source.eenheid || 'stuks',
            vriezerId: source.vriezerId, ladeId: source.ladeId || '', categorie: source.categorie || 'Ander',
            ingevrorenOp: dateKey(source.ingevrorenOp || new Date()), houdbaarheidsDatum: source.houdbaarheidsDatum ? dateKey(source.houdbaarheidsDatum) : '',
            minimumVoorraad: source.minimumVoorraad ?? '', prijs: source.prijs ?? '', notitie: source.notitie || '', tags: source.tags || [],
            altijdGoed: !!source.altijdGoed, geplandeDatum: editing ? (source.geplandeDatum || '') : ''
        } : {
            naam: p.naam || '', emoji: '', aantal: p.aantal || 1, eenheid: p.eenheid || 'stuks',
            vriezerId: p.vriezerId || firstLocOf(initialType), ladeId: p.ladeId ?? (last && last.type === initialType && !p.vriezerId ? (last.ladeId || '') : ''),
            categorie: p.categorie || (initialType === 'voorraad' ? 'Pasta' : 'Vlees'),
            ingevrorenOp: todayKey(), houdbaarheidsDatum: '', minimumVoorraad: '', prijs: '', notitie: '', tags: [], altijdGoed: false, geplandeDatum: ''
        };
        if (form.duplicateOf) base.ingevrorenOp = todayKey();
        return { type: initialType, times: 1, newLoc: '', newLade: '', ...base };
    });
    const [touched, setTouched] = useState(source ? { categorie: true, emoji: true, tht: true, eenheid: true } : {});
    const [showMore, setShowMore] = useState(!!editing && !!(editing.minimumVoorraad || editing.prijs || editing.notitie || (editing.tags || []).length || editing.altijdGoed || editing.geplandeDatum));
    const [showEmoji, setShowEmoji] = useState(false);
    const [saving, setSaving] = useState(false);
    const set = (patch) => setV(s => ({ ...s, ...patch }));

    // Als het product door snelle invoer of door de shopping-lijst geopend wordt: kies zinnige defaults.
    useEffect(() => { if (!source && v.naam) applyNameHints(v.naam); }, []);

    const locs = useMemo(() => sortLocaties(vriezers.filter(l => l.type === v.type)), [vriezers, v.type]);
    const groups = new Set(vriezers.map(l => l.locatieGroep || 'Thuis'));
    const locLades = useMemo(() => lades.filter(l => l.vriezerId === v.vriezerId).sort(byName), [lades, v.vriezerId]);
    const cats = categoriesFor(owner.customCategories, v.type);
    const units = unitsFor(owner[UNIT_FIELD[v.type]] || (v.type === 'vriezer' ? owner.customUnits : null), v.type);
    const unitOptions = units.includes(v.eenheid) ? units : [v.eenheid, ...units];
    const catOptions = cats.some(c => c.name === v.categorie) ? cats : [{ name: v.categorie, color: 'gray' }, ...cats];

    // Bekende productnamen (voor suggesties + overnemen van categorie/eenheid)
    const known = useMemo(() => {
        const m = new Map();
        items.forEach(i => { const k = normalize(i.naam); if (k && !m.has(k)) m.set(k, i); });
        return m;
    }, [items]);
    const nameList = useMemo(() => [...new Set([...items.map(i => i.naam), ...shopping.map(s => s.naam)])].sort().slice(0, 300), [items, shopping]);

    function applyNameHints(naam) {
        const hit = known.get(normalize(naam));
        if (hit) {
            setV(s => ({
                ...s,
                categorie: touched.categorie ? s.categorie : (hit.categorie || s.categorie),
                emoji: touched.emoji ? s.emoji : (hit.emoji || ''),
                eenheid: touched.eenheid ? s.eenheid : (hit.eenheid || s.eenheid),
                minimumVoorraad: s.minimumVoorraad === '' && hit.minimumVoorraad ? hit.minimumVoorraad : s.minimumVoorraad
            }));
            return;
        }
        const g = guessProduct(naam);
        if (!g) return;
        setV(s => ({
            ...s,
            categorie: touched.categorie ? s.categorie : g.cat,
            emoji: touched.emoji ? s.emoji : g.emoji,
            houdbaarheidsDatum: !touched.tht && s.type !== 'vriezer' && g.days ? dateKey(addDays(new Date(), g.days)) : s.houdbaarheidsDatum
        }));
    }

    const changeType = (t) => {
        setV(s => ({ ...s, type: t, vriezerId: firstLocOf(t), ladeId: '', categorie: touched.categorie ? s.categorie : (t === 'voorraad' ? 'Pasta' : 'Vlees') }));
    };

    const submit = async (e) => {
        e && e.preventDefault();
        if (!v.naam.trim()) return;
        setSaving(true);
        try {
            let vriezerId = v.vriezerId, ladeId = v.ladeId, _locNaam, _ladeNaam;
            if (vriezerId === '__new') {
                _locNaam = v.newLoc.trim() || (v.type === 'vriezer' ? 'Vriezer' : v.type === 'frig' ? 'Frigo' : 'Kast');
                vriezerId = await actions.addLocatie({ naam: _locNaam, type: v.type });
                if (ladeId !== '__new') ladeId = '';
            }
            if (ladeId === '__new') {
                _ladeNaam = v.newLade.trim();
                ladeId = _ladeNaam ? await actions.addLade(vriezerId, _ladeNaam) : '';
            }
            if (remember) localStorage.setItem(LAST_LOC_KEY, JSON.stringify({ type: v.type, vriezerId, ladeId }));
            else localStorage.removeItem(LAST_LOC_KEY);
            const values = {
                ...v, vriezerId, ladeId, _locNaam, _ladeNaam,
                ingevrorenOp: v.ingevrorenOp ? addDays(v.ingevrorenOp, 0) : new Date(),
                houdbaarheidsDatum: v.houdbaarheidsDatum && !v.altijdGoed ? addDays(v.houdbaarheidsDatum, 0) : null,
                emoji: v.emoji || emojiForCategory(v.categorie),
                viaBalans: form.viaBalans
            };
            await actions.saveItem(values, { editing, times: editing ? 1 : v.times, fromShoppingId: form.fromShoppingId });
            if (form.keepOpen) { set({ naam: '', emoji: '', aantal: 1, notitie: '', houdbaarheidsDatum: '' }); setTouched({}); }
            else close();
        } catch (err) {
            actions.notify('Opslaan mislukt: ' + (err.message || err), 'error');
        } finally { setSaving(false); }
    };

    const weekOptions = useMemo(() => {
        const out = [];
        for (let w = 0; w < 2; w++) {
            const mon = mondayOf(new Date(), w);
            for (let i = 0; i < 7; i++) { const d = addDays(mon, i); out.push({ key: dateKey(d), label: weekdayLabel(d, { weekday: 'long', day: 'numeric', month: 'short' }), w }); }
        }
        return out;
    }, []);

    const visibleTypes = TYPES.filter(t => t.id === 'vriezer' || canSee(t.id) || t.id === v.type);
    const title = editing ? 'Product bewerken' : form.duplicateOf ? 'Kopie toevoegen' : 'Product toevoegen';

    return (
        <Sheet open onClose={close} title={title} footer={
            <div className="flex gap-2">
                <Button variant="secondary" onClick={close} className="flex-1 sm:flex-none">Annuleren</Button>
                <Button onClick={submit} disabled={saving || !v.naam.trim()} className="flex-1" icon="Check">{editing ? 'Opslaan' : (num(v.times) > 1 ? `${v.times}× toevoegen` : 'Toevoegen')}</Button>
            </div>
        }>
            <form onSubmit={submit} className="space-y-4" autoComplete="off">
                {visibleTypes.length > 1 && (
                    <Segmented value={v.type} onChange={changeType} options={visibleTypes.map(t => ({ id: t.id, label: t.label, icon: t.icon }))} />
                )}

                <div className="flex gap-2">
                    <button type="button" onClick={() => setShowEmoji(s => !s)} aria-label="Kies emoji"
                        className={cx('w-11 h-11 rounded-xl border flex items-center justify-center text-2xl flex-shrink-0', showEmoji ? 'border-teal-500 ring-4 ring-teal-500/15' : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800')}>
                        {v.emoji || emojiForCategory(v.categorie)}
                    </button>
                    <Input autoFocus={!editing} list="known-names" placeholder="Naam van het product" value={v.naam} required
                        onChange={e => set({ naam: e.target.value })} onBlur={e => !editing && applyNameHints(e.target.value)}
                        className="font-semibold" />
                    <datalist id="known-names">{nameList.map(n => <option key={n} value={n} />)}</datalist>
                </div>
                {showEmoji && (
                    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 p-2 max-h-56 overflow-y-auto">
                        {Object.entries(EMOJI_CATEGORIES).map(([group, list]) => (
                            <div key={group} className="mb-1">
                                <p className="text-[11px] font-semibold text-stone-400 px-1 pt-1">{group}</p>
                                <div className="grid grid-cols-8 sm:grid-cols-10">
                                    {list.map(em => <button type="button" key={group + em} onClick={() => { set({ emoji: em }); setTouched(t => ({ ...t, emoji: true })); setShowEmoji(false); }} className="text-2xl h-10 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800">{em}</button>)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <Field group label="Aantal"><Stepper value={v.aantal} onChange={a => set({ aantal: a })} min={0.25} /></Field>
                    <Field label="Eenheid">
                        <Select value={v.eenheid} onChange={e => { set({ eenheid: e.target.value }); setTouched(t => ({ ...t, eenheid: true })); }}>
                            {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                        </Select>
                    </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Locatie">
                        <Select value={v.vriezerId} onChange={e => set({ vriezerId: e.target.value, ladeId: '' })}>
                            {locs.map(l => <option key={l.id} value={l.id}>{groups.size > 1 ? `${l.locatieGroep || 'Thuis'} · ` : ''}{l.naam}</option>)}
                            <option value="__new">＋ Nieuwe locatie…</option>
                        </Select>
                    </Field>
                    <Field label="Lade / plank">
                        <Select value={v.ladeId} onChange={e => set({ ladeId: e.target.value })} disabled={v.vriezerId === '__new' && false}>
                            <option value="">Geen lade</option>
                            {v.vriezerId !== '__new' && locLades.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                            <option value="__new">＋ Nieuwe lade…</option>
                        </Select>
                    </Field>
                </div>
                {(v.vriezerId === '__new' || v.ladeId === '__new') && (
                    <div className="grid grid-cols-2 gap-3 -mt-1">
                        {v.vriezerId === '__new' ? <Input placeholder="Naam locatie (bv. Diepvries garage)" value={v.newLoc} onChange={e => set({ newLoc: e.target.value })} /> : <span />}
                        {v.ladeId === '__new' ? <Input placeholder="Naam lade (bv. Lade 1)" value={v.newLade} onChange={e => set({ newLade: e.target.value })} /> : <span />}
                    </div>
                )}

                {!v.altijdGoed && (
                    v.type === 'vriezer' ? (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Ingevroren op"><Input type="date" value={v.ingevrorenOp} max={todayKey()} onChange={e => set({ ingevrorenOp: e.target.value })} /></Field>
                            <Field label="Houdbaar tot (optioneel)"><Input type="date" value={v.houdbaarheidsDatum} onChange={e => { set({ houdbaarheidsDatum: e.target.value }); setTouched(t => ({ ...t, tht: true })); }} /></Field>
                        </div>
                    ) : (
                        <Field group label="Houdbaar tot (THT)">
                            <Input type="date" value={v.houdbaarheidsDatum} onChange={e => { set({ houdbaarheidsDatum: e.target.value }); setTouched(t => ({ ...t, tht: true })); }} />
                            <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                                {THT_SHORTCUTS.map(([lbl, d]) => (
                                    <button type="button" key={lbl} onClick={() => { set({ houdbaarheidsDatum: dateKey(addDays(new Date(), d)) }); setTouched(t => ({ ...t, tht: true })); }}
                                        className="h-8 px-3 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 flex-shrink-0">{lbl}</button>
                                ))}
                                {v.houdbaarheidsDatum && <button type="button" onClick={() => set({ houdbaarheidsDatum: '' })} className="h-8 px-3 rounded-full text-xs font-semibold text-stone-400 hover:text-stone-600 flex-shrink-0">Wissen</button>}
                            </div>
                        </Field>
                    )
                )}

                <Field group label="Categorie">
                    <div className="flex flex-wrap gap-1.5">
                        {catOptions.map(c => (
                            <Chip key={c.name} color={c.color} active={v.categorie === c.name} onClick={() => { set({ categorie: c.name }); setTouched(t => ({ ...t, categorie: true })); }}>{c.name}</Chip>
                        ))}
                    </div>
                </Field>

                <button type="button" onClick={() => setShowMore(s => !s)} className="w-full flex items-center justify-between py-2 text-sm font-semibold text-teal-700 dark:text-teal-300">
                    Meer opties <Icon name={showMore ? 'ChevronUp' : 'ChevronDown'} size={18} />
                </button>
                {showMore && (
                    <div className="space-y-4 anim-fade">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Minimum voorraad" hint="Komt vanzelf op je lijstje als het eronder zakt">
                                <Input inputMode="decimal" placeholder="—" value={v.minimumVoorraad} onChange={e => set({ minimumVoorraad: e.target.value.replace(',', '.') })} />
                            </Field>
                            <Field label="Prijs (€)">
                                <Input inputMode="decimal" placeholder="—" value={v.prijs} onChange={e => set({ prijs: e.target.value.replace(',', '.') })} />
                            </Field>
                        </div>
                        <Field label="Notitie"><Textarea rows={2} placeholder="Bv. voor de BBQ" value={v.notitie} onChange={e => set({ notitie: e.target.value })} /></Field>
                        <Field group label="Labels">
                            <div className="flex flex-wrap gap-1.5">
                                {AVAILABLE_TAGS.map(t => {
                                    const on = (v.tags || []).includes(t);
                                    return <Chip key={t} active={on} onClick={() => set({ tags: on ? v.tags.filter(x => x !== t) : [...(v.tags || []), t] })}>{t}</Chip>;
                                })}
                            </div>
                        </Field>
                        <Toggle checked={v.altijdGoed} onChange={c => set({ altijdGoed: c })} label="Altijd goed" description="Negeer datums voor dit product (bv. zout, suiker)" />
                        {canSee('weekmenu') && (
                            <Field label="Inplannen in weekmenu">
                                <Select value={v.geplandeDatum} onChange={e => set({ geplandeDatum: e.target.value })}>
                                    <option value="">Niet ingepland</option>
                                    {v.geplandeDatum && !weekOptions.some(o => o.key === v.geplandeDatum) && <option value={v.geplandeDatum}>{v.geplandeDatum}</option>}
                                    <optgroup label="Deze week">{weekOptions.filter(o => o.w === 0).map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</optgroup>
                                    <optgroup label="Volgende week">{weekOptions.filter(o => o.w === 1).map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</optgroup>
                                </Select>
                            </Field>
                        )}
                        {!editing && (
                            <Field group label="Als aparte producten opslaan" hint="Bv. 4 porties soep die je los wil kunnen gebruiken">
                                <Stepper value={v.times} onChange={t => set({ times: t })} min={1} max={50} step={1} className="w-40" />
                            </Field>
                        )}
                    </div>
                )}
                {!editing && (
                    <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300 pt-1">
                        <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-4 h-4 accent-teal-600" />
                        Onthoud locatie en lade voor de volgende keer
                    </label>
                )}
                <button type="submit" className="hidden" />
            </form>
        </Sheet>
    );
}
