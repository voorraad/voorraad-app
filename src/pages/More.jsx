import React, { useRef, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Card, Toggle, Row, Button } from '../components/ui.jsx';
import { APP_VERSION } from '../lib/constants.js';
import { cx } from '../lib/utils.js';
import { exportCSV, exportPDF, exportBackup, importBackup } from '../lib/exporters.js';
import { Locaties, Categorieen, Eenheden } from './meer/Beheer.jsx';
import { Delen } from './meer/Delen.jsx';
import { Statistieken, Logboek } from './meer/Inzicht.jsx';
import { Gebruikers, Dashboard, TourEditor } from './meer/Admin.jsx';

const SUBPAGES = {
    locaties: { title: 'Locaties & lades', C: Locaties },
    categorieen: { title: 'Categorieën', C: Categorieen },
    eenheden: { title: 'Eenheden', C: Eenheden },
    delen: { title: 'Delen', C: Delen },
    statistieken: { title: 'Statistieken', C: Statistieken },
    logboek: { title: 'Logboek', C: Logboek },
    gebruikers: { title: 'Gebruikers', C: Gebruikers, admin: true },
    dashboard: { title: 'Dashboard', C: Dashboard, admin: true },
    tour: { title: 'Rondleiding aanpassen', C: TourEditor, admin: true }
};

export const subpageTitle = (sub) => (SUBPAGES[sub] ? SUBPAGES[sub].title : null);

export default function More() {
    const { route } = useUi();
    const { isAdmin } = useStore();
    const sp = SUBPAGES[route.sub];
    if (sp && (!sp.admin || isAdmin)) return <sp.C />;
    return <MoreHome />;
}

function MoreHome() {
    const { user, me, isAdmin, accounts, ownerId, isOwnAccount, items, locById, ladeById, globalSettings, canSee, actions } = useStore();
    const { go, setShowTour, setShowNews, confirm } = useUi();
    const fileRef = useRef(null);
    const [notif, setNotif] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');

    const askNotif = async () => {
        if (typeof Notification === 'undefined') return;
        const r = await Notification.requestPermission();
        setNotif(r);
        if (r === 'granted') actions.setMine({ notificationsEnabled: true });
    };
    const restore = async (e) => {
        const f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!f) return;
        if (!(await confirm({ title: 'Back-up herstellen?', message: 'De gegevens uit het bestand worden toegevoegd aan je huidige voorraad. Er wordt niets overschreven.', confirmLabel: 'Herstellen' }))) return;
        try { const r = await importBackup(f, ownerId); actions.notify(`Back-up hersteld (${r.items} producten)`); }
        catch (err) { actions.notify(err.message || 'Kon de back-up niet herstellen', 'error'); }
    };
    const run = async (fn, okMsg) => { try { await fn(); if (okMsg) actions.notify(okMsg); } catch (e) { actions.notify(e.message || 'Er ging iets mis', 'error'); } };

    return (
        <div className="space-y-5">
            <Card className="p-4 flex items-center gap-4">
                {user.photoURL ? <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full object-cover" referrerPolicy="no-referrer" />
                    : <span className="w-14 h-14 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-bold">{(user.displayName || user.email || '?')[0].toUpperCase()}</span>}
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-lg text-stone-900 dark:text-white truncate">{user.displayName || 'Gebruiker'}</p>
                    <p className="text-sm text-stone-500 truncate">{user.email}</p>
                </div>
                {isAdmin && <span className="text-xs font-bold px-2 py-1 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">Admin</span>}
            </Card>

            <div className="grid gap-5 items-start md:grid-cols-2 xl:grid-cols-3">
            {accounts.length > 1 && (
                <Group title="Voorraad">
                    {accounts.map(a => (
                        <Row key={a.id} icon={a.id === user.uid ? 'Home' : 'Users'} title={a.label} subtitle={a.id === user.uid ? user.email : a.viaAdmin ? 'via admin' : 'gedeeld met jou'}
                            onClick={a.id === ownerId ? undefined : () => actions.switchAccount(a.id)}
                            right={a.id === ownerId ? <Icon name="Check" size={18} className="text-teal-600" /> : undefined} />
                    ))}
                </Group>
            )}

            <Group title="Weergave">
                <div className="px-4 py-1">
                    <Toggle checked={!!me.darkMode} onChange={() => actions.toggleDark()} label="Donker thema" />
                    {(canSee('balans')) && <Toggle checked={!!me.showBalans} onChange={c => actions.setMine({ showBalans: c })} label="Controle-modus" description="Toont een Controle-knop bij elke lade om snel na te tellen" />}
                    {notif === 'granted'
                        ? <Toggle checked={me.notificationsEnabled !== false} onChange={c => actions.setMine({ notificationsEnabled: c })} label="Meldingen" description="Melding als er producten verlopen" />
                        : notif !== 'unsupported' && (
                            <div className="flex items-center gap-3 py-2">
                                <span className="flex-1"><span className="block text-[15px] font-medium">Meldingen</span><span className="block text-xs text-stone-500">{notif === 'denied' ? 'Geblokkeerd in je browserinstellingen' : 'Krijg een seintje als er iets verloopt'}</span></span>
                                {notif !== 'denied' && <Button size="sm" variant="soft" onClick={askNotif}>Inschakelen</Button>}
                            </div>
                        )}
                </div>
            </Group>

            <Group title="Beheer">
                <Row icon="Layers" title="Locaties & lades" subtitle="Vriezers, frigo's, kasten en hun lades" onClick={() => go('meer/locaties')} />
                <Row icon="Tag" title="Categorieën" onClick={() => go('meer/categorieen')} />
                <Row icon="List" title="Eenheden" onClick={() => go('meer/eenheden')} />
            </Group>

            <Group title="Samen">
                <Row icon="Users" title="Delen" subtitle="Nodig iemand uit of maak een bekijk-link" onClick={() => go('meer/delen')} />
            </Group>

            <Group title="Gegevens">
                <Row icon="Chart" title="Statistieken" onClick={() => go('meer/statistieken')} />
                <Row icon="Log" title="Logboek" onClick={() => go('meer/logboek')} />
                <Row icon="Download" title="Exporteer naar Excel (CSV)" onClick={() => exportCSV(items, locById, ladeById)} right={null} />
                <Row icon="Download" title="Exporteer naar PDF" onClick={() => run(() => exportPDF(items, locById, ladeById))} right={null} />
                <Row icon="Printer" title="Afdrukken" onClick={() => { go('voorraad'); setTimeout(() => window.print(), 400); }} right={null} />
                <Row icon="Download" title="Back-up maken" subtitle="Alles als bestand, om later terug te zetten" onClick={() => run(() => exportBackup(ownerId))} right={null} />
                <Row icon="Upload" title="Back-up herstellen" subtitle="Voegt toe, overschrijft niets" onClick={() => fileRef.current && fileRef.current.click()} right={null} />
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={restore} />
            </Group>

            <Group title="Hulp">
                {globalSettings.tourSteps && globalSettings.tourSteps.length > 0 && <Row icon="Help" title="Rondleiding bekijken" onClick={() => setShowTour(true)} right={null} />}
                <Row icon="Sparkles" title="Wat is er nieuw" subtitle={`Versie ${APP_VERSION}`} onClick={() => setShowNews(true)} right={null} />
            </Group>

            {isAdmin && (
                <Group title="Admin">
                    <Row icon="Users" iconTone="bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300" title="Gebruikers" onClick={() => go('meer/gebruikers')} />
                    <Row icon="Dashboard" iconTone="bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300" title="Dashboard" subtitle="Bekijk de voorraad van een gebruiker" onClick={() => go('meer/dashboard')} />
                    <Row icon="Edit" iconTone="bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300" title="Rondleiding aanpassen" onClick={() => go('meer/tour')} />
                    <div className="px-4 py-1">
                        <Toggle checked={globalSettings.maintenance} onChange={c => actions.setGlobal('maintenance', { active: c })} label="Onderhoudsmodus" description="Blokkeert de app voor gewone gebruikers" />
                        <Toggle checked={globalSettings.onboardingActive} onChange={c => actions.setGlobal('onboarding', { isActive: c })} label="Rondleiding voor nieuwe gebruikers" />
                    </div>
                </Group>
            )}

            </div>

            <Card className="overflow-hidden md:max-w-sm">
                <Row icon="LogOut" title="Uitloggen" danger onClick={actions.logout} right={null} />
            </Card>
            <p className="text-center text-xs text-stone-400 pb-4">Voorraad · versie {APP_VERSION}</p>
        </div>
    );
}

export function Group({ title, children }) {
    return (
        <section>
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2 px-1">{title}</h3>
            <Card className="overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">{children}</Card>
        </section>
    );
}
