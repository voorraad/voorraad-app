import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { db } from '../../lib/firebase.js';
import { useStore } from '../../state/store.jsx';
import { Card, Segmented, EmptyState, Chip } from '../../components/ui.jsx';
import { TYPES } from '../../lib/constants.js';
import { cx, num, euro, formatDateTime, itemStatus, categoriesFor } from '../../lib/utils.js';
import { DOT } from '../../lib/constants.js';

export function Statistieken() {
    const { stats, items, typeOf, owner, canSee } = useStore();
    const value = items.reduce((s, i) => s + num(i.prijs), 0);
    const total = stats.consumed + stats.wasted;
    const wastePct = total ? Math.round((stats.wasted / total) * 100) : 0;
    const urgentCount = items.filter(i => ['expired', 'veryold'].includes(itemStatus(i, typeOf(i)).level)).length;
    const byCat = useMemo(() => {
        const m = {};
        items.forEach(i => { m[i.categorie || 'Ander'] = (m[i.categorie || 'Ander'] || 0) + 1; });
        return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
    }, [items]);
    const cats = categoriesFor(owner.customCategories, 'vriezer').concat(categoriesFor([], 'frig'), categoriesFor([], 'voorraad'));
    const maxCat = byCat.length ? byCat[0][1] : 1;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Producten in huis" value={items.length} />
                <Stat label="Voorraadwaarde" value={euro(value)} />
                <Stat label="Opgegeten" value={stats.consumed} sub={stats.consumedValue ? euro(stats.consumedValue) : null} tone="text-emerald-600" />
                <Stat label="Weggegooid" value={stats.wasted} sub={stats.wastedValue ? euro(stats.wastedValue) : null} tone="text-red-600" />
            </div>
            <Card className="p-4">
                <div className="flex justify-between items-baseline mb-2">
                    <p className="font-semibold">Verspilling</p>
                    <p className={cx('text-2xl font-bold tabular-nums', wastePct > 20 ? 'text-red-600' : wastePct > 10 ? 'text-amber-600' : 'text-emerald-600')}>{total ? wastePct + '%' : '–'}</p>
                </div>
                <div className="h-3 rounded-full bg-emerald-200 dark:bg-emerald-900/60 overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: wastePct + '%' }} />
                </div>
                <p className="text-xs text-stone-500 mt-2">{total ? `Van de ${total} keer dat je iets opgebruikte of weggooide, belandde ${stats.wasted}× iets in de vuilbak.` : 'Nog geen gegevens. Dit wordt bijgehouden wanneer je producten gebruikt of verwijdert.'}</p>
                {urgentCount > 0 && <p className="text-sm text-red-600 mt-3 flex items-center gap-1.5"><Icon name="Alert" size={16} />{urgentCount} producten zijn nu verlopen of te lang ingevroren.</p>}
            </Card>
            <Card className="p-4">
                <p className="font-semibold mb-3">Per type</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                    {TYPES.filter(t => t.id === 'vriezer' || canSee(t.id)).map(t => (
                        <div key={t.id} className="rounded-xl bg-stone-50 dark:bg-stone-800/60 py-3">
                            <Icon name={t.icon} size={18} className="mx-auto text-stone-400" />
                            <p className="text-xl font-bold mt-1 tabular-nums">{items.filter(i => typeOf(i) === t.id).length}</p>
                            <p className="text-xs text-stone-500">{t.label}</p>
                        </div>
                    ))}
                </div>
            </Card>
            {byCat.length > 0 && (
                <Card className="p-4">
                    <p className="font-semibold mb-3">Meeste producten per categorie</p>
                    <ul className="space-y-2">
                        {byCat.map(([c, n]) => {
                            const col = (cats.find(x => x.name === c) || {}).color || 'gray';
                            return (
                                <li key={c} className="flex items-center gap-3 text-sm">
                                    <span className="w-24 truncate">{c}</span>
                                    <span className="flex-1 h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden"><span className={cx('block h-full rounded-full', DOT[col] || DOT.gray)} style={{ width: (n / maxCat) * 100 + '%' }} /></span>
                                    <span className="w-8 text-right tabular-nums text-stone-500">{n}</span>
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            )}
        </div>
    );
}

function Stat({ label, value, sub, tone }) {
    return (
        <Card className="p-4">
            <p className="text-xs font-semibold text-stone-500">{label}</p>
            <p className={cx('text-2xl font-bold mt-1 tabular-nums', tone || 'text-stone-900 dark:text-white')}>{value}</p>
            {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
        </Card>
    );
}

export function Logboek() {
    const { isAdmin, ownerId, user } = useStore();
    const [logs, setLogs] = useState(null);
    const [onlyThis, setOnlyThis] = useState(true);
    useEffect(() => {
        const q = isAdmin
            ? db.collection('logs').orderBy('timestamp', 'desc').limit(150)
            : db.collection('logs').where('targetUserId', '==', ownerId).orderBy('timestamp', 'desc').limit(60);
        return q.onSnapshot(s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))), (e) => { console.warn(e); setLogs([]); });
    }, [isAdmin, ownerId]);
    if (!logs) return <div className="h-40 rounded-2xl bg-stone-200/60 dark:bg-stone-800/60 animate-pulse" />;
    const shown = isAdmin && onlyThis ? logs.filter(l => l.targetUserId === ownerId) : logs;
    const tone = (a) => a === 'Toevoegen' ? ['Plus', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300']
        : a === 'Verwijderd' ? ['Trash', 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300']
            : a === 'Geconsumeerd' ? ['Utensils', 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300']
                : ['Edit', 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'];
    return (
        <div className="space-y-3">
            {isAdmin && (
                <div className="flex gap-2">
                    <Chip active={onlyThis} onClick={() => setOnlyThis(true)}>Deze voorraad</Chip>
                    <Chip active={!onlyThis} onClick={() => setOnlyThis(false)}>Alle gebruikers</Chip>
                </div>
            )}
            {shown.length === 0 ? <Card><EmptyState icon="Log" title="Nog geen activiteit" /></Card> : (
                <Card className="overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                    {shown.map(l => {
                        const [ic, cl] = tone(l.action);
                        return (
                            <div key={l.id} className="flex gap-3 px-4 py-2.5">
                                <span className={cx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cl)}><Icon name={ic} size={15} /></span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between gap-2">
                                        <p className="font-semibold text-sm truncate">{l.item || l.action}</p>
                                        <p className="text-xs text-stone-400 flex-shrink-0 tabular-nums">{formatDateTime(l.timestamp)}</p>
                                    </div>
                                    {l.details && <p className="text-xs text-stone-500 dark:text-stone-400 break-words">{l.details}</p>}
                                    <p className="text-[11px] text-stone-400 mt-0.5">{l.action} · {l.actorId === (user && user.uid) ? 'jij' : l.actorName}{isAdmin && !onlyThis && l.targetUserId !== ownerId ? ' · andere voorraad' : ''}</p>
                                </div>
                            </div>
                        );
                    })}
                </Card>
            )}
        </div>
    );
}
