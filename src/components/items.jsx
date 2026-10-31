import React, { useEffect, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Sheet, Button, Stepper, Badge, IconButton } from './ui.jsx';
import { TYPE_BY_ID } from '../lib/constants.js';
import {
    cx, num, emojiFor, formatAantal, formatDate, itemStatus, statusText, STATUS_TONE, STATUS_BAR,
    daysSince, formatAge, euro, weekdayLabel, parseDateKey, categoriesFor
} from '../lib/utils.js';

// Eén product in een lijst.
export function ItemRow({ item, type, showWhere, selectable, selected, onToggle, compact }) {
    const { locById, ladeById, owner, actions } = useStore();
    const { openItem, openRemove } = useUi();
    const st = itemStatus(item, type);
    const cat = categoriesFor(owner.customCategories, type).find(c => c.name === item.categorie);
    const loc = locById[item.vriezerId];
    const lade = ladeById[item.ladeId];
    const sText = statusText(st);
    const meta = [];
    if (showWhere) meta.push(`${loc ? loc.naam : '?'}${lade ? ' › ' + lade.naam : ''}`);
    else if (type === 'vriezer' && st.kind !== 'age' && item.ingevrorenOp) meta.push(`ingevroren ${formatDate(item.ingevrorenOp)}`);

    const quickUse = async (e) => {
        e.stopPropagation();
        const a = num(item.aantal, 1);
        if (a <= 1) { openRemove({ item, reason: 'consumed' }); return; }
        await actions.consume(item, 1);
    };

    return (
        <li className={cx('relative flex items-center gap-3 pl-4 pr-2 py-2.5 cursor-pointer select-none transition-colors',
            selected ? 'bg-teal-50 dark:bg-teal-950/40' : 'hover:bg-stone-50 dark:hover:bg-stone-800/50 active:bg-stone-100 dark:active:bg-stone-800')}
            onClick={() => selectable ? onToggle(item.id) : openItem(item.id)}>
            <span className={cx('absolute left-0 inset-y-0 w-1', STATUS_BAR[st.level])} aria-hidden="true" />
            {selectable && (
                <span className={cx('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0', selected ? 'bg-teal-600 border-teal-600 text-white' : 'border-stone-300 dark:border-stone-600')}>
                    {selected && <Icon name="Check" size={13} strokeWidth={3} />}
                </span>
            )}
            <span className="text-2xl w-8 text-center flex-shrink-0 leading-none" aria-hidden="true">{emojiFor(item)}</span>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-semibold text-[15px] text-stone-900 dark:text-stone-50 truncate">{item.naam}</p>
                    {!compact && item.geplandeDatum && <Icon name="Calendar" size={13} className="text-pink-500 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[13px] text-stone-500 dark:text-stone-400 leading-snug">
                    <span><span className="font-semibold text-stone-700 dark:text-stone-200 tabular-nums">{formatAantal(item.aantal)}</span> {item.eenheid}</span>
                    {sText && <span className={cx('font-medium', STATUS_TONE[st.level])}>{sText}</span>}
                    {!sText && item.houdbaarheidsDatum && !item.altijdGoed && <span>THT {formatDate(item.houdbaarheidsDatum)}</span>}
                    {meta.map(m => <span key={m} className="truncate">{m}</span>)}
                    {!compact && cat && item.categorie !== 'Geen' && <Badge color={cat.color}>{item.categorie}</Badge>}
                </div>
                {!compact && item.notitie && <p className="text-xs text-stone-400 dark:text-stone-500 truncate italic mt-0.5">{item.notitie}</p>}
            </div>
            {!selectable && (
                <button type="button" onClick={quickUse} aria-label={`Eén ${item.eenheid} ${item.naam} gebruiken`} title="Eén gebruiken"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/60 dark:hover:text-teal-300 flex-shrink-0 print:hidden">
                    <Icon name="Minus" size={18} strokeWidth={2.5} />
                </button>
            )}
        </li>
    );
}

// Detailweergave + acties van één product.
export function ItemSheet() {
    const { items, locById, ladeById, typeOf, owner, actions, canSee } = useStore();
    const { itemId, closeItem, openForm, openRemove, openMove, openPlan } = useUi();
    const item = items.find(i => i.id === itemId);
    const [amount, setAmount] = useState(1);
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (item) setAmount(Math.min(1, num(item.aantal, 1))); }, [itemId]);
    useEffect(() => { if (itemId && !item) closeItem(); }, [itemId, item]);
    if (!item) return null;

    const type = typeOf(item);
    const loc = locById[item.vriezerId];
    const lade = ladeById[item.ladeId];
    const st = itemStatus(item, type);
    const cat = categoriesFor(owner.customCategories, type).find(c => c.name === item.categorie);
    const all = num(amount) >= num(item.aantal, 1);

    const use = async () => {
        setBusy(true);
        try {
            const finished = await actions.consume(item, amount);
            closeItem();
            if (finished) openRemove({ item, reason: 'consumed' });
        } finally { setBusy(false); }
    };

    const facts = [
        ['Plaats', `${loc ? loc.naam : 'Onbekend'}${lade ? ' › ' + lade.naam : ''}`],
        type === 'vriezer' && item.ingevrorenOp ? ['Ingevroren', `${formatDate(item.ingevrorenOp)} · ${formatAge(daysSince(item.ingevrorenOp))}`] : null,
        type !== 'vriezer' && item.ingevrorenOp ? ['Toegevoegd', formatDate(item.ingevrorenOp)] : null,
        item.houdbaarheidsDatum && !item.altijdGoed ? ['Houdbaar tot', formatDate(item.houdbaarheidsDatum)] : null,
        item.altijdGoed ? ['Houdbaarheid', 'Altijd goed'] : null,
        num(item.minimumVoorraad) > 0 ? ['Minimum', `${formatAantal(item.minimumVoorraad)} ${item.eenheid}`] : null,
        num(item.prijs) > 0 ? ['Waarde', euro(item.prijs)] : null,
        item.geplandeDatum ? ['Op het menu', weekdayLabel(parseDateKey(item.geplandeDatum), { weekday: 'long', day: 'numeric', month: 'long' })] : null
    ].filter(Boolean);

    return (
        <Sheet open onClose={closeItem} title={null}>
            <div className="flex items-start gap-4">
                <span className="text-5xl leading-none mt-1" aria-hidden="true">{emojiFor(item)}</span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-stone-900 dark:text-white leading-tight break-words">{item.naam}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-stone-700 dark:text-stone-200"><span className="font-bold text-lg tabular-nums">{formatAantal(item.aantal)}</span> {item.eenheid}</span>
                        {cat && <Badge color={cat.color}>{item.categorie}</Badge>}
                        <Badge color="gray">{TYPE_BY_ID[type].label}</Badge>
                    </div>
                    {statusText(st) && <p className={cx('text-sm font-semibold mt-1', STATUS_TONE[st.level])}>{statusText(st)}</p>}
                </div>
            </div>

            <div className="mt-5 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 flex items-center gap-2">
                <Stepper value={amount} onChange={setAmount} min={0.25} max={num(item.aantal, 1)} className="w-36 flex-shrink-0" />
                <span className="text-sm text-stone-500 truncate flex-1">{item.eenheid}</span>
                <Button onClick={use} disabled={busy} icon={all ? 'Check' : 'Minus'}>{all ? 'Alles op' : 'Gebruik'}</Button>
            </div>

            <dl className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
                {facts.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2 text-sm">
                        <dt className="text-stone-500 dark:text-stone-400">{k}</dt>
                        <dd className="text-stone-800 dark:text-stone-100 font-medium text-right">{v}</dd>
                    </div>
                ))}
            </dl>
            {item.notitie && <p className="mt-3 text-sm text-stone-600 dark:text-stone-300 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2">{item.notitie}</p>}
            {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">{item.tags.map(t => <Badge key={t} color="indigo">{t}</Badge>)}</div>
            )}

            <div className="grid grid-cols-4 gap-2 mt-5">
                <ActionTile icon="Edit" label="Bewerk" onClick={() => { closeItem(); openForm({ item }); }} />
                <ActionTile icon="Copy" label="Kopie" onClick={() => { closeItem(); openForm({ duplicateOf: item }); }} />
                <ActionTile icon="Move" label="Verplaats" onClick={() => { closeItem(); openMove([item.id]); }} />
                {canSee('weekmenu')
                    ? <ActionTile icon="Calendar" label="Plan in" onClick={() => { closeItem(); openPlan({ item }); }} />
                    : <ActionTile icon="Cart" label="Op lijst" onClick={async () => { await actions.addShopping({ naam: item.naam, aantal: 1, eenheid: item.eenheid }); actions.notify('Op je boodschappenlijst gezet'); }} />}
            </div>
            <Button variant="danger-soft" block icon="Trash" className="mt-3" onClick={() => { closeItem(); openRemove({ item }); }}>Verwijderen</Button>
        </Sheet>
    );
}

function ActionTile({ icon, label, onClick }) {
    return (
        <button type="button" onClick={onClick} className="flex flex-col items-center justify-center gap-1 h-16 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold">
            <Icon name={icon} size={20} />{label}
        </button>
    );
}
