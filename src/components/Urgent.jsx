import React, { useMemo, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { Sheet, Button, Card } from './ui.jsx';
import { ItemRow } from './items.jsx';
import { cx, itemStatus, URGENCY } from '../lib/utils.js';

const GROUPS = [
    { id: 'now', title: 'Verlopen', short: 'verlopen', levels: ['expired', 'veryold'], tone: 'text-red-600 dark:text-red-400', icon: 'Alert' },
    { id: 'soon', title: 'Binnen 3 dagen op', short: 'snel op', levels: ['soon'], tone: 'text-orange-600 dark:text-orange-400', icon: 'Clock' },
    { id: 'week', title: 'Deze week', short: 'deze week', levels: ['week', 'old'], tone: 'text-amber-600 dark:text-amber-400', icon: 'Calendar' }
];

function useUrgent() {
    const { items, typeOf, canSee } = useStore();
    return useMemo(() => {
        const out = { now: [], soon: [], week: [] };
        items.forEach(i => {
            const t = typeOf(i);
            if (t !== 'vriezer' && !canSee(t)) return;
            const st = itemStatus(i, t);
            const g = GROUPS.find(g => g.levels.includes(st.level));
            if (g) out[g.id].push({ item: i, st, type: t });
        });
        Object.values(out).forEach(list => list.sort((a, b) => URGENCY[a.st.level] - URGENCY[b.st.level]
            || (a.st.kind === 'tht' && b.st.kind === 'tht' ? a.st.days - b.st.days : b.st.days - a.st.days)));
        return out;
    }, [items, typeOf]);
}

// Klein balkje bovenaan de voorraad: wat moet eerst op (over alle locaties heen)?
export function UrgentBanner() {
    const urgent = useUrgent();
    const [open, setOpen] = useState(false);
    const parts = GROUPS.filter(g => urgent[g.id].length);
    if (!parts.length) return null;
    const hasExpired = urgent.now.length > 0;
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}
                className={cx('w-full flex items-center gap-3 px-4 h-12 rounded-2xl text-left border transition-colors print:hidden',
                    hasExpired ? 'bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-900' : 'bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-900')}>
                <Icon name="Alert" size={18} className={hasExpired ? 'text-red-600' : 'text-amber-600'} />
                <span className="flex-1 min-w-0 text-sm truncate">
                    <b className="text-stone-900 dark:text-white">Eerst opmaken: </b>
                    {parts.map((g, i) => <span key={g.id} className={g.tone}>{i > 0 && <span className="text-stone-400"> · </span>}{urgent[g.id].length} {g.short}</span>)}
                </span>
                <Icon name="ChevronRight" size={18} className="text-stone-400 flex-shrink-0" />
            </button>
            <Sheet open={open} onClose={() => setOpen(false)} title="Eerst opmaken" subtitle="Over al je vriezers, frigo's en kasten" size="lg">
                <div className="space-y-4">
                    {parts.map(g => (
                        <Card key={g.id} className="overflow-hidden">
                            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                                <Icon name={g.icon} size={16} className={g.tone} />
                                <h4 className={cx('font-semibold text-sm', g.tone)}>{g.title}</h4>
                                <span className="text-xs text-stone-400 tabular-nums">{urgent[g.id].length}</span>
                            </div>
                            <ul className="divide-y divide-stone-100 dark:divide-stone-800/80">
                                {urgent[g.id].map(({ item, type }) => <ItemRow key={item.id} item={item} type={type} showWhere />)}
                            </ul>
                        </Card>
                    ))}
                </div>
            </Sheet>
        </>
    );
}

export function PendingInvites() {
    const { incomingShares, actions } = useStore();
    const pending = incomingShares.filter(s => s.status === 'pending');
    if (!pending.length) return null;
    return (
        <div className="space-y-2">
            {pending.map(inv => (
                <Card key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0"><Icon name="Users" size={18} /></span>
                        <p className="text-sm min-w-0"><b className="break-all">{inv.ownerEmail}</b> nodigt je uit om samen de voorraad te beheren.</p>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="secondary" onClick={() => actions.declineInvite(inv)}>Weigeren</Button>
                        <Button size="sm" onClick={() => actions.acceptInvite(inv)}>Accepteren</Button>
                    </div>
                </Card>
            ))}
        </div>
    );
}
