import React, { useMemo, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Card, Button, SectionTitle, EmptyState } from '../components/ui.jsx';
import { ItemRow } from '../components/items.jsx';
import { TYPES } from '../lib/constants.js';
import { cx, itemStatus, URGENCY, todayKey, emojiFor, num, normalize, byName, weekdayLabel } from '../lib/utils.js';

const GROUPS = [
    { id: 'now', title: 'Verlopen', levels: ['expired', 'veryold'], tone: 'text-red-600 dark:text-red-400', icon: 'Alert' },
    { id: 'soon', title: 'Binnen 3 dagen op', levels: ['soon'], tone: 'text-orange-600 dark:text-orange-400', icon: 'Clock' },
    { id: 'week', title: 'Deze week', levels: ['week', 'old'], tone: 'text-amber-600 dark:text-amber-400', icon: 'Calendar' }
];

export default function Overview() {
    const { user, items, typeOf, shopping, menuEntries, incomingShares, actions, canSee, dataLoaded, vriezers, isOwnAccount, accounts, ownerId } = useStore();
    const { go, openForm, openItem, openPlan } = useUi();
    const [expanded, setExpanded] = useState({});

    const urgent = useMemo(() => {
        const out = { now: [], soon: [], week: [] };
        items.forEach(i => {
            const t = typeOf(i);
            if (!canSee(t) && t !== 'vriezer') return;
            const st = itemStatus(i, t);
            const g = GROUPS.find(g => g.levels.includes(st.level));
            if (g) out[g.id].push({ item: i, st, type: t });
        });
        Object.values(out).forEach(list => list.sort((a, b) => URGENCY[a.st.level] - URGENCY[b.st.level] || (a.st.kind === 'tht' && b.st.kind === 'tht' ? a.st.days - b.st.days : b.st.days - a.st.days)));
        return out;
    }, [items, typeOf]);

    // Producten onder hun minimum die nog niet op het lijstje staan
    const low = useMemo(() => {
        const totals = new Map();
        items.forEach(i => {
            const k = normalize(i.naam);
            const t = totals.get(k) || { item: i, total: 0, min: 0 };
            t.total += num(i.aantal); t.min = Math.max(t.min, num(i.minimumVoorraad));
            totals.set(k, t);
        });
        const onList = new Set(shopping.filter(s => !s.checked).map(s => normalize(s.naam)));
        return [...totals.values()].filter(t => t.min > 0 && t.total <= t.min && !onList.has(normalize(t.item.naam))).map(t => t.item);
    }, [items, shopping]);

    const today = todayKey();
    const todayMenu = [...menuEntries, ...items].filter(i => i.geplandeDatum === today);
    const openShopping = shopping.filter(s => !s.checked).length;
    const pending = incomingShares.filter(s => s.status === 'pending');
    const urgentCount = urgent.now.length + urgent.soon.length + urgent.week.length;
    const hour = new Date().getHours();
    const greet = hour < 6 ? 'Goeienacht' : hour < 12 ? 'Goeiemorgen' : hour < 18 ? 'Goeiemiddag' : 'Goeieavond';
    const firstName = ((user && user.displayName) || '').split(' ')[0];
    const ownerLabel = !isOwnAccount ? (accounts.find(a => a.id === ownerId) || {}).label : null;

    if (dataLoaded && vriezers.length === 0 && items.length === 0) {
        return (
            <div className="max-w-xl mx-auto">
                <PendingInvites pending={pending} actions={actions} />
                <Card className="p-2 mt-4">
                    <EmptyState icon="Sparkles" title={`Welkom${firstName ? ', ' + firstName : ''}!`}
                        text="Begin met een eerste product. Je kan meteen een vriezer, frigo of kast aanmaken."
                        action={<Button icon="Plus" onClick={() => openForm({ type: 'vriezer', nonce: Date.now() })}>Eerste product toevoegen</Button>} />
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm text-stone-500 dark:text-stone-400">{weekdayLabel(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <h1 className="text-2xl font-bold text-stone-900 dark:text-white">{greet}{firstName ? `, ${firstName}` : ''}</h1>
                {ownerLabel && <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 flex items-center gap-1.5"><Icon name="Users" size={14} /> Je bekijkt de voorraad van {ownerLabel}</p>}
            </div>

            <PendingInvites pending={pending} actions={actions} />

            {/* Snelle tellers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {TYPES.filter(t => t.id === 'vriezer' || canSee(t.id)).map(t => {
                    const n = items.filter(i => typeOf(i) === t.id).length;
                    return (
                        <button key={t.id} type="button" onClick={() => go('voorraad/' + t.id)} className="text-left p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
                            <Icon name={t.icon} size={20} className={cx(t.tone === 'sky' ? 'text-sky-500' : t.tone === 'emerald' ? 'text-emerald-500' : 'text-amber-500')} />
                            <p className="text-2xl font-bold mt-2 tabular-nums text-stone-900 dark:text-white">{n}</p>
                            <p className="text-sm text-stone-500 dark:text-stone-400">{t.label}</p>
                        </button>
                    );
                })}
                <button type="button" onClick={() => go('lijst')} className="text-left p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
                    <Icon name="Cart" size={20} className="text-teal-600" />
                    <p className="text-2xl font-bold mt-2 tabular-nums text-stone-900 dark:text-white">{openShopping}</p>
                    <p className="text-sm text-stone-500 dark:text-stone-400">Op je lijstje</p>
                </button>
            </div>

            {/* Eerst opmaken */}
            <section>
                <SectionTitle>Eerst opmaken</SectionTitle>
                {urgentCount === 0 ? (
                    <Card className="p-5 flex items-center gap-4">
                        <span className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center flex-shrink-0"><Icon name="Check" size={22} strokeWidth={2.5} /></span>
                        <div>
                            <p className="font-semibold text-stone-900 dark:text-white">Alles is nog goed</p>
                            <p className="text-sm text-stone-500 dark:text-stone-400">Niets verloopt deze week en niets ligt te lang in de vriezer.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {GROUPS.filter(g => urgent[g.id].length).map(g => {
                            const list = urgent[g.id];
                            const limit = expanded[g.id] ? list.length : 5;
                            return (
                                <Card key={g.id} className="overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                                        <Icon name={g.icon} size={16} className={g.tone} />
                                        <h4 className={cx('font-semibold text-sm', g.tone)}>{g.title}</h4>
                                        <span className="text-xs text-stone-400 tabular-nums">{list.length}</span>
                                    </div>
                                    <ul className="divide-y divide-stone-100 dark:divide-stone-800/80">
                                        {list.slice(0, limit).map(({ item, type }) => <ItemRow key={item.id} item={item} type={type} showWhere />)}
                                    </ul>
                                    {list.length > 5 && (
                                        <button type="button" onClick={() => setExpanded(e => ({ ...e, [g.id]: !e[g.id] }))} className="w-full py-2.5 text-sm font-semibold text-teal-700 dark:text-teal-300 border-t border-stone-100 dark:border-stone-800">
                                            {expanded[g.id] ? 'Toon minder' : `Toon alle ${list.length}`}
                                        </button>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                {canSee('weekmenu') && (
                    <section>
                        <SectionTitle action={<button className="text-sm font-semibold text-teal-700 dark:text-teal-300" onClick={() => go('menu/week')}>Weekmenu</button>}>Vandaag op het menu</SectionTitle>
                        <Card className="p-2">
                            {todayMenu.length === 0 ? (
                                <button type="button" onClick={() => openPlan({ date: new Date() })} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 text-left">
                                    <span className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center"><Icon name="Plus" size={18} /></span>
                                    <span className="text-stone-600 dark:text-stone-300">Nog niets gepland. <span className="font-semibold text-teal-700 dark:text-teal-300">Plan iets in</span></span>
                                </button>
                            ) : todayMenu.map(i => (
                                <button key={i.id} type="button" onClick={() => (i.vriezerId === 'custom_menu' ? go('menu/week') : openItem(i.id))} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 text-left">
                                    <span className="text-2xl w-10 text-center">{emojiFor(i)}</span>
                                    <span className="font-semibold text-stone-900 dark:text-white">{i.naam}</span>
                                </button>
                            ))}
                        </Card>
                    </section>
                )}

                {low.length > 0 && (
                    <section>
                        <SectionTitle>Bijna op</SectionTitle>
                        <Card className="p-3">
                            <p className="text-sm text-stone-500 dark:text-stone-400 mb-2">Deze producten zitten onder je minimum.</p>
                            <div className="flex flex-wrap gap-2">
                                {low.sort(byName).map(i => (
                                    <button key={i.id} type="button" onClick={async () => { await actions.addShopping({ naam: i.naam, aantal: Math.max(1, num(i.minimumVoorraad) - num(i.aantal)), eenheid: i.eenheid }); actions.notify(`${i.naam} op je lijstje gezet`); }}
                                        className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-full bg-stone-100 dark:bg-stone-800 text-sm font-medium hover:bg-teal-50 dark:hover:bg-teal-950/50">
                                        <span>{emojiFor(i)}</span>{i.naam}<Icon name="Plus" size={14} className="text-teal-600" />
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </section>
                )}
            </div>
        </div>
    );
}

function PendingInvites({ pending, actions }) {
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
