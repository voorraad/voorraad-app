import React, { useMemo, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Card, Button, Segmented, Sheet, Field, Input, Select, Textarea, EmptyState, IconButton, Stepper, Chip } from '../components/ui.jsx';
import { CATEGORIEEN_RECEPT, EENHEDEN_RECEPT } from '../lib/constants.js';
import { cx, mondayOf, addDays, dateKey, todayKey, weekdayLabel, emojiFor, formatAantal, isMenuEntry, ingredientMatches, num, round2, byName, smartMatch } from '../lib/utils.js';

export default function Menu() {
    const { canSee } = useStore();
    const { route, go } = useUi();
    const tabs = [canSee('weekmenu') && { id: 'week', label: 'Weekmenu', icon: 'Calendar' }, canSee('recepten') && { id: 'recepten', label: 'Recepten', icon: 'Book' }].filter(Boolean);
    if (!tabs.length) return <Card><EmptyState icon="Lock" title="Niet beschikbaar" text="Het weekmenu en de recepten zijn uitgeschakeld voor je account." /></Card>;
    const tab = tabs.some(t => t.id === route.sub) ? route.sub : tabs[0].id;
    return (
        <div className="space-y-4">
            {tabs.length > 1 && <Segmented value={tab} onChange={t => go('menu/' + t)} options={tabs} className="max-w-sm print:hidden" />}
            {tab === 'week' ? <Week /> : <Recipes />}
        </div>
    );
}

// ---------------- Weekmenu ----------------
function Week() {
    const { items, menuEntries, recepten, actions } = useStore();
    const { openPlan, openItem } = useUi();
    const [offset, setOffset] = useState(0);
    const [recipe, setRecipe] = useState(null);
    const mon = mondayOf(new Date(), offset);
    const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    const planned = [...menuEntries, ...items].filter(i => i.geplandeDatum);
    const label = offset === 0 ? 'Deze week' : offset === 1 ? 'Volgende week' : offset === -1 ? 'Vorige week' : `${weekdayLabel(mon, { day: 'numeric', month: 'short' })} – ${weekdayLabel(days[6], { day: 'numeric', month: 'short' })}`;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 print:hidden">
                <IconButton icon="ChevronLeft" label="Vorige week" onClick={() => setOffset(o => o - 1)} variant="outline" className="rounded-xl" />
                <button type="button" onClick={() => setOffset(0)} className="flex-1 h-10 rounded-xl font-semibold text-stone-800 dark:text-stone-100">{label}</button>
                <IconButton icon="ChevronRight" label="Volgende week" onClick={() => setOffset(o => o + 1)} variant="outline" className="rounded-xl" />
                <IconButton icon="Printer" label="Afdrukken" onClick={() => window.print()} variant="outline" className="rounded-xl hidden sm:inline-flex" />
            </div>
            <h2 className="hidden print:block text-xl font-bold">Weekmenu {label.toLowerCase()}</h2>
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {days.map(d => {
                    const k = dateKey(d);
                    const isToday = k === todayKey();
                    const list = planned.filter(i => i.geplandeDatum === k);
                    return (
                        <Card key={k} className={cx('p-3 print:break-inside-avoid', isToday && 'ring-2 ring-pink-400/70 border-transparent', k < todayKey() && !list.length && 'opacity-60')}>
                            <div className="flex items-center gap-2">
                                <p className={cx('font-bold', isToday ? 'text-pink-600 dark:text-pink-400' : 'text-stone-900 dark:text-white')}>{weekdayLabel(d)}</p>
                                <p className="text-xs text-stone-400 flex-1">{isToday ? 'vandaag · ' : ''}{d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}</p>
                                {list.length === 0 && <span className="text-sm text-stone-300 dark:text-stone-600 print:hidden">niets gepland</span>}
                                <IconButton icon="Plus" label={`Plannen op ${weekdayLabel(d)}`} onClick={() => openPlan({ date: d })} variant="soft" className="w-9 h-9 print:hidden" size={18} />
                            </div>
                            {list.length > 0 && <ul className="space-y-1 mt-2">
                                {list.map(i => {
                                    const rec = i.receptId && recepten.find(r => r.id === i.receptId);
                                    return (
                                        <li key={i.id} className="flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 pl-2">
                                            <button type="button" onClick={() => rec ? setRecipe(rec) : !isMenuEntry(i) && openItem(i.id)} className="flex-1 min-w-0 flex items-center gap-2 py-2 text-left">
                                                <span className="text-xl w-7 text-center">{emojiFor(i)}</span>
                                                <span className="min-w-0">
                                                    <span className="block font-medium truncate">{i.naam}</span>
                                                    {!isMenuEntry(i) && <span className="block text-xs text-stone-500">{formatAantal(i.aantal)} {i.eenheid} uit voorraad</span>}
                                                    {rec && <span className="block text-xs text-stone-500">recept</span>}
                                                </span>
                                            </button>
                                            <IconButton icon="X" label="Van menu halen" size={16} className="w-8 h-8 text-stone-400 print:hidden" onClick={() => actions.unplan(i)} />
                                        </li>
                                    );
                                })}
                            </ul>}
                        </Card>
                    );
                })}
            </div>
            <RecipeView recipe={recipe} onClose={() => setRecipe(null)} />
        </div>
    );
}

// ---------------- Recepten ----------------
const emptyRecipe = () => ({ naam: '', fotoUrl: '', personen: 4, categorie: 'Hoofdgerecht', ingredienten: [{ naam: '', aantal: '', eenheid: 'gram' }], stappen: [''] });

function Recipes() {
    const { recepten, items } = useStore();
    const [view, setView] = useState(null);
    const [edit, setEdit] = useState(null); // {data, id}
    const [q, setQ] = useState('');
    const [cat, setCat] = useState(null);

    const withStock = useMemo(() => recepten.map(r => {
        const ing = (r.ingredienten || []).filter(i => i.naam);
        const have = ing.filter(i => items.some(it => ingredientMatches(it.naam, i.naam))).length;
        return { r, have, total: ing.length };
    }), [recepten, items]);
    const cats = [...new Set(recepten.map(r => r.categorie || 'Ander'))];
    const shown = withStock.filter(x => smartMatch(x.r.naam, q) && (!cat || (x.r.categorie || 'Ander') === cat))
        .sort((a, b) => (b.total ? b.have / b.total : 0) - (a.total ? a.have / a.total : 0) || byName(a.r, b.r));

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Zoek een recept…" className="w-full h-11 pl-10 pr-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 outline-none focus:border-teal-500 text-[15px]" />
                </div>
                <Button icon="Plus" onClick={() => setEdit({ data: emptyRecipe() })}>Recept</Button>
            </div>
            {cats.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
                    <Chip active={!cat} onClick={() => setCat(null)}>Alles</Chip>
                    {cats.map(c => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
                </div>
            )}
            {recepten.length === 0 ? (
                <Card><EmptyState icon="Book" title="Nog geen recepten" text="Bewaar je favoriete gerechten. De app toont dan welke ingrediënten je al in huis hebt." action={<Button icon="Plus" onClick={() => setEdit({ data: emptyRecipe() })}>Eerste recept</Button>} /></Card>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {shown.map(({ r, have, total }) => (
                        <button key={r.id} type="button" onClick={() => setView(r)} className="text-left rounded-2xl overflow-hidden bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
                            <div className="aspect-[4/3] bg-stone-100 dark:bg-stone-800 bg-cover bg-center flex items-center justify-center text-stone-300 dark:text-stone-600" style={r.fotoUrl ? { backgroundImage: `url("${r.fotoUrl.replace(/"/g, '')}")` } : undefined}>
                                {!r.fotoUrl && <Icon name="Utensils" size={30} />}
                            </div>
                            <div className="p-3">
                                <p className="font-semibold text-sm leading-tight line-clamp-2 text-stone-900 dark:text-white">{r.naam}</p>
                                {total > 0 && <p className={cx('text-xs mt-1 font-medium', have === total ? 'text-emerald-600' : 'text-stone-500')}>{have}/{total} in huis</p>}
                            </div>
                        </button>
                    ))}
                </div>
            )}
            <RecipeView recipe={view && recepten.find(r => r.id === view.id)} onClose={() => setView(null)} onEdit={(r) => { setView(null); setEdit({ data: JSON.parse(JSON.stringify({ ...emptyRecipe(), ...r, fotoUrl: r.fotoUrl || '', ingredienten: r.ingredienten || [], stappen: r.stappen || [] })), id: r.id }); }} />
            {edit && <RecipeForm initial={edit.data} id={edit.id} onClose={() => setEdit(null)} />}
        </div>
    );
}

function RecipeView({ recipe, onClose, onEdit }) {
    const { items, shopping, actions, canSee } = useStore();
    const { confirm } = useUi();
    const [persons, setPersons] = useState(null);
    const [planning, setPlanning] = useState(false);
    if (!recipe) return null;
    const p = persons || recipe.personen || 4;
    const ratio = p / (recipe.personen || 4);
    const ing = (recipe.ingredienten || []).filter(i => i.naam).map(i => ({ ...i, inHuis: items.find(it => ingredientMatches(it.naam, i.naam)) }));
    const missing = ing.filter(i => !i.inHuis && !shopping.some(s => !s.checked && ingredientMatches(s.naam, i.naam)));
    const close = () => { setPersons(null); setPlanning(false); onClose(); };
    const addMissing = async () => {
        for (const i of missing) await actions.addShopping({ naam: i.naam, aantal: i.aantal ? round2(num(i.aantal) * ratio) || 1 : 1, eenheid: i.eenheid === 'naar smaak' ? 'stuks' : i.eenheid });
        actions.notify(`${missing.length} ingrediënten op je lijstje gezet`);
    };
    return (
        <Sheet open onClose={close} size="lg" title={recipe.naam} subtitle={recipe.categorie}>
            {recipe.fotoUrl && <div className="-mx-5 -mt-1 mb-4 h-48 sm:h-60 bg-cover bg-center" style={{ backgroundImage: `url("${recipe.fotoUrl.replace(/"/g, '')}")` }} />}
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
                <span className="font-semibold">Personen</span>
                <Stepper value={p} onChange={v => setPersons(Math.max(1, Math.round(num(v, 1))))} min={1} step={1} size="sm" className="w-32" />
            </div>
            <h3 className="font-semibold mt-5 mb-2">Ingrediënten</h3>
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {ing.map((i, idx) => (
                    <li key={idx} className="flex items-center gap-3 py-2">
                        <span className={cx('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0', i.inHuis ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-stone-100 dark:bg-stone-800')}>{i.inHuis && <Icon name="Check" size={12} strokeWidth={3} />}</span>
                        <span className="flex-1">{i.naam}{i.inHuis && <span className="text-xs text-stone-400 ml-1.5">in huis</span>}</span>
                        <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 tabular-nums">{i.aantal !== '' && i.aantal != null ? formatAantal(round2(num(i.aantal) * ratio)) + ' ' : ''}{i.eenheid}</span>
                    </li>
                ))}
            </ul>
            <div className="flex flex-wrap gap-2 mt-3">
                {missing.length > 0 && <Button size="sm" variant="soft" icon="Cart" onClick={addMissing}>{missing.length} ontbrekende op lijstje</Button>}
                {canSee('weekmenu') && <Button size="sm" variant="secondary" icon="Calendar" onClick={() => setPlanning(v => !v)}>Inplannen</Button>}
            </div>
            {planning && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3">
                    {Array.from({ length: 8 }, (_, n) => addDays(new Date(), n)).map(d => (
                        <button key={dateKey(d)} type="button" onClick={async () => { await actions.addMenuEntry(dateKey(d), recipe.naam, { receptId: recipe.id, emoji: '📖' }); actions.notify(`Ingepland op ${weekdayLabel(d).toLowerCase()}`); setPlanning(false); }}
                            className="h-10 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-pink-50 dark:hover:bg-pink-950/40 text-sm font-medium">{dateKey(d) === todayKey() ? 'Vandaag' : weekdayLabel(d, { weekday: 'short', day: 'numeric' })}</button>
                    ))}
                </div>
            )}
            {(recipe.stappen || []).length > 0 && (
                <>
                    <h3 className="font-semibold mt-6 mb-2">Bereiding</h3>
                    <ol className="space-y-3">
                        {recipe.stappen.map((s, i) => (
                            <li key={i} className="flex gap-3"><span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span><p className="text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">{s}</p></li>
                        ))}
                    </ol>
                </>
            )}
            {onEdit && (
                <div className="flex gap-2 mt-6">
                    <Button variant="danger-soft" icon="Trash" onClick={async () => { if (await confirm({ title: 'Recept verwijderen?', message: recipe.naam, confirmLabel: 'Verwijderen', danger: true })) { await actions.deleteRecipe(recipe); close(); } }}>Verwijder</Button>
                    <Button variant="secondary" icon="Edit" className="flex-1" onClick={() => onEdit(recipe)}>Bewerken</Button>
                </div>
            )}
        </Sheet>
    );
}

function RecipeForm({ initial, id, onClose }) {
    const { actions } = useStore();
    const [r, setR] = useState(initial);
    const [saving, setSaving] = useState(false);
    const set = (patch) => setR(x => ({ ...x, ...patch }));
    const setIng = (idx, patch) => set({ ingredienten: r.ingredienten.map((i, j) => j === idx ? { ...i, ...patch } : i) });
    const setStep = (idx, val) => set({ stappen: r.stappen.map((s, j) => j === idx ? val : s) });
    const save = async () => {
        if (!r.naam.trim()) return;
        setSaving(true);
        try { await actions.saveRecipe(r, id); onClose(); } catch (e) { actions.notify('Opslaan mislukt', 'error'); } finally { setSaving(false); }
    };
    return (
        <Sheet open onClose={onClose} size="lg" title={id ? 'Recept bewerken' : 'Nieuw recept'} footer={
            <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Annuleren</Button><Button className="flex-1" icon="Check" onClick={save} disabled={saving || !r.naam.trim()}>Opslaan</Button></div>
        }>
            <div className="space-y-4">
                <Field label="Naam"><Input value={r.naam} onChange={e => set({ naam: e.target.value })} placeholder="Bv. Spaghetti bolognese" autoFocus={!id} /></Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Categorie"><Select value={r.categorie} onChange={e => set({ categorie: e.target.value })}>{CATEGORIEEN_RECEPT.map(c => <option key={c}>{c}</option>)}</Select></Field>
                    <Field group label="Personen"><Stepper value={r.personen} onChange={v => set({ personen: v })} min={1} step={1} /></Field>
                </div>
                <Field label="Foto (link, optioneel)"><Input value={r.fotoUrl} onChange={e => set({ fotoUrl: e.target.value })} placeholder="https://…" inputMode="url" /></Field>
                <div>
                    <p className="text-xs font-semibold text-stone-500 mb-1.5">Ingrediënten</p>
                    <div className="space-y-2">
                        {r.ingredienten.map((i, idx) => (
                            <div key={idx} className="flex gap-1.5">
                                <Input value={i.naam} onChange={e => setIng(idx, { naam: e.target.value })} placeholder="Ingrediënt" className="flex-1 min-w-0" />
                                <Input value={i.aantal} onChange={e => setIng(idx, { aantal: e.target.value.replace(',', '.') })} placeholder="#" inputMode="decimal" className="w-16 text-center px-1" />
                                <div className="w-28"><Select value={i.eenheid} onChange={e => setIng(idx, { eenheid: e.target.value })} className="px-2">{EENHEDEN_RECEPT.map(u => <option key={u}>{u}</option>)}{!EENHEDEN_RECEPT.includes(i.eenheid) && <option>{i.eenheid}</option>}</Select></div>
                                <IconButton icon="X" label="Verwijder ingrediënt" size={16} onClick={() => set({ ingredienten: r.ingredienten.filter((_, j) => j !== idx) })} className="w-11 h-11 text-stone-400" />
                            </div>
                        ))}
                    </div>
                    <Button size="sm" variant="ghost" icon="Plus" className="mt-1" onClick={() => set({ ingredienten: [...r.ingredienten, { naam: '', aantal: '', eenheid: 'gram' }] })}>Ingrediënt</Button>
                </div>
                <div>
                    <p className="text-xs font-semibold text-stone-500 mb-1.5">Bereiding</p>
                    <div className="space-y-2">
                        {r.stappen.map((s, idx) => (
                            <div key={idx} className="flex gap-1.5 items-start">
                                <span className="w-6 h-6 mt-2.5 rounded-full bg-stone-100 dark:bg-stone-800 text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                                <Textarea rows={2} value={s} onChange={e => setStep(idx, e.target.value)} placeholder="Beschrijf de stap…" className="flex-1 min-h-[64px]" />
                                <IconButton icon="X" label="Verwijder stap" size={16} onClick={() => set({ stappen: r.stappen.filter((_, j) => j !== idx) })} className="w-11 h-11 text-stone-400" />
                            </div>
                        ))}
                    </div>
                    <Button size="sm" variant="ghost" icon="Plus" className="mt-1" onClick={() => set({ stappen: [...r.stappen, ''] })}>Stap</Button>
                </div>
            </div>
        </Sheet>
    );
}
