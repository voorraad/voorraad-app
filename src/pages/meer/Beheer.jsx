import React, { useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { useStore } from '../../state/store.jsx';
import { useUi } from '../../state/ui.jsx';
import { Card, Button, Segmented, Input, IconButton, Select, ColorPicker } from '../../components/ui.jsx';
import { TYPES, TYPE_BY_ID, LOC_DOT, LOC_COLOR_KEYS, COLOR_KEYS, DOT, ALL_DEFAULT_CAT_NAMES, EENHEDEN, UNIT_FIELD } from '../../lib/constants.js';
import { cx, sortLocaties, byName, categoriesFor, unitsFor, formatDate, toDate } from '../../lib/utils.js';

const LOC_NAMES = { blue: 'Groenblauw', purple: 'Paars', pink: 'Roze', orange: 'Oranje', green: 'Groen', red: 'Rood', gray: 'Grijs', teal: 'Cyaan', indigo: 'Indigo', yellow: 'Geel' };
const move = (arr, i, dir) => { const a = [...arr]; const j = i + dir; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

function OrderButtons({ i, n, onMove }) {
    return (
        <div className="flex flex-col -my-1">
            <button type="button" aria-label="Omhoog" disabled={i === 0} onClick={() => onMove(i, -1)} className="h-5 w-7 flex items-center justify-center text-stone-400 hover:text-stone-700 disabled:opacity-25"><Icon name="ChevronUp" size={16} /></button>
            <button type="button" aria-label="Omlaag" disabled={i === n - 1} onClick={() => onMove(i, 1)} className="h-5 w-7 flex items-center justify-center text-stone-400 hover:text-stone-700 disabled:opacity-25"><Icon name="ChevronDown" size={16} /></button>
        </div>
    );
}

// ---------------- Locaties & lades ----------------
export function Locaties() {
    const { vriezers, lades, items, canSee, actions } = useStore();
    const { prompt, confirm } = useUi();
    const [type, setType] = useState('vriezer');
    const [openLoc, setOpenLoc] = useState(null);
    const types = TYPES.filter(t => t.id === 'vriezer' || canSee(t.id));
    const locs = sortLocaties(vriezers.filter(v => v.type === type));
    const groups = [...new Set(vriezers.map(v => v.locatieGroep || 'Thuis'))];

    const addLoc = async () => {
        const naam = await prompt({ title: `Nieuwe ${TYPE_BY_ID[type].label.toLowerCase()}`, placeholder: 'Naam' });
        if (naam) { const id = await actions.addLocatie({ naam, type, locatieGroep: groups.length > 1 ? (locs[0] && locs[0].locatieGroep) || 'Thuis' : 'Thuis' }); setOpenLoc(id); }
    };
    const renameLoc = async (l) => { const naam = await prompt({ title: 'Locatie hernoemen', value: l.naam }); if (naam) actions.updateLocatie(l, { naam }); };
    const regroup = async (l) => { const g = await prompt({ title: 'Plaats (groep)', message: 'Bv. Thuis, Vakantiehuis, Garage. Locaties met dezelfde plaats worden samen getoond.', value: l.locatieGroep || 'Thuis' }); if (g) actions.updateLocatie(l, { locatieGroep: g }); };
    const delLoc = async (l) => { if (await confirm({ title: `${l.naam} verwijderen?`, confirmLabel: 'Verwijderen', danger: true })) actions.deleteLocatie(l); };
    const addLade = async (l) => { const naam = await prompt({ title: `Nieuwe lade in ${l.naam}`, placeholder: 'Bv. Lade 1, Bovenste plank' }); if (naam) actions.addLade(l.id, naam); };
    const renameLade = async (ld) => { const naam = await prompt({ title: 'Lade hernoemen', value: ld.naam }); if (naam) actions.renameLade(ld, naam); };
    const delLade = async (ld) => { if (await confirm({ title: `${ld.naam} verwijderen?`, confirmLabel: 'Verwijderen', danger: true })) actions.deleteLade(ld); };

    return (
        <div className="space-y-4">
            <Segmented value={type} onChange={t => { setType(t); setOpenLoc(null); }} options={types.map(t => ({ id: t.id, label: t.label, icon: t.icon }))} />
            <Card className="overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                {locs.length === 0 && <p className="p-4 text-sm text-stone-500">Nog geen {TYPE_BY_ID[type].label.toLowerCase()}.</p>}
                {locs.map((l, i) => {
                    const ls = lades.filter(x => x.vriezerId === l.id).sort(byName);
                    const n = items.filter(it => it.vriezerId === l.id).length;
                    const open = openLoc === l.id;
                    return (
                        <div key={l.id}>
                            <div className="flex items-center gap-2 px-2 py-2">
                                <OrderButtons i={i} n={locs.length} onMove={(i, d) => actions.reorderLocaties(move(locs, i, d))} />
                                <ColorPicker value={l.color || 'blue'} colors={LOC_DOT} names={LOC_NAMES} onChange={k => actions.updateLocatie(l, { color: k })} label={`Kleur van ${l.naam}`} />
                                <button type="button" onClick={() => setOpenLoc(open ? null : l.id)} className="flex-1 min-w-0 text-left py-1">
                                    <span className="block font-semibold truncate">{l.naam}</span>
                                    <span className="block text-xs text-stone-500">{groups.length > 1 ? (l.locatieGroep || 'Thuis') + ' · ' : ''}{ls.length} lades · {n} producten</span>
                                </button>
                                <IconButton icon={open ? 'ChevronUp' : 'ChevronDown'} label="Lades tonen" onClick={() => setOpenLoc(open ? null : l.id)} />
                            </div>
                            {open && (
                                <div className="bg-stone-50 dark:bg-stone-800/40 px-3 pb-3 pt-1 space-y-1">
                                    <div className="flex flex-wrap gap-1.5 pb-2">
                                        <Button size="sm" variant="secondary" icon="Edit" onClick={() => renameLoc(l)}>Hernoem</Button>
                                        <Button size="sm" variant="secondary" icon="Home" onClick={() => regroup(l)}>Plaats</Button>
                                        <Button size="sm" variant="danger-soft" icon="Trash" onClick={() => delLoc(l)}>Verwijder</Button>
                                    </div>
                                    {ls.map(ld => (
                                        <div key={ld.id} className="flex items-center gap-2 bg-white dark:bg-stone-900 rounded-xl pl-3 pr-1 py-1">
                                            <span className="flex-1 min-w-0"><span className="block text-sm font-medium truncate">{ld.naam}</span><span className="block text-xs text-stone-400">{items.filter(it => it.ladeId === ld.id).length} producten{ld.laatstGecontroleerd ? ' · gecontroleerd ' + formatDate(ld.laatstGecontroleerd) : ''}</span></span>
                                            <IconButton icon="Edit" label="Hernoem lade" size={16} onClick={() => renameLade(ld)} />
                                            <IconButton icon="Trash" label="Verwijder lade" size={16} className="text-red-500" onClick={() => delLade(ld)} />
                                        </div>
                                    ))}
                                    <Button size="sm" variant="ghost" icon="Plus" onClick={() => addLade(l)}>Lade toevoegen</Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </Card>
            <Button icon="Plus" variant="secondary" block onClick={addLoc}>{TYPE_BY_ID[type].label} toevoegen</Button>
        </div>
    );
}

// ---------------- Categorieën ----------------
export function Categorieen() {
    const { owner, items, actions } = useStore();
    const { prompt, confirm } = useUi();
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('gray');
    // Toon de eigen lijst + standaardcategorieën van alle types die er nog niet in staan.
    const list = [...categoriesFor(owner.customCategories, 'vriezer'), ...categoriesFor([], 'frig'), ...categoriesFor([], 'voorraad')]
        .filter((c, i, a) => a.findIndex(x => x.name === c.name) === i);
    const save = (l) => actions.setCategories(l);
    const add = async (e) => {
        e.preventDefault();
        const n = newName.trim();
        if (!n || list.some(c => c.name.toLowerCase() === n.toLowerCase())) return;
        await save([...list, { name: n, color: newColor }]); setNewName('');
    };
    const rename = async (c) => {
        const n = await prompt({ title: 'Categorie hernoemen', value: c.name, message: 'Producten in deze categorie worden mee aangepast.' });
        if (n && n !== c.name) actions.renameCategory(list, c.name, n, c.color);
    };
    const del = async (c) => {
        const n = items.filter(i => i.categorie === c.name).length;
        if (await confirm({ title: `Categorie ${c.name} verwijderen?`, message: n ? `${n} producten houden deze categorie tot je ze aanpast.` : undefined, confirmLabel: 'Verwijderen', danger: true }))
            save(list.filter(x => x.name !== c.name));
    };
    return (
        <div className="space-y-4">
            <Card className="overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                {list.map((c, i) => {
                    const isDefault = ALL_DEFAULT_CAT_NAMES.has(c.name);
                    return (
                        <div key={c.name} className="flex items-center gap-2 px-2 py-1.5">
                            <OrderButtons i={i} n={list.length} onMove={(i, d) => save(move(list, i, d))} />
                            <ColorPicker value={c.color || 'gray'} colors={DOT} onChange={k => save(list.map(x => x.name === c.name ? { ...x, color: k } : x))} label={`Kleur van ${c.name}`} />
                            <span className="flex-1 font-medium truncate py-2">{c.name}</span>
                            {!isDefault && <IconButton icon="Edit" label="Hernoem" size={16} onClick={() => rename(c)} />}
                            {!isDefault && <IconButton icon="Trash" label="Verwijder" size={16} className="text-red-500" onClick={() => del(c)} />}
                            {isDefault && <span className="text-[11px] text-stone-400 pr-2">standaard</span>}
                        </div>
                    );
                })}
            </Card>
            <form onSubmit={add} className="flex gap-2">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nieuwe categorie" className="flex-1" />
                <ColorPicker value={newColor} colors={DOT} onChange={setNewColor} size="lg" label="Kleur van nieuwe categorie" />
                <Button type="submit" icon="Plus" disabled={!newName.trim()} aria-label="Toevoegen" />
            </form>
        </div>
    );
}

// ---------------- Eenheden ----------------
export function Eenheden() {
    const { owner, canSee, actions } = useStore();
    const { prompt, confirm } = useUi();
    const [type, setType] = useState('vriezer');
    const [newUnit, setNewUnit] = useState('');
    const custom = owner[UNIT_FIELD[type]] || (type === 'vriezer' ? owner.customUnits : null) || [];
    const list = unitsFor(custom, type);
    const types = TYPES.filter(t => t.id === 'vriezer' || canSee(t.id));
    const add = async (e) => {
        e.preventDefault();
        const u = newUnit.trim().toLowerCase();
        if (!u || list.includes(u)) return;
        await actions.setUnits(type, [...list, u]); setNewUnit('');
    };
    return (
        <div className="space-y-4">
            <Segmented value={type} onChange={setType} options={types.map(t => ({ id: t.id, label: t.label, icon: t.icon }))} />
            <Card className="overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                {list.map((u, i) => {
                    const isDefault = EENHEDEN[type].includes(u);
                    return (
                        <div key={u} className="flex items-center gap-2 px-2 py-1.5">
                            <OrderButtons i={i} n={list.length} onMove={(i, d) => actions.setUnits(type, move(list, i, d))} />
                            <span className="flex-1 font-medium">{u}</span>
                            {!isDefault && <IconButton icon="Edit" label="Hernoem" size={16} onClick={async () => { const n = await prompt({ title: 'Eenheid hernoemen', value: u }); if (n && n !== u) actions.renameUnit(type, list, u, n.toLowerCase()); }} />}
                            {!isDefault && <IconButton icon="Trash" label="Verwijder" size={16} className="text-red-500" onClick={async () => { if (await confirm({ title: `Eenheid "${u}" verwijderen?`, confirmLabel: 'Verwijderen', danger: true })) actions.setUnits(type, list.filter(x => x !== u)); }} />}
                            {isDefault && <span className="text-[11px] text-stone-400 pr-2">standaard</span>}
                        </div>
                    );
                })}
            </Card>
            <form onSubmit={add} className="flex gap-2">
                <Input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder={`Nieuwe eenheid voor ${TYPE_BY_ID[type].label.toLowerCase()}`} className="flex-1" />
                <Button type="submit" icon="Plus" disabled={!newUnit.trim()} aria-label="Toevoegen" />
            </form>
        </div>
    );
}
