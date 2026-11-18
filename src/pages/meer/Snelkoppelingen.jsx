import React from 'react';
import Icon from '../../lib/icons.jsx';
import { useStore } from '../../state/store.jsx';
import { Card, SectionTitle, Merk } from '../../components/ui.jsx';

const LINKS = [
    { id: 'scan', label: 'Barcode scannen', icon: 'Scan', right: 'scan', q: '?actie=scan' },
    { id: 'nieuw', label: 'Product toevoegen', icon: 'Plus', right: 'toevoegen', q: '?actie=nieuw' },
    { id: 'eerst', label: 'Eerst opmaken', icon: 'Alert', q: '?actie=eerst' },
    { id: 'lijst', label: 'Boodschappenlijst', icon: 'Cart', right: 'lijst', q: '#/lijst' }
];

export function Snelkoppelingen() {
    const { canSee, actions } = useStore();
    const base = `${location.origin}${location.pathname}`;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const copy = async (url) => { try { await navigator.clipboard.writeText(url); actions.notify('Link gekopieerd'); } catch (e) { actions.notify(url); } };
    return (
        <div className="space-y-5 max-w-2xl">
            <Card className="p-4 text-sm text-stone-600 dark:text-stone-300 space-y-2">
                {isIos ? <>
                    <p className="font-semibold text-stone-800 dark:text-stone-100">Op iPhone of iPad</p>
                    <p>Tik op <b>Open</b> bij een snelkoppeling hieronder. Die opent in Safari: tik daar op <b>Deel</b> → <b>Zet op beginscherm</b>. Je krijgt dan een extra icoon dat meteen bv. de scanner opent.</p>
                </> : <>
                    <p className="font-semibold text-stone-800 dark:text-stone-100">Op Android</p>
                    <p>Houd het app-icoon van <Merk /> op je beginscherm ingedrukt: de snelkoppelingen verschijnen. Sleep er een naar je beginscherm om er een eigen icoon van te maken.</p>
                    <p>Of open een link hieronder in Chrome en kies <b>⋮ → Toevoegen aan startscherm</b>.</p>
                </>}
                <p className="text-xs text-stone-500">Echte widgets met je voorraad op het beginscherm kunnen web-apps (nog) niet maken; deze snelkoppelingen zijn het dichtst daarbij.</p>
            </Card>
            <section>
                <SectionTitle>Snelkoppelingen</SectionTitle>
                <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                    {LINKS.filter(l => !l.right || canSee(l.right)).map(l => {
                        const url = base + l.q;
                        return (
                            <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                                <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-200 flex items-center justify-center"><Icon name={l.icon} size={18} /></span>
                                <span className="flex-1 font-medium">{l.label}</span>
                                <button type="button" onClick={() => copy(url)} className="h-9 px-3 rounded-xl text-sm font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700">Kopieer</button>
                                <a href={url} target="_blank" rel="noopener" className="h-9 px-3 rounded-xl text-sm font-semibold bg-teal-600 text-white flex items-center">Open</a>
                            </div>
                        );
                    })}
                </Card>
            </section>
        </div>
    );
}
