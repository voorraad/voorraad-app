import React, { useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { db } from '../../lib/firebase.js';
import { useStore } from '../../state/store.jsx';
import { Card, Button } from '../../components/ui.jsx';
import { TOUR_TONE } from '../../lib/constants.js';
import { cx, tourKey } from '../../lib/utils.js';

// Beheer → gebruiker → Rondleiding: welke stappen zag deze gebruiker al, en welke wil je (opnieuw) tonen?
export function UserRondleiding({ u }) {
    const { globalSettings, actions } = useStore();
    const steps = globalSettings.tourSteps || [];
    const gezien = Array.isArray(u.tourGezien) ? u.tourGezien : (u.hasSeenTutorial ? steps.map(tourKey) : []);
    const nieuw = steps.map(tourKey).filter(k => !gezien.includes(k));
    const [keuze, setKeuze] = useState(() => (Array.isArray(u.tourTonen) && u.tourTonen.length ? u.tourTonen : nieuw));
    const naam = u.displayName || (u.email || '').split('@')[0] || 'deze gebruiker';
    const zet = async (patch, msg) => { await db.collection('users').doc(u.id).set(patch, { merge: true }); actions.notify(msg); };
    const wacht = Array.isArray(u.tourTonen) && u.tourTonen.length;
    return (
        <div className="max-w-2xl space-y-4">
            <Card className="p-4 space-y-3">
                <p className="text-sm text-stone-600 dark:text-stone-300">
                    {!u.hasSeenTutorial ? `${naam} krijgt de volledige rondleiding bij de volgende keer dat de app opent.`
                        : `${naam} zag ${gezien.filter(k => steps.some(s => tourKey(s) === k)).length} van de ${steps.length} stappen.`}
                    {wacht ? ` Klaargezet: ${u.tourTonen.length} stap(pen), verschijnt bij de volgende keer openen.` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon="Help" onClick={() => zet({ hasSeenTutorial: false, tourDisabled: false, tourTonen: [] }, `${naam} krijgt de volledige rondleiding opnieuw`)}>Volledig opnieuw</Button>
                    <Button size="sm" variant="soft" icon="Sparkles" disabled={!nieuw.length} onClick={() => zet({ tourTonen: nieuw, tourDisabled: false }, `${naam} krijgt enkel de nieuwe stappen`)}>Enkel nieuwe stappen{nieuw.length ? ` (${nieuw.length})` : ''}</Button>
                    {wacht ? <Button size="sm" variant="ghost" onClick={() => zet({ tourTonen: [] }, 'Klaargezette stappen gewist')}>Niet meer tonen</Button> : null}
                </div>
            </Card>
            <Card className="overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                <p className="px-4 py-3 text-sm font-semibold">Kies zelf welke stappen {naam} (opnieuw) ziet</p>
                {steps.map(s => {
                    const k = tourKey(s), on = keuze.includes(k), zag = gezien.includes(k);
                    return (
                        <label key={k} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer">
                            <input type="checkbox" checked={on} onChange={() => setKeuze(on ? keuze.filter(x => x !== k) : [...keuze, k])} className="w-4 h-4 accent-teal-600" />
                            <span className={cx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', TOUR_TONE[s.colorName] || TOUR_TONE.blue)}><Icon name={s.icon} size={15} /></span>
                            <span className="flex-1 min-w-0 text-sm truncate">{s.title}</span>
                            <span className={cx('text-[11px] font-semibold px-1.5 py-0.5 rounded', zag ? 'bg-stone-100 text-stone-500 dark:bg-stone-800' : 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200')}>{zag ? 'gezien' : 'nieuw'}</span>
                        </label>
                    );
                })}
                <div className="px-4 py-3">
                    <Button size="sm" icon="Check" disabled={!keuze.length} onClick={() => zet({ tourTonen: keuze, tourDisabled: false }, `${keuze.length} stap(pen) klaargezet voor ${naam}`)}>Deze {keuze.length} stap(pen) tonen</Button>
                </div>
            </Card>
        </div>
    );
}
