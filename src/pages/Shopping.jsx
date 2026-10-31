import React, { useMemo, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Card, Button, Input, Select, Stepper, EmptyState, IconButton, SectionTitle, StoreIcon, StorePicker } from '../components/ui.jsx';
import { WINKELS, DOT } from '../lib/constants.js';
import { cx, formatAantal, normalize, num, emojiFor, byName } from '../lib/utils.js';

const NO_SHOP = 'Zonder winkel';

export default function Shopping() {
    const { shopping, items, typeOf, actions } = useStore();
    const { openForm, confirm } = useUi();
    const [naam, setNaam] = useState('');
    const [aantal, setAantal] = useState(1);
    const [winkel, setWinkel] = useState(() => localStorage.getItem('voorraad_winkel') || '');
    const [showDone, setShowDone] = useState(true);

    const add = async (e) => {
        e.preventDefault();
        if (!naam.trim()) return;
        await actions.addShopping({ naam, aantal, winkel, eenheid: (items.find(i => normalize(i.naam) === normalize(naam)) || {}).eenheid || 'stuks' });
        setNaam(''); setAantal(1);
        localStorage.setItem('voorraad_winkel', winkel);
    };

    const open = shopping.filter(s => !s.checked);
    const done = shopping.filter(s => s.checked).sort(byName);
    const grouped = useMemo(() => {
        const m = {};
        open.forEach(s => { const k = s.winkel || NO_SHOP; (m[k] = m[k] || []).push(s); });
        return Object.entries(m).sort(([a], [b]) => (a === NO_SHOP) - (b === NO_SHOP) || a.localeCompare(b)).map(([k, list]) => [k, list.sort(byName)]);
    }, [shopping]);

    const low = useMemo(() => {
        const totals = new Map();
        items.forEach(i => {
            const k = normalize(i.naam);
            const t = totals.get(k) || { item: i, total: 0, min: 0 };
            t.total += num(i.aantal); t.min = Math.max(t.min, num(i.minimumVoorraad));
            totals.set(k, t);
        });
        const on = new Set(open.map(s => normalize(s.naam)));
        return [...totals.values()].filter(t => t.min > 0 && t.total <= t.min && !on.has(normalize(t.item.naam)));
    }, [items, shopping]);

    const nameList = useMemo(() => [...new Set(items.map(i => i.naam))].sort(), [items]);

    const text = () => {
        let t = '🛒 Boodschappenlijst\n';
        grouped.forEach(([w, list]) => {
            t += `\n${w === NO_SHOP ? 'Overig' : w}\n`;
            list.forEach(s => { t += `- ${formatAantal(s.aantal)} ${s.eenheid || ''} ${s.naam}`.replace(/\s+/g, ' ') + '\n'; });
        });
        return t;
    };
    const share = async () => {
        if (navigator.share) { try { await navigator.share({ title: 'Boodschappenlijst', text: text() }); } catch (e) { } return; }
        try { await navigator.clipboard.writeText(text()); actions.notify('Lijstje gekopieerd'); }
        catch (e) { window.open('https://wa.me/?text=' + encodeURIComponent(text()), '_blank', 'noopener'); }
    };

    const toStock = (s) => {
        const known = items.find(i => normalize(i.naam) === normalize(s.naam));
        openForm({
            type: known ? typeOf(known) : 'voorraad',
            prefill: { naam: s.naam, aantal: num(s.aantal, 1), eenheid: s.eenheid || 'stuks', ...(known ? { vriezerId: known.vriezerId, ladeId: known.ladeId || '', categorie: known.categorie } : {}) },
            fromShoppingId: s.id, nonce: Date.now()
        });
    };

    return (
        <div className="space-y-5 max-w-2xl">
            <form onSubmit={add} className="space-y-2">
                <div className="flex gap-2">
                    <Input list="shop-names" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Wat moet je kopen?" className="flex-1" />
                    <datalist id="shop-names">{nameList.map(n => <option key={n} value={n} />)}</datalist>
                    <Button type="submit" icon="Plus" disabled={!naam.trim()} aria-label="Toevoegen" className="px-3 sm:px-4"><span className="hidden sm:inline">Toevoegen</span></Button>
                </div>
                <Stepper value={aantal} onChange={setAantal} min={0.25} size="sm" className="w-32" />
                <StorePicker value={winkel} onChange={setWinkel} className="-mx-4 px-4" />
            </form>

            {low.length > 0 && (
                <div>
                    <SectionTitle>Bijna op</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                        {low.map(({ item, total, min }) => (
                            <button key={item.id} type="button" onClick={() => actions.addShopping({ naam: item.naam, aantal: Math.max(1, min - total), eenheid: item.eenheid, winkel })}
                                className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-sm font-medium hover:border-teal-400">
                                <span>{emojiFor(item)}</span>{item.naam}<Icon name="Plus" size={14} className="text-teal-600" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {shopping.length === 0 ? (
                <Card><EmptyState icon="Cart" title="Je lijstje is leeg" text="Voeg hierboven iets toe. Producten met een minimum voorraad komen er vanzelf op." /></Card>
            ) : (
                <>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-stone-500 flex-1">{open.length} te kopen</p>
                        <Button size="sm" variant="secondary" icon="Share" onClick={share} disabled={!open.length}>Delen</Button>
                        <Button size="sm" variant="secondary" icon="Message" onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(text()), '_blank', 'noopener')} disabled={!open.length} aria-label="WhatsApp"><span className="hidden sm:inline">WhatsApp</span></Button>
                    </div>
                    {grouped.map(([w, list]) => {
                        const wObj = WINKELS.find(x => x.name === w);
                        return (
                            <section key={w}>
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-500 dark:text-stone-400 mb-1.5 px-1">
                                    {w === NO_SHOP ? <span className={cx('w-2 h-2 rounded-full mx-1.5', DOT.gray)} /> : <StoreIcon name={w} size={22} />}{w}
                                </h3>
                                <Card className="overflow-hidden"><ul className="divide-y divide-stone-100 dark:divide-stone-800">
                                    {list.map(s => <ShopRow key={s.id} s={s} onToggle={() => actions.toggleShopping(s)} onStock={() => toStock(s)} onDelete={() => actions.deleteShopping(s)} />)}
                                </ul></Card>
                            </section>
                        );
                    })}
                    {done.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-1.5 px-1">
                                <button type="button" onClick={() => setShowDone(s => !s)} className="flex items-center gap-1 text-sm font-semibold text-stone-500"><Icon name={showDone ? 'ChevronDown' : 'ChevronRight'} size={16} />In je kar ({done.length})</button>
                                <button type="button" onClick={async () => { if (await confirm({ title: 'Afgevinkte items wissen?', confirmLabel: 'Wissen', danger: true })) actions.clearCheckedShopping(); }} className="text-sm font-semibold text-red-600">Wis afgevinkt</button>
                            </div>
                            {showDone && <Card className="overflow-hidden"><ul className="divide-y divide-stone-100 dark:divide-stone-800">
                                {done.map(s => <ShopRow key={s.id} s={s} onToggle={() => actions.toggleShopping(s)} onStock={() => toStock(s)} onDelete={() => actions.deleteShopping(s)} />)}
                            </ul></Card>}
                            <p className="text-xs text-stone-400 mt-2 px-1">Tip: tik op <Icon name="Box" size={12} className="inline" /> om een gekocht product meteen in je voorraad te zetten.</p>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

function ShopRow({ s, onToggle, onStock, onDelete }) {
    return (
        <li className="flex items-center gap-1 pl-3 pr-1.5">
            <button type="button" onClick={onToggle} className="flex-1 min-w-0 flex items-center gap-3 py-3 text-left" aria-pressed={!!s.checked}>
                <span className={cx('w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors', s.checked ? 'bg-teal-600 border-teal-600 text-white' : 'border-stone-300 dark:border-stone-600')}>
                    {s.checked && <Icon name="Check" size={14} strokeWidth={3} />}
                </span>
                <span className={cx('truncate text-[15px]', s.checked ? 'line-through text-stone-400' : 'text-stone-900 dark:text-stone-100')}>
                    {num(s.aantal) > 0 && <span className={cx('font-semibold mr-1.5 tabular-nums', !s.checked && 'text-teal-700 dark:text-teal-300')}>{formatAantal(s.aantal)}{s.eenheid && s.eenheid !== 'stuks' ? ' ' + s.eenheid : '×'}</span>}
                    {s.naam}
                </span>
            </button>
            <IconButton icon="Box" label="In voorraad zetten" onClick={onStock} size={18} className={cx(s.checked ? 'text-teal-700 dark:text-teal-300' : 'text-stone-400')} />
            <IconButton icon="X" label="Verwijderen" onClick={onDelete} size={18} className="text-stone-400" />
        </li>
    );
}
