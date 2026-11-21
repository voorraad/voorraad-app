import React, { useMemo, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Card, Button, Sheet, Field, Input, Select, Stepper, Chip } from './ui.jsx';
import { PhotoInput } from './media.jsx';
import { useUrgent } from './Urgent.jsx';
import { cx, ingredientMatches, todayKey, addDays, dateKey, sortLocaties } from '../lib/utils.js';

// ---------- Wat kan ik koken? ----------
// Recepten gesorteerd op: hoeveel producten die eerst op moeten ze gebruiken, dan hoeveel je al in huis hebt.
export function useKookIdeeen() {
    const { recepten, items } = useStore();
    const urgent = useUrgent();
    const dringend = useMemo(() => [...urgent.now, ...urgent.soon, ...urgent.week].map(x => x.item), [urgent]);
    const ideeen = useMemo(() => recepten.map(r => {
        const ing = (r.ingredienten || []).filter(i => i.naam);
        const have = ing.filter(i => items.some(it => ingredientMatches(it.naam, i.naam))).length;
        const gebruikt = dringend.filter(it => ing.some(i => ingredientMatches(it.naam, i.naam)));
        return { r, have, total: ing.length, gebruikt: [...new Map(gebruikt.map(x => [x.naam.toLowerCase(), x])).values()] };
    }).filter(x => x.total && (x.gebruikt.length || x.have / x.total >= 0.5))
        .sort((a, b) => b.gebruikt.length - a.gebruikt.length || b.have / b.total - a.have / a.total), [recepten, items, dringend]);
    return { ideeen, dringend };
}

const zoekOnline = (namen) => window.open('https://www.google.com/search?q=' + encodeURIComponent('recept met ' + namen.slice(0, 4).join(' en ')), '_blank', 'noopener');

// Blok 'Wat kan ik koken?' (bovenaan de recepten en onderaan 'Eerst opmaken')
export function WatKanIkKoken({ onOpen, compact }) {
    const { ideeen, dringend } = useKookIdeeen();
    const namen = [...new Set(dringend.map(i => i.naam))];
    if (!ideeen.length && !namen.length) return null;
    return (
        <Card className="p-4">
            <p className="font-semibold flex items-center gap-2"><Icon name="Utensils" size={17} className="text-teal-600" />Wat kan ik koken?</p>
            {ideeen.length ? (
                <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
                    {ideeen.slice(0, compact ? 3 : 6).map(({ r, have, total, gebruikt }) => (
                        <li key={r.id}>
                            <button type="button" onClick={() => onOpen(r)} className="w-full flex items-center gap-3 py-2 text-left">
                                <span className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 bg-cover bg-center flex items-center justify-center flex-shrink-0 text-stone-400" style={r.fotoUrl ? { backgroundImage: `url("${r.fotoUrl.replace(/"/g, '')}")` } : undefined}>{!r.fotoUrl && <Icon name="Utensils" size={16} />}</span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold truncate">{r.naam}</span>
                                    <span className="block text-xs text-stone-500 truncate">
                                        {gebruikt.length ? <span className="text-orange-600 font-medium">Maakt op: {gebruikt.map(i => i.naam).join(', ')}</span> : null}
                                        {gebruikt.length ? ' · ' : ''}{have}/{total} in huis
                                    </span>
                                </span>
                                <Icon name="ChevronRight" size={16} className="text-stone-400" />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-sm text-stone-500 mt-1">Geen van je recepten gebruikt wat eerst op moet.</p>}
            {namen.length > 0 && <Button size="sm" variant="ghost" icon="Search" className="mt-2 -ml-2" onClick={() => zoekOnline(namen)}>Zoek online een recept met {namen.slice(0, 3).join(', ')}</Button>}
        </Card>
    );
}

// ---------- Restje bewaren ----------
const HOUDBAAR = [1, 2, 3, 4, 5];
export function RestjeSheet() {
    const { restje, closeRestje } = useUi();
    const { vriezers, lades, actions, canSee } = useStore();
    const locs = sortLocaties(vriezers.filter(v => v.type === 'frig' || v.type === 'vriezer'));
    const frigo = locs.find(v => v.type === 'frig') || locs[0];
    const [v, setV] = useState(null);
    const [busy, setBusy] = useState(false);
    if (!restje) return null;
    const s = v || { naam: '', porties: 2, vriezerId: frigo ? frigo.id : '', ladeId: '', dagen: 3, foto: '' };
    const set = (p) => setV({ ...s, ...p });
    const loc = vriezers.find(x => x.id === s.vriezerId);
    const inVriezer = loc && loc.type === 'vriezer';
    const close = () => { setV(null); closeRestje(); };
    const save = async () => {
        if (!s.naam.trim() || !s.vriezerId) return;
        setBusy(true);
        try {
            await actions.saveItem({
                naam: s.naam.trim(), aantal: s.porties, eenheid: 'porties', vriezerId: s.vriezerId, ladeId: s.ladeId, categorie: 'Restjes', emoji: '🥡',
                ingevrorenOp: todayKey(), houdbaarheidsDatum: inVriezer ? dateKey(addDays(new Date(), 90)) : dateKey(addDays(new Date(), s.dagen)),
                foto: s.foto, tags: ['restje'], notitie: ''
            });
            actions.track('restjes');
            close();
        } catch (e) { actions.notify('Bewaren mislukt: ' + e.message, 'error'); }
        setBusy(false);
    };
    return (
        <Sheet open onClose={close} title="Restje bewaren" subtitle="Je krijgt een seintje voor het op moet" size="sm"
            footer={<Button block icon="Check" disabled={busy || !s.naam.trim() || !s.vriezerId} onClick={save}>Bewaren</Button>}>
            <div className="space-y-4">
                <Field label="Wat is er over?"><Input autoFocus value={s.naam} onChange={e => set({ naam: e.target.value })} placeholder="Bv. Spaghetti bolognese" /></Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Porties"><Stepper value={s.porties} onChange={n => set({ porties: n })} min={1} max={20} /></Field>
                    <Field label="Waar?">
                        <Select value={s.vriezerId} onChange={e => set({ vriezerId: e.target.value, ladeId: '' })}>
                            {locs.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </Select>
                    </Field>
                </div>
                {lades.some(l => l.vriezerId === s.vriezerId) && (
                    <Field label="Lade of plank">
                        <Select value={s.ladeId} onChange={e => set({ ladeId: e.target.value })}>
                            <option value="">Geen</option>
                            {lades.filter(l => l.vriezerId === s.vriezerId).map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </Select>
                    </Field>
                )}
                {inVriezer ? <p className="text-sm text-sky-700 dark:text-sky-300 flex items-center gap-2"><Icon name="Snowflake" size={15} />In de vriezer blijft het tot 3 maanden goed.</p> : (
                    <Field label="Op eten binnen">
                        <div className="flex flex-wrap gap-1.5">
                            {HOUDBAAR.map(d => <Chip key={d} active={s.dagen === d} onClick={() => set({ dagen: d })}>{d} {d === 1 ? 'dag' : 'dagen'}</Chip>)}
                        </div>
                    </Field>
                )}
                {canSee('fotos') && (
                    <div className="flex items-center gap-3">
                        {s.foto && <img src={s.foto} alt="" className="w-14 h-14 rounded-xl object-cover" />}
                        <PhotoInput onPhoto={foto => set({ foto })} label="Foto van het restje" className="h-9 px-3 rounded-xl text-sm font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 flex items-center gap-2">
                            <Icon name="Camera" size={16} />{s.foto ? 'Andere foto' : 'Foto (optioneel)'}
                        </PhotoInput>
                    </div>
                )}
            </div>
        </Sheet>
    );
}
