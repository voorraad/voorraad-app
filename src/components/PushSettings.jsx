import React, { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { Button, Toggle } from './ui.jsx';
import { pushState, enablePush, disablePush, sendTest } from '../lib/push.js';
import { toDate } from '../lib/utils.js';

// Instellingen → Meldingen: echte pushmeldingen via de eigen server, anders de gewone browsermelding.
export function PushSettings() {
    const { user, me, globalSettings, actions } = useStore();
    const push = globalSettings.push;
    const [st, setSt] = useState('laden');
    const [busy, setBusy] = useState(false);
    useEffect(() => { pushState().then(setSt).catch(() => setSt('unsupported')); }, []);
    const serverOk = push && push.publicKey && toDate(push.serverOp) && Date.now() - toDate(push.serverOp) < 30 * 60000;

    const run = async (fn) => {
        setBusy(true);
        try { await fn(); } catch (e) { actions.notify(e.message || 'Er ging iets mis', 'error'); }
        setSt(await pushState().catch(() => 'unsupported'));
        setBusy(false);
    };

    if (!push || !push.publicKey) return <LocalNotifications />;
    const sub = st === 'on';
    return (
        <div className="py-2 space-y-2">
            <div className="flex items-center gap-3">
                <span className="flex-1"><span className="block text-[15px] font-medium">Meldingen op dit toestel</span>
                    <span className="block text-xs text-stone-500">
                        {st === 'ios-home' ? 'iOS: zet de app eerst op je beginscherm (Safari → Deel → Zet op beginscherm) en open ze van daaruit.'
                            : st === 'unsupported' ? 'Deze browser ondersteunt geen pushmeldingen.'
                                : st === 'denied' ? 'Geblokkeerd. iOS: Instellingen → Meldingen → Voorraad. Android: houd het app-icoon ingedrukt → App-info → Meldingen.'
                                    : sub ? `Elke dag om ${push.meldingUur || '08:00'} als er iets dringend op moet, en bij berichten.`
                                        : 'Krijg een melding als er iets vervalt, ook als de app dicht is.'}
                        {!serverOk && <span className="block text-amber-600">De meldingsserver lijkt even offline.</span>}
                    </span>
                </span>
                {(st === 'off' || st === 'on') && (sub
                    ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(disablePush)}>Uitzetten</Button>
                    : <Button size="sm" variant="soft" disabled={busy} onClick={() => run(() => enablePush(user.uid, push.publicKey))}>Aanzetten</Button>)}
            </div>
            {sub && (
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" icon="Bell" disabled={busy} onClick={() => run(async () => { await sendTest(user.uid, 'test'); actions.notify('Testmelding onderweg'); })}>Testmelding</Button>
                    <Button size="sm" variant="ghost" icon="Alert" disabled={busy} onClick={() => run(async () => { await sendTest(user.uid, 'voorraad'); actions.notify('Melding met je voorraad onderweg'); })}>Toon wat er op moet</Button>
                </div>
            )}
            {sub && <Toggle checked={me.notificationsEnabled !== false} onChange={c => actions.setMine({ notificationsEnabled: c })} label="Dagelijkse melding" description="Uit = enkel berichten van de beheerder" />}
        </div>
    );
}

function LocalNotifications() {
    const { me, actions } = useStore();
    const [notif, setNotif] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
    const ask = async () => { const r = await Notification.requestPermission(); setNotif(r); if (r === 'granted') actions.setMine({ notificationsEnabled: true }); };
    if (notif === 'granted') return <Toggle checked={me.notificationsEnabled !== false} onChange={c => actions.setMine({ notificationsEnabled: c })} label="Meldingen" description="Melding als er producten verlopen (wanneer je de app opent)" />;
    if (notif === 'unsupported') return null;
    return (
        <div className="flex items-center gap-3 py-2">
            <span className="flex-1"><span className="block text-[15px] font-medium">Meldingen</span><span className="block text-xs text-stone-500">{notif === 'denied' ? 'Geblokkeerd in je browserinstellingen' : 'Krijg een seintje als er iets verloopt'}</span></span>
            {notif !== 'denied' && <Button size="sm" variant="soft" onClick={ask}>Inschakelen</Button>}
        </div>
    );
}
