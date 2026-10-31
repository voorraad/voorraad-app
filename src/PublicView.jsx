import React, { useEffect, useState } from 'react';
import Icon from './lib/icons.jsx';
import { db } from './lib/firebase.js';
import { TYPES } from './lib/constants.js';
import { sortLocaties, byName, emojiFor, formatAantal, isMenuEntry, itemStatus, statusText, STATUS_TONE, cx } from './lib/utils.js';

// Alleen-lezen weergave via ?deel=TOKEN (geen account nodig).
// Vereist een Firestore-regel die lezen toelaat wanneer publicShareEnabled == true.
export default function PublicView({ token }) {
    const [state, setState] = useState({ status: 'loading' });
    useEffect(() => {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
        (async () => {
            try {
                const us = await db.collection('users').where('publicShareToken', '==', token).where('publicShareEnabled', '==', true).limit(1).get();
                if (us.empty) return setState({ status: 'notfound' });
                const owner = us.docs[0];
                const [v, i] = await Promise.all([
                    db.collection('vriezers').where('userId', '==', owner.id).get(),
                    db.collection('items').where('userId', '==', owner.id).get()
                ]);
                setState({
                    status: 'ok', label: owner.data().displayName || owner.data().email || 'iemand',
                    vriezers: v.docs.map(d => ({ id: d.id, type: 'vriezer', ...d.data() })),
                    items: i.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !isMenuEntry(x))
                });
            } catch (e) { console.warn(e); setState({ status: 'notfound' }); }
        })();
    }, [token]);

    if (state.status === 'loading') return <div className="min-h-dvh flex items-center justify-center text-stone-400">Laden…</div>;
    if (state.status === 'notfound') return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Icon name="Lock" size={36} className="text-stone-300" />
            <h1 className="text-lg font-bold">Deze link werkt niet (meer)</h1>
            <p className="text-sm text-stone-500">Vraag de eigenaar om een nieuwe link.</p>
        </div>
    );
    return (
        <div className="min-h-dvh">
            <header className="sticky top-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur border-b border-stone-200 dark:border-stone-800 py-3"><div className="max-w-7xl mx-auto px-4">
                <p className="font-extrabold text-lg">Voorraad<span className="text-teal-600">.</span></p>
                <p className="text-xs text-stone-500">Voorraad van {state.label} · alleen bekijken</p>
            </div></header>
            <main className="max-w-7xl mx-auto p-4 space-y-6">
                {TYPES.map(t => {
                    const locs = sortLocaties(state.vriezers.filter(v => (v.type || 'vriezer') === t.id)).filter(l => state.items.some(i => i.vriezerId === l.id));
                    if (!locs.length) return null;
                    return (
                        <section key={t.id}>
                            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-stone-500 mb-2 flex items-center gap-1.5"><Icon name={t.icon} size={14} />{t.label}</h2>
                            <div className="grid gap-3 items-start md:grid-cols-2 xl:grid-cols-3">
                                {locs.map(l => (
                                    <div key={l.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                                        <p className="px-4 pt-3 pb-1 font-semibold">{l.naam}</p>
                                        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                                            {state.items.filter(i => i.vriezerId === l.id).sort(byName).map(i => {
                                                const st = itemStatus(i, t.id);
                                                return (
                                                    <li key={i.id} className="flex items-center gap-3 px-4 py-2">
                                                        <span className="text-xl">{emojiFor(i)}</span>
                                                        <span className="flex-1 min-w-0"><span className="block truncate">{i.naam}</span>{statusText(st) && <span className={cx('block text-xs', STATUS_TONE[st.level])}>{statusText(st)}</span>}</span>
                                                        <span className="text-sm text-stone-500 tabular-nums">{formatAantal(i.aantal)} {i.eenheid}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}
                {state.items.length === 0 && <p className="text-center text-stone-400 py-10">Geen producten.</p>}
            </main>
        </div>
    );
}
