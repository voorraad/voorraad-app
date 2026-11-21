import React, { useEffect, useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { db } from '../../lib/firebase.js';
import { useStore } from '../../state/store.jsx';
import { useUi } from '../../state/ui.jsx';
import { Card, Button, SectionTitle, Select } from '../../components/ui.jsx';
import { userTone } from '../../lib/userColors.js';
import { useAllUserData, refreshAllUserData } from './data.js';
import { MeldingSamenvatting } from './Meldingen.jsx';
import { ServerStatus, ServerBackups, Dagrapport } from './ServerExtra.jsx';
import { TEST_SOORTEN } from '../../lib/meldingen.js';
import { sendTest, uploadPhoto, cleanupPhotos } from '../../lib/push.js';
import { cx, toDate, formatDateTime, plural } from '../../lib/utils.js';

const GUIDE = 'https://github.com/voorraad/voorraad-app/blob/main/server/INSTALLEREN.md';
const nameOf = (u) => (u && (u.displayName || (u.email || '').split('@')[0])) || '?';

export function ServerPanel() {
    const { globalSettings, usersList, user, actions } = useStore();
    const { confirm } = useUi();
    const p = globalSettings.push || {};
    const last = toDate(p.serverOp);
    const online = last && Date.now() - last < 10 * 60000;
    const [subs, setSubs] = useState(null);
    useEffect(() => db.collection('pushAbonnementen').onSnapshot(s => setSubs(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setSubs([])), []);
    const [soort, setSoort] = useState('test');
    const label = (TEST_SOORTEN.find(t => t.id === soort) || {}).label || 'Testmelding';
    const test = async (uid, _s, s) => { await sendTest(uid, soort, s ? s.id : null); actions.notify(`${label}: naar ${s ? (s.toestel || 'dit toestel') : 'alle toestellen'} gestuurd`); };

    return (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
            <div className="space-y-6">
                <section>
                    <SectionTitle action={<a href={GUIDE} target="_blank" rel="noopener" className="text-sm font-semibold text-teal-700 dark:text-teal-300">Installatiegids</a>}>Eigen server (Proxmox)</SectionTitle>
                    <Card className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <span className={cx('w-10 h-10 rounded-xl flex items-center justify-center', !p.publicKey ? 'bg-stone-100 text-stone-500 dark:bg-stone-800' : online ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300')}><Icon name={online ? 'Check' : 'Alert'} size={20} /></span>
                            <div className="flex-1">
                                <p className="font-bold">{!p.publicKey ? 'Nog niet geïnstalleerd' : online ? 'Server online' : 'Server offline'}</p>
                                <p className="text-sm text-stone-500">{p.publicKey ? `Laatst gezien ${formatDateTime(p.serverOp)} · versie ${p.versie || '?'}` : 'Volg de installatiegids om meldingen (en foto-opslag) aan te zetten.'}</p>
                            </div>
                        </div>
                        {p.publicKey && (
                            <dl className="text-sm divide-y divide-stone-100 dark:divide-stone-800">
                                <Fact k="Dagelijkse melding" v={`om ${p.meldingUur || '08:00'}`} />
                                <Fact k="Laatste ronde" v={p.laatsteRonde ? `${formatDateTime(p.laatsteRonde.op)} · ${plural(p.laatsteRonde.verstuurd || 0, 'melding', 'meldingen')}` : 'nog niet'} />
                                <Fact k="Laatste test" v={p.laatsteTest ? `${formatDateTime(p.laatsteTest.op)} · ${p.laatsteTest.verstuurd ? 'aangekomen ' + (p.laatsteTest.toestel ? 'op ' + p.laatsteTest.toestel : 'bij ' + plural(p.laatsteTest.verstuurd, 'toestel', 'toestellen')) : 'geen toestel bereikt'}` : '—'} />
                                <Fact k="Foto-opslag" v={p.fotoUrl ? p.fotoUrl : 'uit (foto\'s blijven in de database)'} />
                            </dl>
                        )}
                        {p.publicKey && (
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="soft" icon="Bell" onClick={() => test(user.uid, 'test')}>Testmelding naar mij</Button>
                                <Button size="sm" variant="secondary" icon="Alert" onClick={() => test(user.uid, 'voorraad')}>Voorraadmelding naar mij</Button>
                            </div>
                        )}
                    </Card>
                </section>
                <ServerStatus />
                <ServerBackups />
                <Dagrapport />
                {p.fotoUrl && <PhotoMigration server={p.fotoUrl} />}
                {p.fotoUrl && <PhotoCleanup server={p.fotoUrl} />}
            </div>
            <section>
                <SectionTitle>Meldingen aan ({subs ? new Set(subs.map(s => s.uid)).size : '…'} gebruikers)</SectionTitle>
                <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                    {subs && subs.length > 0 && (
                        <label className="flex items-center gap-3 px-4 py-3">
                            <span className="text-sm text-stone-600 dark:text-stone-300 flex-shrink-0">Test met</span>
                            <Select className="h-9 text-sm" value={soort} onChange={e => setSoort(e.target.value)}>
                                {TEST_SOORTEN.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </Select>
                        </label>
                    )}
                    {subs && !subs.length && <p className="p-4 text-sm text-stone-500">Nog niemand heeft meldingen aangezet. Dat doet elke gebruiker zelf in Instellingen → Meldingen op dit toestel.</p>}
                    {usersList.filter(u => (subs || []).some(s => s.uid === u.id)).map(u => (
                        <div key={u.id} className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                                <span className={cx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', userTone(u.id, usersList).pill)}>{(u.email || '?')[0].toUpperCase()}</span>
                                <p className="flex-1 text-sm font-medium truncate">{nameOf(u)}</p>
                                <a href={`#/admin/dashboard/${u.id}/meldingen`} className="text-sm font-semibold text-teal-700 dark:text-teal-300 px-2">Aanpassen</a>
                                <Button size="sm" variant="ghost" icon="Bell" onClick={() => test(u.id, 'test')}>{subs.filter(s => s.uid === u.id).length > 1 ? 'Test alle' : 'Test'}</Button>
                            </div>
                            <div className="ml-11 mt-1"><MeldingSamenvatting u={u} standaardUur={p.meldingUur || '08:00'} /></div>
                            <ul className="ml-11 mt-1 space-y-0.5">
                                {subs.filter(s => s.uid === u.id).map(s => (
                                    <li key={s.id} className="text-xs text-stone-500 flex items-center gap-2">
                                        <Icon name="Bell" size={12} />{s.toestel || 'Toestel'} · sinds {formatDateTime(s.gemaaktOp)}
                                        <button type="button" className="ml-auto h-7 px-2 rounded-lg font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40" onClick={() => test(u.id, 'test', s)}>Test</button>
                                        <button type="button" className="text-stone-400 hover:text-red-600" aria-label="Verwijderen" onClick={async () => { if (await confirm({ title: 'Meldingen voor dit toestel uitzetten?', confirmLabel: 'Uitzetten', danger: true })) db.collection('pushAbonnementen').doc(s.id).delete(); }}><Icon name="X" size={14} /></button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </Card>
            </section>
        </div>
    );
}

const Fact = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5"><dt className="text-stone-500">{k}</dt><dd className="font-medium text-right break-all">{v}</dd></div>;

// Bestaande foto's (in de database) naar de eigen server verhuizen
function PhotoMigration({ server }) {
    const { usersList, actions } = useStore();
    const data = useAllUserData(usersList);
    const [busy, setBusy] = useState(null);
    const todo = [];
    usersList.forEach(u => {
        const d = data[u.id]; if (!d || d.error) return;
        (d.list || []).forEach(i => { if (typeof i.foto === 'string' && i.foto.startsWith('data:')) todo.push(['items', i.id, i.foto]); });
        (d.lades || []).forEach(l => { if (typeof l.foto === 'string' && l.foto.startsWith('data:')) todo.push(['lades', l.id, l.foto]); });
    });
    const done = usersList.every(u => data[u.id]);
    const run = async () => {
        let ok = 0, fail = 0;
        for (const [c, id, foto] of todo) {
            setBusy(`${ok + fail + 1}/${todo.length}`);
            try { const url = await uploadPhoto(server, foto); await db.collection(c).doc(id).update({ foto: url }); ok++; } catch (e) { fail++; }
        }
        refreshAllUserData();
        setBusy(null);
        actions.notify(fail ? `${ok} verhuisd, ${fail} mislukt` : `${plural(ok, 'foto', "foto's")} verhuisd`, fail ? 'error' : 'success');
    };
    return (
        <section>
            <SectionTitle>Foto's verhuizen</SectionTitle>
            <Card className="p-4">
                <p className="text-sm text-stone-600 dark:text-stone-300">{!done ? 'Foto\'s tellen…' : todo.length ? `${plural(todo.length, 'foto zit', "foto's zitten")} nog in de database. Verhuis ze naar je server, dan laadt de app sneller.` : 'Alle foto\'s staan op je server.'}</p>
                {todo.length > 0 && <Button className="mt-3" icon="Upload" disabled={!!busy || !done} onClick={run}>{busy ? 'Bezig ' + busy : 'Verhuizen'}</Button>}
            </Card>
        </section>
    );
}

// Foto's op de server die nergens meer gebruikt worden (verwijderd product, andere foto gekozen…) opruimen
function PhotoCleanup({ server }) {
    const { actions } = useStore();
    const { confirm } = useUi();
    const [info, setInfo] = useState(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const check = async () => { setErr(''); try { setInfo(await cleanupPhotos(server, false)); } catch (e) { setErr(e.message); } };
    useEffect(() => { check(); }, [server]);
    const run = async () => {
        if (!(await confirm({ title: `${plural(info.ongebruikt, 'foto', "foto's")} verwijderen?`, message: 'Ze worden nergens meer gebruikt in de app. Dit kan niet ongedaan gemaakt worden.', confirmLabel: 'Verwijderen', danger: true }))) return;
        setBusy(true);
        try { const r = await cleanupPhotos(server, true); actions.notify(`${plural(r.ongebruikt, 'foto', "foto's")} verwijderd (${r.ongebruiktMb} MB)`); await check(); }
        catch (e) { actions.notify(e.message, 'error'); }
        setBusy(false);
    };
    return (
        <section>
            <SectionTitle>Foto's op je server</SectionTitle>
            <Card className="p-4">
                <p className="text-sm text-stone-600 dark:text-stone-300">
                    {err ? err : !info ? 'Foto\'s tellen…'
                        : `${plural(info.totaal, 'foto', "foto's")} (${info.totaalMb} MB). ` + (info.ongebruikt ? `${plural(info.ongebruikt, 'foto wordt', "foto's worden")} niet meer gebruikt (${info.ongebruiktMb} MB).` : 'Alles wordt nog gebruikt.')}
                </p>
                <p className="text-xs text-stone-500 mt-1">Verwijder je een foto in de app, dan verdwijnt hij na een halve minuut ook van je server. Hier ruim je wat achterbleef op.</p>
                {info && info.ongebruikt > 0 && <Button className="mt-3" variant="danger" icon="Trash" disabled={busy} onClick={run}>{busy ? 'Bezig…' : 'Ongebruikte foto\'s verwijderen'}</Button>}
                {err && <Button className="mt-3" variant="secondary" size="sm" onClick={check}>Opnieuw</Button>}
            </Card>
        </section>
    );
}
