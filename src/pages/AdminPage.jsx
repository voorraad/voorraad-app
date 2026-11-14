import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { db } from '../lib/firebase.js';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Card, Button, Toggle, IconButton, SectionTitle, Segmented, Select } from '../components/ui.jsx';
import Stock from './Stock.jsx';
import { UserList, Dashboard, TourEditor } from './meer/Admin.jsx';
import { Logboek } from './meer/Inzicht.jsx';
import { APP_VERSION, TYPES } from '../lib/constants.js';
import { cx, formatDateTime, toDate, itemStatus, isMenuEntry, smartMatch } from '../lib/utils.js';

// Aparte beheerpagina voor admins (#/admin). Admins komen hier na het inloggen terecht.
const TABS = [
    { id: 'overzicht', label: 'Overzicht', icon: 'Dashboard' },
    { id: 'gebruikers', label: 'Gebruikers', icon: 'Users' },
    { id: 'dashboard', label: 'Voorraad', icon: 'Box' },
    { id: 'logboek', label: 'Logboek', icon: 'Log' },
    { id: 'app', label: 'App-instellingen', icon: 'Settings' }
];

export default function AdminPage() {
    const { user, me, actions } = useStore();
    const { route, go } = useUi();
    const tab = TABS.some(t => t.id === route.sub) ? route.sub : 'overzicht';

    return (
        <div className="min-h-dvh">
            <header className="sticky top-0 z-30 bg-stone-900 text-white print:hidden pt-[env(safe-area-inset-top)]">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center"><Icon name="Lock" size={16} /></span>
                    <span className="font-extrabold text-lg">Beheer</span>
                    <span className="hidden sm:inline text-xs text-stone-400">Voorraad v{APP_VERSION}</span>
                    <div className="flex-1" />
                    <Button size="sm" variant="secondary" icon="Box" onClick={() => go('voorraad')}><span className="hidden sm:inline">Naar de app</span><span className="sm:hidden">App</span></Button>
                    <IconButton icon={me.darkMode ? 'Sun' : 'Moon'} label="Thema wisselen" onClick={actions.toggleDark} className="text-stone-300 hover:bg-stone-800 hover:text-white" />
                    <IconButton icon="LogOut" label="Uitloggen" onClick={actions.logout} className="text-stone-300 hover:bg-stone-800 hover:text-white" />
                </div>
                <nav className="max-w-7xl mx-auto px-2 flex flex-wrap gap-1 pb-2">
                    {TABS.map(t => (
                        <a key={t.id} href={'#/admin/' + t.id}
                            className={cx('h-9 px-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors', tab === t.id ? 'bg-white text-stone-900' : 'text-stone-300 hover:bg-stone-800 hover:text-white')}>
                            <Icon name={t.icon} size={16} />{t.label}
                        </a>
                    ))}
                </nav>
            </header>
            <main className="max-w-7xl mx-auto px-4 py-5 pb-16">
                {tab === 'overzicht' && <AdminOverview />}
                {tab === 'gebruikers' && <UserList dashPath="admin/dashboard" />}
                {tab === 'dashboard' && <AdminStock />}
                {tab === 'logboek' && <Logboek defaultAll />}
                {tab === 'app' && <AppSettings />}
                <p className="text-xs text-stone-400 mt-10">Ingelogd als {user.email}</p>
            </main>
        </div>
    );
}

// Cijfers per gebruiker worden opgehaald met dezelfde queries als het dashboard (per gebruiker),
// zodat de bestaande Firestore-regels volstaan.
function useUserStats(usersList) {
    const [stats, setStats] = useState({});
    const ids = usersList.map(u => u.id).join(',');
    useEffect(() => {
        let live = true;
        (async () => {
            for (const u of usersList) {
                try {
                    const [v, i] = await Promise.all([
                        db.collection('vriezers').where('userId', '==', u.id).get(),
                        db.collection('items').where('userId', '==', u.id).get()
                    ]);
                    const types = Object.fromEntries(v.docs.map(d => [d.id, d.data().type || 'vriezer']));
                    const items = i.docs.map(d => d.data()).filter(x => !isMenuEntry(x));
                    const expired = items.filter(x => ['expired', 'veryold'].includes(itemStatus(x, types[x.vriezerId] || 'vriezer').level)).length;
                    if (live) setStats(s => ({ ...s, [u.id]: { items: items.length, locs: v.size, expired } }));
                } catch (e) {
                    if (live) setStats(s => ({ ...s, [u.id]: { error: true } }));
                }
            }
        })();
        return () => { live = false; };
    }, [ids]);
    return stats;
}

function AdminOverview() {
    const { usersList, globalSettings, ownerId, actions } = useStore();
    const { go } = useUi();
    const stats = useUserStats(usersList);
    const [logs, setLogs] = useState([]);
    const [q, setQ] = useState('');
    const [sort, setSort] = useState('gezien');
    useEffect(() => db.collection('logs').orderBy('timestamp', 'desc').limit(8)
        .onSnapshot(s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => { }), []);

    const weekAgo = Date.now() - 7 * 864e5;
    const active7 = usersList.filter(u => (toDate(u.laatstGezien) || 0) >= weekAgo).length;
    const blocked = usersList.filter(u => u.disabled).length;
    const loaded = Object.values(stats).filter(s => !s.error);
    const totalItems = loaded.reduce((a, s) => a + s.items, 0);
    const totalExpired = loaded.reduce((a, s) => a + s.expired, 0);
    const done = Object.keys(stats).length >= usersList.length;
    const emailOf = (id) => ((usersList.find(u => u.id === id) || {}).email || '?');

    const rows = useMemo(() => usersList.filter(u => smartMatch(u.email || u.displayName || '', q)).sort((a, b) => {
        if (sort === 'producten') return ((stats[b.id] || {}).items || 0) - ((stats[a.id] || {}).items || 0);
        if (sort === 'verlopen') return ((stats[b.id] || {}).expired || 0) - ((stats[a.id] || {}).expired || 0);
        return (toDate(b.laatstGezien) || 0) - (toDate(a.laatstGezien) || 0);
    }), [usersList, stats, q, sort]);

    return (
        <div className="space-y-6">
            {globalSettings.maintenance && (
                <Card className="p-4 flex items-center gap-3 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                    <Icon name="Wrench" size={20} className="text-amber-600" />
                    <p className="flex-1 text-sm font-medium">De onderhoudsmodus staat <b>aan</b>: gewone gebruikers kunnen de app niet gebruiken.</p>
                    <Button size="sm" onClick={() => actions.setGlobal('maintenance', { active: false })}>Uitzetten</Button>
                </Card>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                <Kpi label="Gebruikers" value={usersList.length} icon="Users" onClick={() => go('admin/gebruikers')} />
                <Kpi label="Actief (7 dagen)" value={active7} icon="Clock" />
                <Kpi label="Geblokkeerd" value={blocked} icon="Lock" tone={blocked ? 'text-red-600' : undefined} />
                <Kpi label="Producten (alle)" value={done ? totalItems : '…'} icon="Box" />
                <Kpi label="Verlopen (alle)" value={done ? totalExpired : '…'} icon="Alert" tone={totalExpired ? 'text-red-600' : undefined} />
            </div>

            <div className="grid gap-6 xl:grid-cols-3 items-start grid-cols-1">
                <section className="xl:col-span-2 min-w-0">
                    <SectionTitle>Alle gebruikers</SectionTitle>
                    <div className="flex flex-wrap gap-2 mb-3">
                        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Zoek gebruiker…"
                            className="flex-1 min-w-[12rem] h-10 px-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 outline-none focus:border-teal-500 text-sm" />
                        {[['gezien', 'Laatst gezien'], ['producten', 'Meeste producten'], ['verlopen', 'Meeste verlopen']].map(([id, lbl]) => (
                            <button key={id} type="button" onClick={() => setSort(id)} className={cx('h-10 px-3 rounded-xl text-sm font-semibold', sort === id ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800')}>{lbl}</button>
                        ))}
                    </div>
                    <Card className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-stone-500 border-b border-stone-100 dark:border-stone-800">
                                <tr><th className="px-4 py-2.5 font-semibold">Gebruiker</th><th className="px-2 py-2.5 font-semibold hidden sm:table-cell">Laatst gezien</th><th className="px-2 py-2.5 font-semibold text-right">Producten</th><th className="px-2 py-2.5 font-semibold text-right">Verlopen</th><th className="px-4 py-2.5" /></tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                                {rows.map(u => {
                                    const s = stats[u.id];
                                    return (
                                        <tr key={u.id} className={cx(u.id === ownerId && 'bg-teal-50/50 dark:bg-teal-950/20')}>
                                            <td className="px-4 py-2.5">
                                                <span className="flex items-center gap-2 min-w-0">
                                                    <span className={cx('w-2 h-2 rounded-full flex-shrink-0', u.disabled ? 'bg-red-500' : 'bg-emerald-500')} />
                                                    <span className="truncate max-w-[9rem] sm:max-w-[16rem] font-medium">{u.email || u.displayName || u.id}</span>
                                                </span>
                                            </td>
                                            <td className="px-2 py-2.5 text-stone-500 whitespace-nowrap hidden sm:table-cell">{u.laatstGezien ? formatDateTime(u.laatstGezien) : 'nooit'}</td>
                                            <td className="px-2 py-2.5 text-right tabular-nums">{s ? (s.error ? '–' : s.items) : '…'}</td>
                                            <td className={cx('px-2 py-2.5 text-right tabular-nums', s && s.expired ? 'text-red-600 font-semibold' : '')}>{s ? (s.error ? '–' : s.expired) : '…'}</td>
                                            <td className="px-4 py-1.5">
                                                <span className="flex justify-end gap-1">
                                                    <Button size="sm" variant="ghost" icon="Box" aria-label="Bekijk" onClick={() => go('admin/dashboard/' + u.id)}><span className="hidden sm:inline">Bekijk</span></Button>
                                                    <Button size="sm" variant="soft" icon="Swap" aria-label="Open" onClick={() => { actions.switchAccount(u.id); go('voorraad'); }}><span className="hidden sm:inline">Open</span></Button>
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Card>
                    <p className="text-xs text-stone-400 mt-2">"Bekijk" toont de voorraad hier op de beheerpagina. "Open" opent de app zelf met de voorraad van die gebruiker.</p>
                </section>

                <section>
                    <SectionTitle action={<a href="#/admin/logboek" className="text-sm font-semibold text-teal-700 dark:text-teal-300">Alles</a>}>Recente activiteit</SectionTitle>
                    <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                        {logs.length === 0 && <p className="p-4 text-sm text-stone-500">Nog geen activiteit.</p>}
                        {logs.map(l => (
                            <div key={l.id} className="px-4 py-2.5">
                                <div className="flex justify-between gap-2"><p className="font-medium text-sm truncate">{l.item || l.action}</p><p className="text-xs text-stone-400 flex-shrink-0">{formatDateTime(l.timestamp)}</p></div>
                                <p className="text-xs text-stone-500 truncate">{l.action} door {l.actorName} · {emailOf(l.targetUserId).split('@')[0]}</p>
                            </div>
                        ))}
                    </Card>
                </section>
            </div>
        </div>
    );
}

function Kpi({ label, value, icon, tone, onClick }) {
    const C = onClick ? 'button' : 'div';
    return (
        <C type={onClick ? 'button' : undefined} onClick={onClick} className="text-left p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800">
            <Icon name={icon} size={18} className="text-stone-400" />
            <p className={cx('text-2xl font-bold mt-2 tabular-nums', tone || 'text-stone-900 dark:text-white')}>{value}</p>
            <p className="text-sm text-stone-500">{label}</p>
        </C>
    );
}

function AppSettings() {
    const { globalSettings, actions } = useStore();
    const { confirm } = useUi();
    return (
        <div className="grid gap-6 xl:grid-cols-3 items-start">
            <section>
                <SectionTitle>Toegang</SectionTitle>
                <Card className="px-4 py-2">
                    <Toggle checked={globalSettings.maintenance} onChange={c => actions.setGlobal('maintenance', { active: c })} label="Onderhoudsmodus" description="Gewone gebruikers zien een onderhoudsscherm. Admins kunnen de app blijven gebruiken." />
                </Card>
                <SectionTitle className="mt-6">Rondleiding</SectionTitle>
                <Card className="px-4 py-2">
                    <Toggle checked={globalSettings.onboardingActive} onChange={c => actions.setGlobal('onboarding', { isActive: c })} label="Tonen aan nieuwe gebruikers" />
                </Card>
                <Button variant="secondary" block className="mt-3" icon="Undo" onClick={async () => { if (await confirm({ title: 'Rondleiding resetten voor iedereen?', message: 'Alle gebruikers zien de rondleiding opnieuw bij de volgende keer openen.', confirmLabel: 'Resetten', danger: true })) actions.resetTourForEveryone(); }}>Rondleiding resetten voor iedereen</Button>
            </section>
            <section className="xl:col-span-2">
                <SectionTitle>Stappen van de rondleiding</SectionTitle>
                <TourEditor />
            </section>
        </div>
    );
}

// Hetzelfde voorraadoverzicht als in de app, voor eender welke gebruiker.
function AdminStock() {
    const { usersList, ownerId, user, actions, vriezers, items, typeOf, owner } = useStore();
    const { route, go, openForm } = useUi();
    const [type, setType] = useState('vriezer');
    const uid = route.extra;
    useEffect(() => { if (uid && uid !== ownerId) actions.switchAccount(uid, true); }, [uid]);
    const current = usersList.find(u => u.id === ownerId);
    const counts = Object.fromEntries(TYPES.map(t => [t.id, items.filter(i => typeOf(i) === t.id).length]));
    return (
        <div className="space-y-4">
            <Card className="p-3 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-stone-500 flex items-center gap-1.5"><Icon name="Users" size={16} />Voorraad van</span>
                <div className="flex-1 min-w-[14rem]">
                    <Select value={ownerId || ''} onChange={e => go('admin/dashboard/' + e.target.value)}>
                        {usersList.map(u => <option key={u.id} value={u.id}>{(u.email || u.displayName || u.id) + (u.id === user.uid ? ' (jij)' : '')}</option>)}
                    </Select>
                </div>
                {ownerId !== user.uid && <Button size="sm" variant="secondary" icon="Home" onClick={() => go('admin/dashboard/' + user.uid)}>Mijn voorraad</Button>}
                <Button size="sm" icon="Plus" onClick={() => openForm({ type, nonce: Date.now() })}>Product</Button>
            </Card>
            {ownerId !== user.uid && (
                <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-1.5 px-1"><Icon name="Info" size={15} />
                    Je bekijkt de voorraad van {(current && current.email) || 'deze gebruiker'}. Wat je hier aanpast, wordt in hun voorraad opgeslagen.</p>
            )}
            <Segmented value={type} onChange={setType} className="max-w-xl" options={TYPES.map(t => ({ id: t.id, label: t.label, icon: t.icon, count: counts[t.id] }))} />
            <Stock type={type} embedded />
        </div>
    );
}
