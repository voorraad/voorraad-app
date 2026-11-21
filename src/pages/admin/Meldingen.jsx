import React, { useEffect, useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { db } from '../../lib/firebase.js';
import { useStore } from '../../state/store.jsx';
import { Card, Button } from '../../components/ui.jsx';
import { MeldingKeuze } from '../../components/MeldingKeuze.jsx';
import { MELDING_SOORTEN, TEST_SOORTEN, meldingPrefs } from '../../lib/meldingen.js';
import { sendTest } from '../../lib/push.js';
import { cx } from '../../lib/utils.js';

// Openstaande vragen om een vergrendelde melding (berichten, uitnodigingen) uit te zetten.
export const openVerzoeken = (u) => {
    const p = meldingPrefs(u), v = (u && u.meldingVerzoek) || {};
    return Object.keys(v).filter(k => v[k] && p[k]);
};
const nameOf = (u) => u.displayName || (u.email || '').split('@')[0] || 'Gebruiker';

// Beheer → gebruiker → Meldingen: alles zien en aanpassen, ook wat de gebruiker zelf niet mag.
export function UserMeldingen({ u }) {
    const { globalSettings, actions, usersList } = useStore();
    const p = meldingPrefs(u);
    const [isBeheerder, setIsBeheerder] = useState(false);
    useEffect(() => { db.collection('admins').doc(u.id).get().then(d => setIsBeheerder(d.exists)).catch(() => { }); }, [u.id]);
    const save = async (m) => {
        const v = { ...(u.meldingVerzoek || {}) };
        // Een vraag is afgehandeld zodra de beheerder die melding aanpast.
        Object.keys(v).forEach(k => { if (m[k] !== p[k]) v[k] = null; });
        await db.collection('users').doc(u.id).set({ meldingen: m, meldingVerzoek: v }, { merge: true });
        actions.notify('Meldingen van ' + nameOf(u) + ' aangepast');
    };
    const weiger = async () => {
        const v = { ...(u.meldingVerzoek || {}) }; Object.keys(v).forEach(k => { v[k] = null; });
        await db.collection('users').doc(u.id).set({ meldingVerzoek: v }, { merge: true });
        actions.notify('Vraag afgewezen; de meldingen blijven aan');
    };
    const open = openVerzoeken(u);
    return (
        <div className="max-w-2xl space-y-4">
            {open.length > 0 && (
                <div className="rounded-2xl border p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                    <p className="text-sm font-semibold flex items-center gap-2"><Icon name="Bell" size={16} className="text-amber-600" />{nameOf(u)} vraagt om {open.map(k => (MELDING_SOORTEN.find(m => m.id === k) || {}).label.toLowerCase()).join(' en ')} uit te zetten.</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <Button size="sm" onClick={() => save({ ...p, ...Object.fromEntries(open.map(k => [k, false])) })}>Uitzetten</Button>
                        <Button size="sm" variant="secondary" onClick={weiger}>Laten aanstaan</Button>
                    </div>
                </div>
            )}
            <Card className="px-4 pb-4">
                <p className="text-sm text-stone-500 pt-4">Wat {nameOf(u)} heeft ingesteld. Je kan alles aanpassen, ook berichten en uitnodigingen (die kan de gebruiker zelf niet uitzetten).
                    {u.meldingen ? '' : ' Deze gebruiker heeft nog niets gekozen: dit zijn de standaardinstellingen.'}</p>
                <MeldingKeuze admin isBeheerder={isBeheerder} gebruikers={usersList} prefs={p} uid={u.id} standaardUur={(globalSettings.push && globalSettings.push.meldingUur) || '08:00'} verzoek={u.meldingVerzoek || {}} onSave={save} />
            </Card>
            <Card className="p-4">
                <p className="text-sm font-semibold flex items-center gap-2"><Icon name="Bell" size={16} />Elke melding testen</p>
                <p className="text-xs text-stone-500 mt-0.5">Gaat naar alle toestellen van {nameOf(u)}, ook als die melding uit staat. Met echte gegevens als die er zijn, anders een voorbeeld.</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {TEST_SOORTEN.map(t => (
                        <button key={t.id} type="button" onClick={async () => { await sendTest(u.id, t.id); actions.notify(t.label + ': testmelding gestuurd'); }}
                            className="h-8 px-3 rounded-lg text-sm font-medium bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 flex items-center gap-1.5">
                            <Icon name={t.icon} size={14} />{t.label}
                        </button>
                    ))}
                </div>
            </Card>
        </div>
    );
}

// Kort overzicht per gebruiker: uur + welke meldingen aan staan (beheer → server & meldingen)
export function MeldingSamenvatting({ u, standaardUur }) {
    const p = meldingPrefs(u);
    return (
        <div className="flex flex-wrap items-center gap-1 text-[11px] text-stone-500">
            <span className="font-semibold tabular-nums mr-1">{p.tijd || standaardUur}</span>
            {MELDING_SOORTEN.map(m => (
                <span key={m.id} title={m.label + (p[m.id] ? ': aan' : ': uit')} className={cx('w-6 h-6 rounded-md flex items-center justify-center', p[m.id] ? 'bg-stone-100 dark:bg-stone-800 ' + m.tone : 'text-stone-300 dark:text-stone-600 line-through')}>
                    <Icon name={m.icon} size={13} />
                </span>
            ))}
            {openVerzoeken(u).length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-semibold">vraagt iets uit te zetten</span>}
        </div>
    );
}

// Overzicht: wie wil een melding laten uitzetten?
export function MeldingVerzoekenBanner() {
    const { usersList } = useStore();
    const list = usersList.filter(u => openVerzoeken(u).length);
    if (!list.length) return null;
    return (
        <div className="rounded-2xl border p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <p className="text-sm font-semibold flex items-center gap-2"><Icon name="Bell" size={16} className="text-amber-600" />{list.length === 1 ? '1 gebruiker vraagt' : list.length + ' gebruikers vragen'} om een melding uit te zetten</p>
            <div className="flex flex-wrap gap-2 mt-3">
                {list.map(u => <a key={u.id} href={`#/admin/dashboard/${u.id}/meldingen`} className="h-8 px-3 rounded-lg bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800 text-sm font-medium flex items-center">{nameOf(u)}</a>)}
            </div>
        </div>
    );
}
