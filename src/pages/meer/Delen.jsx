import React, { useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { useStore } from '../../state/store.jsx';
import { useUi } from '../../state/ui.jsx';
import { Card, Button, Input, Toggle, IconButton } from '../../components/ui.jsx';
import { cx } from '../../lib/utils.js';

export function Delen() {
    const { me, outgoingShares, isOwnAccount, actions } = useStore();
    const { confirm } = useUi();
    const [email, setEmail] = useState('');
    const [copied, setCopied] = useState(false);
    const link = me.publicShareToken ? `${location.origin}${location.pathname}?deel=${me.publicShareToken}` : '';

    const invite = async (e) => { e.preventDefault(); if (await actions.invite(email)) setEmail(''); };
    const copy = async () => {
        try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
        catch (e) { window.prompt('Kopieer de link:', link); }
    };

    return (
        <div className="space-y-6">
            <section>
                <h3 className="font-semibold mb-1">Samen beheren</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">Nodig iemand uit om je voorraad mee te bekijken en aan te passen. Die persoon logt in met exact dit e-mailadres en aanvaardt de uitnodiging op het startscherm.</p>
                {!isOwnAccount && <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2 mb-3">Let op: je deelt altijd je <b>eigen</b> voorraad, niet de gedeelde voorraad die je nu bekijkt.</p>}
                <form onSubmit={invite} className="flex gap-2">
                    <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="naam@voorbeeld.be" className="flex-1" />
                    <Button type="submit" disabled={!email.trim()}>Uitnodigen</Button>
                </form>
                {outgoingShares.length > 0 && (
                    <Card className="mt-3 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                        {outgoingShares.map(s => (
                            <div key={s.id} className="flex items-center gap-3 pl-4 pr-1.5 py-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{s.sharedWithEmail}</p>
                                    <p className={cx('text-xs font-semibold', s.status === 'accepted' ? 'text-emerald-600' : s.status === 'declined' ? 'text-red-500' : 'text-amber-600')}>
                                        {s.status === 'accepted' ? 'Heeft toegang' : s.status === 'declined' ? 'Geweigerd' : 'Wacht op antwoord'}
                                    </p>
                                </div>
                                <IconButton icon="Trash" label="Toegang intrekken" className="text-red-500" onClick={async () => { if (await confirm({ title: 'Toegang intrekken?', message: s.sharedWithEmail, confirmLabel: 'Intrekken', danger: true })) actions.revokeShare(s); }} />
                            </div>
                        ))}
                    </Card>
                )}
            </section>

            <section>
                <h3 className="font-semibold mb-1">Bekijk-link</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">Iedereen met deze link kan je voorraad bekijken (niet aanpassen), zonder account. Handig voor familie of een oppas.</p>
                <Card className="px-4 py-1">
                    <Toggle checked={!!me.publicShareEnabled} onChange={() => actions.togglePublicLink()} label="Link actief" />
                </Card>
                {me.publicShareEnabled && link && (
                    <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                            <Input readOnly value={link} onFocus={e => e.target.select()} className="flex-1 text-sm" />
                            <Button variant="secondary" icon={copied ? 'Check' : 'Copy'} onClick={copy}>{copied ? 'Gekopieerd' : 'Kopieer'}</Button>
                        </div>
                        <button type="button" onClick={async () => { if (await confirm({ title: 'Nieuwe link maken?', message: 'De huidige link werkt daarna niet meer.', confirmLabel: 'Nieuwe link' })) actions.regeneratePublicLink(); }}
                            className="text-sm font-semibold text-red-600 flex items-center gap-1.5"><Icon name="Undo" size={14} />Nieuwe link maken (oude stopt)</button>
                    </div>
                )}
            </section>
        </div>
    );
}
